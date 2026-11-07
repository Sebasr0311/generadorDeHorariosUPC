import { describe, expect, it } from 'vitest';
import { conflicting, generateSchedules, overlap } from './generator';
import type { Catalog, Group, Session } from './types';
import {DEFAULT_PREFERENCES} from './types';
const s=(day:number,start:number,end:number):Session=>({day:day as Session['day'],start,end,room:'101'});
const g=(label:string,sessions:Session[]):Group=>({id:`A::${label}`,label,teacher:null,teacherId:null,teacherSource:'unassigned',sessions});
const catalog:Catalog={id:'t',label:'Test',term:'2027-1',institution:'UPC',program:'Ingeniería de Sistemas',teacherMode:'unassigned',source:'test',subjects:[
  {code:'A',name:'A',groups:[g('01-CAMPUS',[s(0,480,600),s(2,480,600)]),g('02-CAMPUS',[s(1,480,600)])]},
  {code:'B',name:'B',groups:[g('01-CAMPUS',[s(0,540,660)]),g('02-CAMPUS',[s(3,480,600)])]},
]};
describe('generador sin cruces',()=>{
 it('detecta intersección en el mismo día',()=>{
  expect(overlap(s(0,480,600),s(0,540,660))).toBe(true);
  expect(overlap(s(0,480,600),s(0,600,720))).toBe(false);
  expect(overlap(s(0,480,600),s(1,540,660))).toBe(false);
 });
 it('elige un grupo entero por asignatura, sin cruces',()=>{
  const found=generateSchedules(catalog,[{code:'A'},{code:'B'}],DEFAULT_PREFERENCES);
  expect(found.infeasible).toBe(false);
  expect(found.schedules).toHaveLength(3);
  for(const plan of found.schedules){
    expect(plan.groups).toHaveLength(2);
    expect(conflicting(plan.groups[0].group,[plan.groups[1].group])).toBe(false);
  }
 });
 it('respeta el grupo elegido y los días bloqueados',()=>{
  const found=generateSchedules(catalog,[{code:'A',pinnedGroup:'A::01-CAMPUS'},{code:'B'}],{...DEFAULT_PREFERENCES,freeDays:[0,3]});
  expect(found.schedules).toHaveLength(0);
  expect(found.infeasible).toBe(true);
  expect(found.problemSubjects).toContain('A');
 });
});

describe('integridad del origen',()=>{
  it('descarta grupos que contienen franjas solapadas entre sí',()=>{
    const damaged:Catalog={...catalog,subjects:[{code:'A',name:'A',groups:[g('BAD-CAMPUS',[s(0,480,600),s(0,540,660)])]}]};
    const result=generateSchedules(damaged,[{code:'A'}],DEFAULT_PREFERENCES);
    expect(result.infeasible).toBe(true);
    expect(result.problemSubjects).toEqual(['A']);
  });
});
