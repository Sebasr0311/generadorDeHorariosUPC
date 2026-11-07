import { Catalog, Choice, Group, Preferences, Schedule, Session, Subject, normalizeGroup } from './types';

export function overlap(a:Session,b:Session):boolean {
  return a.day===b.day && a.start<b.end && b.start<a.end;
}
export function conflicting(group:Group,existing:Group[]):boolean {
  return group.sessions.some(session=>existing.some(g=>g.sessions.some(other=>overlap(session,other))));
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
  return {schedules:results.sort((a,b)=>a.score-b.score||a.key.localeCompare(b.key)),visited,truncated,infeasible:false,problemSubjects};
}
