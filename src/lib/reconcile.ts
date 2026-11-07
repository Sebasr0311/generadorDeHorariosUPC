import { Catalog,Group,GroupChange,normalizeGroup,signature } from './types';
const byKey=(code:string,group:Group)=>`${code}::${normalizeGroup(group.label)}`;
export function reconcileCatalog(incoming:Catalog,previous:Catalog):{catalog:Catalog;changes:GroupChange[]}{
  const previousGroups=new Map<string,{group:Group;name:string}>();
  for(const s of previous.subjects)for(const g of s.groups)previousGroups.set(byKey(s.code,g),{group:g,name:s.name});
  const changes:GroupChange[]=[];
  const seen=new Set<string>();
  const subjects=incoming.subjects.map(subject=>({
    ...subject,
    groups:subject.groups.map(group=>{
      const key=byKey(subject.code,group);
      seen.add(key);
      const old=previousGroups.get(key);
      if(!old){changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'new',detail:'Grupo nuevo; docente no deducible del semestre anterior'});return group;}
      const sameSchedule=signature(group)===signature(old.group);
      const oldRoom=old.group.sessions.map(s=>`${s.day}:${s.start}:${s.room}`).sort().join('|');
      const newRoom=group.sessions.map(s=>`${s.day}:${s.start}:${s.room}`).sort().join('|');
      const wasTeacher=old.group.teacherSource==='confirmed'&&old.group.teacher&&old.group.teacherId;
      const next={...group};
      if(!sameSchedule){
        // Never inherit a previous teacher from a changed timetable.
        if(!next.teacherId && old.group.teacher)next.previousTeacher=old.group.teacher;
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'rescheduled',detail:'Cambió el día, número de sesiones o franja horaria; docente sin inferencia automática'});
      }else if(group.teacherSource!=='confirmed' && !group.teacherId && wasTeacher){
        next.teacher=old.group.teacher;
        next.teacherId=old.group.teacherId;
        next.teacherSource='estimated';
        next.inferredFrom=previous.term;
      }
      if(sameSchedule && old.group.teacherSource==='confirmed' && next.teacherSource==='confirmed' && old.group.teacherId!==next.teacherId){
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'teacher',detail:'Cambio de docente publicado en el nuevo PDF'});
      }else if(sameSchedule && oldRoom!==newRoom){
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'room',detail:'Cambió el salón; el horario se mantiene'});
      }else if(sameSchedule){
        changes.push({code:subject.code,subjectName:subject.name,label:group.label,type:'unchanged',detail:next.teacherSource==='estimated'?'Horario idéntico; profesor estimado, no oficial':'Horario sin cambios'});
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
