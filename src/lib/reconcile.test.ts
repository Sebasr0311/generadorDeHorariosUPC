import { describe, expect, it } from 'vitest';
import {reconcileCatalog} from './reconcile';
import type {Catalog,Group,Session} from './types';
const m=(day:number,start:number,end:number):Session=>({day:day as Session['day'],start,end,room:'101'});
const previousGroup:Group={id:'MT104::01-CAMPUS',label:'01-CAMPUS',teacher:'Profesora anterior',teacherId:'doc-xyz',teacherSource:'confirmed',sessions:[m(0,480,600),m(2,600,720)]};
const cat=(groups:Group[]):Catalog=>({id:'x',label:'x',term:'2027-1',institution:'UPC',program:'Sistemas',teacherMode:'unassigned',source:'test',subjects:[{code:'MT104',name:'Cálculo diferencial',groups}]});
const pending=(id:string,label:string,sessions:Session[]):Group=>({id,label,teacher:null,teacherId:null,teacherSource:'unassigned',sessions});
describe('comparador de semestres',()=>{
 it('solo estima docente con mismo grupo y encuentros idénticos',()=>{
  const next=cat([pending('MT104::01-CAMPUS','01-CAMPUS',[m(2,600,720),m(0,480,600)])]);
  const result=reconcileCatalog(next,cat([previousGroup]));
  expect(result.catalog.subjects[0].groups[0]).toMatchObject({teacherSource:'estimated',teacher:'Profesora anterior',inferredFrom:'2027-1'});
 });
 it('nunca hereda profesor si cambia la franja',()=>{
  const next=cat([pending('MT104::01-CAMPUS','01-CAMPUS',[m(0,540,660),m(2,600,720)])]);
  const result=reconcileCatalog(next,cat([previousGroup]));
  expect(result.catalog.subjects[0].groups[0].teacher).toBeNull();
  expect(result.changes.some(c=>c.type==='rescheduled')).toBe(true);
 });
 it('no adivina profesor de un grupo nuevo, aunque sea la misma materia',()=>{
  const next=cat([pending('MT104::01-CAMPUS','01-CAMPUS',[m(0,480,600),m(2,600,720)]),pending('MT104::06-CAMPUS','06-CAMPUS',[m(1,480,600)])]);
  const result=reconcileCatalog(next,cat([previousGroup]));
  expect(result.catalog.subjects[0].groups[1].teacherSource).toBe('unassigned');
  expect(result.changes.some(c=>c.type==='new')).toBe(true);
 });
 it('estima docente cuando otro grupo de la misma materia conserva exactamente días y horas',()=>{
  const renamed=cat([pending('MT104::07-CAMPUS','07-CAMPUS',[m(0,480,600),m(2,600,720)])]);
  const result=reconcileCatalog(renamed,cat([previousGroup]));
  const group=result.catalog.subjects[0].groups[0];
  expect(group).toMatchObject({teacherSource:'estimated',teacher:'Profesora anterior',inferredFrom:'2027-1'});
  expect(result.changes.find(c=>c.label==='07-CAMPUS')?.detail).toMatch(/mismo horario.*01-CAMPUS/i);
 });
 it('no reutiliza el mismo docente previo para dos grupos nuevos',()=>{
  const twins=cat([pending('MT104::07-CAMPUS','07-CAMPUS',[m(0,480,600),m(2,600,720)]),pending('MT104::08-CAMPUS','08-CAMPUS',[m(0,480,600),m(2,600,720)])]);
  const result=reconcileCatalog(twins,cat([previousGroup]));
  const estimated=result.catalog.subjects[0].groups.filter(g=>g.teacherSource==='estimated');
  expect(estimated).toHaveLength(1);
 });
 it('marca el docente como por confirmar cuando el horario cambió',()=>{
  const next=cat([pending('MT104::01-CAMPUS','01-CAMPUS',[m(1,480,600)])]);
  const result=reconcileCatalog(next,cat([previousGroup]));
  expect(result.catalog.subjects[0].groups[0]).toMatchObject({teacher:null,teacherSource:'unassigned',previousTeacher:'Profesora anterior'});
 });
 it('prioriza asignación publicada sobre la estimación',()=>{
  const verified:Group={...previousGroup,teacher:'Profesor nuevo',teacherId:'doc-new',teacherSource:'confirmed'};
  const result=reconcileCatalog(cat([verified]),cat([previousGroup]));
  expect(result.catalog.subjects[0].groups[0].teacher).toBe('Profesor nuevo');
  expect(result.changes.some(c=>c.type==='teacher')).toBe(true);
 });
});
