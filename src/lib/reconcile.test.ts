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
 it('prioriza asignación publicada sobre la estimación',()=>{
  const verified:Group={...previousGroup,teacher:'Profesor nuevo',teacherId:'doc-new',teacherSource:'confirmed'};
  const result=reconcileCatalog(cat([verified]),cat([previousGroup]));
  expect(result.catalog.subjects[0].groups[0].teacher).toBe('Profesor nuevo');
  expect(result.changes.some(c=>c.type==='teacher')).toBe(true);
 });
});
