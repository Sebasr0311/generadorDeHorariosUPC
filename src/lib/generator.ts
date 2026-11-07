import { Catalog, Choice, DAY_NAMES, Group, Preferences, SHORT_DAYS, Schedule, Session, Subject, formatHour, normalizeGroup } from './types';

export function overlap(a:Session,b:Session):boolean {
  return a.day===b.day && a.start<b.end && b.start<a.end;
}
export function findSessionOverlap(a:Group,b:Group):{day:Session['day'];start:number;end:number}|null {
  for(const sa of a.sessions){
    for(const sb of b.sessions){
      if(overlap(sa,sb)){
        return {day:sa.day,start:Math.max(sa.start,sb.start),end:Math.min(sa.end,sb.end)};
      }
    }
  }
  return null;
}
export function conflicting(group:Group,existing:Group[]):boolean {
  return group.sessions.some(session=>existing.some(g=>g.sessions.some(other=>overlap(session,other))));
}
export function hasScheduleConflict(schedule:Pick<Schedule,'groups'>):boolean {
  for(let i=0;i<schedule.groups.length;i++){
    const g1=schedule.groups[i].group;
    if(g1.sessions.some((s,idx)=>g1.sessions.slice(idx+1).some(other=>overlap(s,other))))return true;
    for(let j=i+1;j<schedule.groups.length;j++){
      if(conflicting(g1,[schedule.groups[j].group]))return true;
    }
  }
  return false;
}
export function groupOptions(subject:Subject,choice:Choice,prefs:Preferences):Group[]{
  return subject.groups.filter(group=>{
    // A malformed source group must never produce internally conflicting classes.
    if(group.sessions.some((s,i)=>group.sessions.slice(i+1).some(other=>overlap(s,other)))) return false;
    if (!group.sessions.length || group.sessions.some(s=>s.start<prefs.earliest || s.end>prefs.latest || prefs.freeDays.includes(s.day))) return false;
    if (prefs.campusOnly && /VIRTUAL|BANCO|PLATO|COPEY/i.test(group.label)) return false;
    if (!prefs.allowUnknown && !group.teacherId) return false;
    if (choice.pinnedGroup && group.id!==choice.pinnedGroup) return false;
    if (choice.teacherId && choice.teacherMode==='only' && group.teacherId!==choice.teacherId) return false;
    if (choice.teacherId && choice.teacherMode==='exclude' && group.teacherId===choice.teacherId) return false;
    return true;
  });
}
export function scoreSchedule(groups:Schedule['groups'],prefs:Preferences):Omit<Schedule,'groups'|'key'> {
  const sessions=groups.flatMap(item=>item.group.sessions);
  const byDay=new Map<number,Session[]>();
  for(const s of sessions) byDay.set(s.day,[...(byDay.get(s.day)||[]),s]);
  let gaps=0;let first=1440;let last=0;
  for(const daySessions of byDay.values()){
    daySessions.sort((a,b)=>a.start-b.start);
    first=Math.min(first,daySessions[0].start);
    last=Math.max(last,daySessions[daySessions.length-1].end);
    for(let i=1;i<daySessions.length;i++)gaps+=Math.max(0,daySessions[i].start-daySessions[i-1].end);
  }
  const days=byDay.size;
  let score=0;
  switch(prefs.mode){
    case 'morning':score=first + (last/5) + gaps/8;break;
    case 'afternoon':score=-(first) + gaps/8 + days*8;break;
    case 'freeDays':score=days*400+gaps/8;break;
    case 'compact':default:score=gaps+days*35;break;
  }
  return {score,days,gaps,earliest:sessions.length?first:0,latest:last};
}
// Backtracking with early conflict pruning. Returns batches; calling it for a page never
// materializes the full cartesian product. maxVisited limits adversarial inputs.
export function generateSchedules(catalog:Catalog,choices:Choice[],prefs:Preferences,opts:{limit?:number;maxVisited?:number}={}) {
  const limit=opts.limit ?? 1200;
  const maxVisited=opts.maxVisited ?? 300_000;
  const mapped=choices.map(choice=>({subject:catalog.subjects.find(s=>s.code===choice.code),choice})).filter((x):x is {subject:Subject;choice:Choice}=>Boolean(x.subject));
  if(mapped.length===0)return {schedules:[] as Schedule[],visited:0,truncated:false,infeasible:false,problemSubjects:[] as string[]};
  const options=mapped.map(({subject,choice})=>({subject,groups:groupOptions(subject,choice,prefs)})).sort((a,b)=>a.groups.length-b.groups.length);
  const problemSubjects=options.filter(x=>!x.groups.length).map(x=>x.subject.code);
  if(problemSubjects.length)return {schedules:[] as Schedule[],visited:0,truncated:false,infeasible:true,problemSubjects};
  const results:Schedule[]=[];
  const stack:Schedule['groups']=[];
  let visited=0;let truncated=false;
  function explore(index:number){
    if(results.length>=limit || visited>=maxVisited){truncated=true;return;}
    if(index===options.length){
      const stats=scoreSchedule(stack,prefs);
      results.push({groups:[...stack],key:stack.map(x=>`${x.code}:${normalizeGroup(x.group.label)}`).sort().join('|'),...stats});return;
    }
    const {subject,groups}=options[index];
    for(const group of groups){
      visited++;
      if(!conflicting(group,stack.map(x=>x.group))){
        stack.push({code:subject.code,name:subject.name,group});
        explore(index+1);
        stack.pop();
      }
      if(truncated)break;
    }
  }
  explore(0);
  return {schedules:results.filter(s=>!hasScheduleConflict(s)).sort((a,b)=>a.score-b.score||a.key.localeCompare(b.key)),visited,truncated,infeasible:false,problemSubjects};
}

