import { openDB } from 'idb';
import type { Catalog,SavedPlan } from './types';
const db=()=>openDB('traza-horarios',1,{upgrade(database){
  if(!database.objectStoreNames.contains('catalogs'))database.createObjectStore('catalogs',{keyPath:'id'});
  if(!database.objectStoreNames.contains('plans'))database.createObjectStore('plans',{keyPath:'id'});
}});
export async function loadCatalogs():Promise<Catalog[]>{const d=await db();return (await d.getAll('catalogs') as Catalog[]).sort((a,b)=>(b.importedAt||0)-(a.importedAt||0));}
export async function saveCatalog(catalog:Catalog){const d=await db();await d.put('catalogs',catalog);}
export async function loadPlans():Promise<SavedPlan[]>{const d=await db();return (await d.getAll('plans') as SavedPlan[]).sort((a,b)=>b.createdAt-a.createdAt);}
export async function savePlan(plan:SavedPlan){const d=await db();await d.put('plans',plan);}
export async function deletePlan(id:string){const d=await db();await d.delete('plans',id);}
