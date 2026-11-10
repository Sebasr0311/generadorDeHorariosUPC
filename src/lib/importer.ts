import { inferTermFromText } from './term';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {Catalog,Day,Group,Session,Subject} from './types';
import {normalizeGroup} from './types';
GlobalWorkerOptions.workerSrc=workerUrl;
type Line={text:string;x:number;y:number;cx:number};
const DAYS=[68,168,270,378,479,584,688,783];
const TITLE=/([A-Z]{2,5}\d{2,4}[A-Z]?)\s*-\s*(.*?)\s*-\s*Estado\s*:/i;
const TIME=/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
const DATE=/\d{2}-\d{2}-\d{4}/g;
const ID=/^\d{7,10}$/;
// Never persist national identification numbers from the institution's PDF.
// Hash with the same fixed namespace as the offline reference catalog extractor.
async function teacherKey(raw:string):Promise<string>{
  const bytes=new TextEncoder().encode('upc-schedule:'+raw);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return 'doc-'+Array.from(new Uint8Array(digest)).slice(0,6).map(v=>v.toString(16).padStart(2,'0')).join('');
}
const minute=(x:string)=>{const [h,m]=x.split(':').map(Number);return h*60+m;};
const clean=(x:string)=>x.replace(/\s+/g,' ').trim();
function organize(items:{x:number;y:number;str:string}[],width:number):Line[]{
  const scale=842/width;
  const raw=items.map(i=>({x:i.x*scale,y:i.y,str:clean(i.str)})).filter(i=>i.str);
  // Text spans at almost identical baselines form a logical line within each column.
  const colLines:Line[]=[];
  for(let day=0;day<7;day++){
    const inCol=raw.filter(i=>i.x>=DAYS[day]-4 && i.x<DAYS[day+1]-1).sort((a,b)=>a.y-b.y||a.x-b.x);
    let group:typeof inCol=[];
    const flush=()=>{if(!group.length)return;group.sort((a,b)=>a.x-b.x);const text=clean(group.map(x=>x.str).join(' '));const x=Math.min(...group.map(i=>i.x));colLines.push({text,x,y:group[0].y,cx:Math.max(DAYS[day],Math.min(DAYS[day+1]-.01,(x+Math.max(...group.map(i=>i.x))+10)/2))});group=[];};
    for(const item of inCol){if(group.length&&Math.abs(group[0].y-item.y)>2.6)flush();group.push(item);}flush();
  }
  // Headings often span more than one column. Keep them separately from ordinary lines.
  const headings:Line[]=[];
  const rows:typeof raw=[];
  const flushRow=()=>{
    if(!rows.length)return;
    const ordered=rows.sort((a,b)=>a.x-b.x);
    const line=clean(ordered.map(i=>i.str).join(' '));
    if(TITLE.test(line))headings.push({text:line,y:ordered[0].y,x:ordered[0].x,cx:421});
    rows.length=0;
  };
  for(const item of [...raw].sort((a,b)=>a.y-b.y||a.x-b.x)){
    if(rows.length&&Math.abs(rows[0].y-item.y)>2.6)flushRow();rows.push(item);
  }flushRow();
  return [...colLines,...headings].sort((a,b)=>a.y-b.y||a.x-b.x);
}
function groupFromChunk(code:string,chunk:Line[],day:number,teacherNames:Map<string,string>,warnings:string[]):{code:string;label:string;teacher:string|null;teacherId:string|null;session:Session;reviewNote?:string}|null{
  const idx=chunk.findIndex(c=>TIME.test(c.text));
  if(idx<0){warnings.push(`${code}: grupo sin franja horaria en día ${day+1}`);return null;}
  const before=chunk.slice(0,idx).map(c=>clean(c.text));
  // In pre-registration PDFs the university may show NDOC or omit the teacher row.
  // Find the first teacher marker, or locate the beginning of a plausible room.
  const firstTeacher=before.findIndex((str,i)=>i>0&&(ID.test(str)||str==='NDOC'));
  const resemblesRoom=(s:string)=>/^(?:NREF|\d{2,4}\s*[- ]|P\d+-|LAB\b|SALA\b|CANCHA\b|PARQUE\b|PISCINA|PISCINAS|MICROFUTBOL|BALONCESTO|AULA\b)/i.test(s);
  const firstRoom=before.findIndex((str,i)=>i>0&&resemblesRoom(str));
  if(firstTeacher<0&&firstRoom<0){
    warnings.push(`${code}: grupo ambiguo en día ${day+1}: ${before.slice(0,4).join(' · ')}`);
    return null;
  }
  const index=firstTeacher>=0?firstTeacher:firstRoom;
  const label=normalizeGroup(clean([before[0].split(':').slice(1).join(':'),...before.slice(1,index)].join(' ')));
  if(!label){warnings.push(`${code}: etiqueta de grupo vacía`);return null;}
  const teacherTokens:string[]=[];
  let roomIndex=index;
  while(roomIndex<before.length && (ID.test(before[roomIndex])||before[roomIndex]==='NDOC')){
    teacherTokens.push(before[roomIndex]);roomIndex++;
  }
  const rawId=teacherTokens.length===1?teacherTokens[0]:null;
  const teacher=rawId?teacherNames.get(rawId)||null:null;
  const teacherId=teacher&&rawId?rawId:null; // hashed before persistence
  const reviewNote=teacherTokens.length>1?'El PDF enumera varios docentes; revisar asignación del grupo':undefined;
  if(reviewNote)warnings.push(`${code} ${label}: ${reviewNote}`);
  if(rawId&&rawId!=='NDOC'&&!teacher)warnings.push(`${code} ${label}: identificación de docente ausente del directorio, marcada como pendiente`);
  const room=clean(before.slice(roomIndex).join(' '))||'NREF';
  const match=TIME.exec(chunk[idx].text)!;
  const start=minute(match[1]);const end=minute(match[2])+1;
  if(start>=end||end>1440){warnings.push(`${code} ${label}: hora inválida`);return null;}
  const dates=chunk.flatMap(c=>c.text.match(DATE)||[]).filter(Boolean);
  return {code,label,teacher,teacherId,reviewNote,session:{day:day as Day,start,end,room,startDate:dates[0]||null,endDate:dates[1]||null}};
}
function buildCatalog(pages:Line[][],source:string):{catalog:Catalog;warnings:string[]}{
  const warnings:string[]=[];
  const teachers=new Map<string,string>();
  for(let pi=0;pi<Math.min(2,pages.length);pi++){
    const firstHeading=pages[pi].find(l=>TITLE.test(l.text))?.y??1200;
    const dir=pages[pi].filter(l=>l.y<firstHeading && l.y>80);
    const ids=dir.filter(l=>l.x<180&&ID.test(l.text));
    const names=dir.filter(l=>l.x>345&&l.x<620 && /^[A-ZÁÉÍÓÚÑÜ. ]{8,}$/.test(l.text));
    for(const id of ids){const n=names.find(x=>Math.abs(x.y-id.y)<2.6);if(n)teachers.set(id.text,n.text);}
  }
  const titles=new Map<string,string>();
  const buckets=new Map<string,Line[]>();
  let active:string|null=null;
  for(let pi=0;pi<pages.length;pi++){
    const lines=pages[pi].sort((a,b)=>a.y-b.y||a.x-b.x);
    const headingLines=lines.filter(l=>TITLE.test(l.text));
    for(const line of lines){
      const match=TITLE.exec(line.text);
      if(match){active=match[1].toUpperCase();titles.set(active,clean(match[2]));continue;}
      if(!active)continue;
      if(line.text==='PÃ¡g.'||line.text==='Pág.'||/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/.test(line.text))continue;
      const headingAbove=headingLines.some(h=>Math.abs(h.y-line.y)<3);
      if(headingAbove)continue;
      const day=DAYS.findIndex((l,i)=>i<7&&line.cx>=l&&line.cx<DAYS[i+1]);
      if(day<0)continue;
      const key=active+'|'+day;
      const list=buckets.get(key)||[];
      list.push({...line,y:pi*1300+line.y});
      buckets.set(key,list);
    }
  }
  const groups=new Map<string,Group>();
  for(const [key,lines] of buckets){
    const [code,dayStr]=key.split('|');const day=Number(dayStr);
    lines.sort((a,b)=>a.y-b.y||a.x-b.x);
    const positions=lines.map((l,i)=>/\bGrupo\s*:/i.test(l.text)?i:-1).filter(i=>i>=0);
    for(let n=0;n<positions.length;n++){
      const chunk=lines.slice(positions[n],positions[n+1]??lines.length);
      const entry=groupFromChunk(code,chunk,day,teachers,warnings);
      if(!entry)continue;
      const id=code+'::'+entry.label;
      let group=groups.get(id);
      if(!group){group={id,label:entry.label,teacher:entry.teacher,teacherId:entry.teacherId,teacherSource:entry.teacher?'confirmed':'unassigned',sessions:[],reviewNote:entry.reviewNote};groups.set(id,group);}
      if(group.teacherId!==entry.teacherId){
        group.teacher=null;group.teacherId=null;group.teacherSource='unassigned';group.reviewNote='Inconsistencia de docente entre encuentros del mismo grupo';
        warnings.push(`${code} ${entry.label}: docentes inconsistentes; requiere revisión`);
      }
      if(!group.sessions.some(s=>s.day===entry.session.day&&s.start===entry.session.start&&s.end===entry.session.end&&s.room===entry.session.room))group.sessions.push(entry.session);
    }
  }
  const subjects:Subject[]=[...titles].map(([code,name])=>({code,name,groups:[...groups.values()].filter(g=>g.id.startsWith(code+'::')).map(g=>({...g,sessions:g.sessions.sort((a,b)=>a.day-b.day||a.start-b.start)})).sort((a,b)=>a.label.localeCompare(b.label,'es'))})).filter(s=>s.groups.length).sort((a,b)=>a.code.localeCompare(b.code));
  if(subjects.length<2)throw new Error('No se reconoció el formato Academusoft. Comprueba que sea el PDF de horarios por programa.');
  return {catalog:{id:`import-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,label:`Catálogo importado · ${new Date().toLocaleDateString('es-CO')}`,term:'Por definir',period:'',institution:'Universidad Popular del Cesar',program:'Ingeniería de Sistemas',teacherMode:teachers.size?'mixed':'unassigned',source,importedAt:Date.now(),subjects,warnings},warnings};
}
export async function parseAcademusoftPdf(file:File):Promise<{catalog:Catalog;warnings:string[]}>{
  if(file.size>30*1024*1024)throw Error('El PDF supera el límite permitido de 30 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=await getDocument({data:bytes}).promise;
  try{
    if(pdf.numPages>120)throw Error('El PDF tiene demasiadas páginas. Máximo 120.');
    const pages:Line[][]=[];const allText:string[]=[];
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n);const content=await page.getTextContent();
      const height=page.getViewport({scale:1}).height;
      const items=content.items.filter(i=>'str' in i).map(i=>{const t=i as {str:string;transform:number[]};return {str:t.str,x:t.transform[4],y:height-t.transform[5]};});
      for(const it of items)allText.push(it.str);
      pages.push(organize(items,page.view[2]-page.view[0]));
    }
    const parsed=buildCatalog(pages,`PDF · ${file.name}`);
    const detected=inferTermFromText(allText);
    if(detected)Object.assign(parsed.catalog,{term:detected.term,period:detected.period,label:`${detected.term} · Catálogo importado`});
    // Stable opaque IDs allow safe comparisons between semesters.
    const allRawIds=[...new Set(parsed.catalog.subjects.flatMap(s=>s.groups.map(g=>g.teacherId)).filter((id):id is string=>Boolean(id)))];
    const opaque=new Map(await Promise.all(allRawIds.map(async raw=>[raw,await teacherKey(raw)] as const)));
    for(const s of parsed.catalog.subjects)for(const g of s.groups)if(g.teacherId)g.teacherId=opaque.get(g.teacherId)||null;
    return parsed;
  }finally{await pdf.destroy();}
}
export async function parseCatalogFile(file:File){
  if(/\.pdf$/i.test(file.name))return parseAcademusoftPdf(file);
  if(file.size>10*1024*1024)throw Error('El archivo de datos es demasiado grande.');
  let content=await file.text();
  if(/\.html?$/i.test(file.name)){
    const doc=new DOMParser().parseFromString(content,'text/html');
    content=doc.getElementById('traza-catalog-json')?.textContent||'';
    if(!content)throw Error('Para importar HTML, debe contener un catálogo estructurado de Traza. También puedes cargar directamente el PDF oficial de Academusoft.');
  }
  if(!/\.json$|\.html?$/i.test(file.name))throw Error('Formato no admitido. Usa PDF de Academusoft, JSON o HTML de Traza.');
  let data:Catalog;
  try{data=JSON.parse(content);}catch{throw Error('El catálogo JSON o HTML no es válido.');}
  if(!Array.isArray(data.subjects)||data.subjects.length===0||data.subjects.some(s=>!s.code||!Array.isArray(s.groups)||s.groups.some(g=>!Array.isArray(g.sessions)||g.sessions.some(x=>!Number.isFinite(x.start)||!Number.isFinite(x.end)||!Number.isInteger(x.day)||x.day<0||x.day>6||x.start>=x.end||x.end>1440))))throw Error('Estructura del catálogo inválida.');
  const catalog={...data,id:`import-${Date.now()}`,importedAt:Date.now(),source:file.name};
  return {catalog,warnings:data.warnings||[]};
}