export function groupConflictReason(subjectCode:string,candidateGroup:Group,catalog:Catalog,choices:Choice[],prefs:Preferences):string|null {
  for(const otherChoice of choices){
    if(otherChoice.code===subjectCode)continue;
    const otherSubject=catalog.subjects.find(s=>s.code===otherChoice.code);
    if(!otherSubject)continue;
    if(otherChoice.pinnedGroup){
      const pinned=otherSubject.groups.find(g=>g.id===otherChoice.pinnedGroup);
      if(pinned){
        const clash=findSessionOverlap(candidateGroup,pinned);
        if(clash){
          return `Cruza con ${otherSubject.name} (Grupo ${pinned.label} · ${SHORT_DAYS[clash.day]} ${formatHour(clash.start)}–${formatHour(clash.end)})`;
        }
      }
    }
    const otherValid=groupOptions(otherSubject,otherChoice,prefs);
    if(otherValid.length>0 && otherValid.every(og=>conflicting(candidateGroup,[og]))){
      const clash=findSessionOverlap(candidateGroup,otherValid[0]);
      return clash
        ? `Cruza con ${otherSubject.name} (${SHORT_DAYS[clash.day]} ${formatHour(clash.start)}–${formatHour(clash.end)})`
        : `Cruza con todos los grupos disponibles de ${otherSubject.name}`;
    }
  }
  if(choices.length>1){
    const testChoices=choices.map(c=>c.code===subjectCode?{...c,pinnedGroup:candidateGroup.id}:c);
    const check=generateSchedules(catalog,testChoices,prefs,{limit:1,maxVisited:15_000});
    if(!check.infeasible && check.schedules.length===0){
      return 'Cruza con la combinación actual de materias seleccionadas';
    }
  }
  return null;
}

export function describeConflicts(catalog:Catalog,choices:Choice[],prefs:Preferences):string[] {
  const details:string[]=[];
  const mapped=choices.map(choice=>({subject:catalog.subjects.find(s=>s.code===choice.code),choice})).filter((x):x is {subject:Subject;choice:Choice}=>Boolean(x.subject));
  for(let i=0;i<mapped.length;i++){
    const a=mapped[i];
    const groupsA=groupOptions(a.subject,a.choice,prefs);
    if(!groupsA.length)continue;
    for(let j=i+1;j<mapped.length;j++){
      const b=mapped[j];
      const groupsB=groupOptions(b.subject,b.choice,prefs);
      if(!groupsB.length)continue;
      const hasCompatiblePair=groupsA.some(ga=>groupsB.some(gb=>!conflicting(ga,[gb])));
      if(!hasCompatiblePair){
        const clash=findSessionOverlap(groupsA[0],groupsB[0]);
        const when=clash?` el ${DAY_NAMES[clash.day]} de ${formatHour(clash.start)} a ${formatHour(clash.end)}`:'';
        details.push(`${a.subject.name} (${groupsA.length===1?`Grupo ${groupsA[0].label}`:`${groupsA.length} grupos`}) se cruza con ${b.subject.name} (${groupsB.length===1?`Grupo ${groupsB[0].label}`:`${groupsB.length} grupos`})${when}.`);
      }
    }
  }
  return details;
}
