import { Catalog,Group,GroupChange,normalizeGroup,signature } from './types';
const byKey=(code:string,group:Group)=>`${code}::${normalizeGroup(group.label)}`;
const hasConfirmedTeacher=(g:Group)=>g.teacherSource==='confirmed'&&Boolean(g.teacher)&&Boolean(g.teacherId);
export function reconcileCatalog(incoming:Catalog,previous:Catalog):{catalog:Catalog;changes:GroupChange[]}{
  const previousGroups=new Map<string,{group:Group;name:string}>();
  for(const s of previous.subjects)for(const g of s.groups)previousGroups.set(byKey(s.code,g),{group:g,name:s.name});
  // A previous teacher can back at most one estimate. Same-label, same-schedule matches claim first.
  const claimed=new Set<string>();
  for(const subject of incoming.subjects)for(const group of subject.groups){
    const key=byKey(subject.code,group);const old=previousGroups.get(key);
    if(old&&signature(old.group)===signature(group))claimed.add(key);
  }
  const findSameSchedule=(code:string,group:Group)=>{
    const sig=signature(group);if(!sig)return null;
    for(const [key,entry] of previousGroups){
      if(claimed.has(key)||!key.startsWith(code+'::')||!hasConfirmedTeacher(entry.group))continue;
      if(signature(entry.group)===sig){claimed.add(key);return entry.group;}
    }
    return null;
  };
  const estimate=(group:Group,from:Group):Group=>({...group,teacher:from.teacher,teacherId:from.teacherId,teacherSource:'estimated',inferredFrom:previous.term});
  const changes:GroupChange[]=[];
  const seen=new Set<string>();
  const subjects=incoming.subjects.map(subject=>({
    ...subject,
    groups:subject.groups.map(group=>{
      const key=byKey(subject.code,group);
      seen.add(key);
      const old=previousGroups.get(key);
      const unpublished=group.teacherSource!=='confirmed'&&!group.teacherId;
      if(!old){
        const twin=unpublished?findSameSchedule(subject.code,group):null;
        if(twin){
          changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'new',detail:`Grupo nuevo con el mismo horario que ${twin.label} en ${previous.term}; profesor probable, no oficial`});
          return estimate(group,twin);
        }
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'new',detail:'Grupo nuevo; profesor por confirmar'});
        return group;
      }
      const sameSchedule=signature(group)===signature(old.group);
      const oldRoom=old.group.sessions.map(s=>`${s.day}:${s.start}:${s.room}`).sort().join('|');
      const newRoom=group.sessions.map(s=>`${s.day}:${s.start}:${s.room}`).sort().join('|');
      let next={...group};
      if(!sameSchedule){
        // Never inherit the teacher of this label once its timetable changed; only an exact twin may back an estimate.
        if(!next.teacherId&&old.group.teacher)next.previousTeacher=old.group.teacher;
        const twin=unpublished?findSameSchedule(subject.code,group):null;
        if(twin){
          next=estimate(next,twin);
          changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'rescheduled',detail:`Cambió su horario, pero coincide con el mismo horario que ${twin.label} en ${previous.term}; profesor probable, no oficial`});
        }else{
          changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'rescheduled',detail:'Cambió el día, número de sesiones o franja horaria; profesor por confirmar'});
        }
      }else if(unpublished&&hasConfirmedTeacher(old.group)){
        next=estimate(next,old.group);
      }
      if(sameSchedule && old.group.teacherSource==='confirmed' && next.teacherSource==='confirmed' && old.group.teacherId!==next.teacherId){
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'teacher',detail:'Cambio de docente publicado en el nuevo PDF'});
      }else if(sameSchedule && oldRoom!==newRoom){
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'room',detail:'Cambió el salón; el horario se mantiene'});
      }else if(sameSchedule){
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'unchanged',detail:next.teacherSource==='estimated'?'Horario idéntico; profesor probable del semestre anterior, no oficial':'Horario sin cambios'});
      }
      return next;
    })
  }));
  for(const [key,{group,name}] of previousGroups)if(!seen.has(key)){
    const code=key.split('::')[0];
    changes.push({code,subjectName:name,label:group.label,type:'removed',detail:'Este grupo desapareció del catálogo nuevo'});
  }
  return {catalog:{...incoming,subjects},changes};
}
export function planAffectations(plan:{items:{code:string;groupId:string}[]},incoming:Catalog,prev:Catalog){
  const changes=reconcileCatalog(incoming,prev).changes;
  const planGroups=new Set(plan.items.map(it=>it.code+'::'+normalizeGroup(it.groupId.split('::').slice(1).join('::'))));
  return changes.filter(change=>planGroups.has(change.code+'::'+normalizeGroup(change.label))&&change.type!=='unchanged');
}
