import type {Catalog,Schedule,TeacherSource} from './types';
import {DAY_NAMES,SHORT_DAYS,formatHour} from './types';
export type SubjectDetailRow={code:string;subject:string;group:string;sessions:string;rooms:string;teacher:string|null;teacherSource:TeacherSource};
/** One row per subject+group, with every weekly session combined (a group meeting twice a week must not appear twice). */
export function buildSubjectDetailRows(schedule:Schedule):SubjectDetailRow[]{
  const seen=new Set<string>();const rows:SubjectDetailRow[]=[];
  for(const entry of schedule.groups){
    const key=`${entry.code}::${entry.group.id}`;if(seen.has(key))continue;seen.add(key);
    const ordered=[...entry.group.sessions].sort((a,b)=>a.day-b.day||a.start-b.start);
    const rooms=[...new Set(ordered.map(s=>s.room.trim()).filter(Boolean))];
    rows.push({code:entry.code,subject:entry.name,group:entry.group.label,sessions:ordered.map(s=>`${SHORT_DAYS[s.day]} ${formatHour(s.start)}–${formatHour(s.end)}`).join(', '),rooms:rooms.join(', '),teacher:entry.group.teacher,teacherSource:entry.group.teacherSource});
  }
  return rows;
}
export type GridSlot={index:number;column:number;firstSlot:number;lastSlot:number}|{index:number;column:number;firstSlot:null;lastSlot:null;sharedWith:number};
/**
 * Maps sessions onto whole 30-minute spreadsheet rows. Times off the half-hour boundary are rounded outward,
 * and later sessions are trimmed so two sessions never claim the same cell (merged cells cannot overlap).
 * A session left with no free slot is reported as sharing the cell of the session that owns it.
 */
export function planGridSlots(sessions:{day:number;start:number;end:number}[],from:number):GridSlot[]{
  const owners=new Map<string,number>();const at=(column:number,slot:number)=>owners.get(`${column}:${slot}`);
  return sessions.map((s,index)=>{
    const column=s.day;const rawFirst=Math.floor((s.start-from)/30);let last=Math.max(rawFirst,Math.ceil((s.end-from)/30)-1);
    let first=rawFirst;while(first<=last&&at(column,first)!==undefined)first++;
    for(let slot=first;slot<=last;slot++)if(at(column,slot)!==undefined){last=slot-1;break;}
    if(first>last)return {index,column,firstSlot:null,lastSlot:null,sharedWith:at(column,rawFirst)!};
    for(let slot=first;slot<=last;slot++)owners.set(`${column}:${slot}`,index);
    return {index,column,firstSlot:first,lastSlot:last};
  });
}
function safeName(name:string){return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,70);}
function download(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function exportExcel(schedule:Schedule,catalog:Catalog){
  const ExcelJS=await import('exceljs');
  const wb=new ExcelJS.Workbook();wb.creator='Traza · Planificador académico';wb.created=new Date();
  const ws=wb.addWorksheet('Horario semanal',{views:[{state:'frozen',xSplit:1,ySplit:6}]});
  ws.columns=[{width:14},...DAY_NAMES.map(()=>({width:29}))];
  ws.mergeCells('A1:H2');ws.getCell('A1').value='TRAZA  /  MI HORARIO UNIVERSITARIO';
  ws.getCell('A1').font={name:'Aptos Display',size:21,bold:true,color:{argb:'FFFFFFFF'}};
  ws.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF152541'}};
  ws.getCell('A1').alignment={vertical:'middle',indent:1};
  ws.mergeCells('A3:H3');ws.getCell('A3').value=`Universidad Popular del Cesar  ·  Ingeniería de Sistemas  ·  ${catalog.term}`;ws.getCell('A3').font={size:11,color:{argb:'FF4E627D'},bold:true};
  ws.mergeCells('A4:H4');ws.getCell('A4').value='Planeación personal. Los docentes estimados no constituyen asignación oficial.';ws.getCell('A4').font={size:10,italic:true,color:{argb:'FFB56523'}};
  const header=ws.getRow(6);header.values=['Hora',...DAY_NAMES];header.height=28;
  header.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'},size:11};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2563A6'}};c.alignment={vertical:'middle',horizontal:'center'};});
  const min=Math.min(360,...schedule.groups.flatMap(g=>g.group.sessions.map(s=>s.start)));
  const max=Math.max(1320,...schedule.groups.flatMap(g=>g.group.sessions.map(s=>s.end)));
  const from=Math.floor(min/60)*60;const to=Math.ceil(max/60)*60;
  const palette=['FFE6F0FF','FFEBF9F3','FFF7EAFE','FFFFF2E2','FFE7F9FB','FFFFE9EF','FFF1F0FF'];
  for(let t=from;t<to;t+=30){const i=7+(t-from)/30;const row=ws.getRow(i);row.height=27;row.getCell(1).value=formatHour(t);row.getCell(1).font={size:10,bold:true,color:{argb:'FF42536B'}};row.getCell(1).alignment={vertical:'middle',horizontal:'center'};for(let d=2;d<=8;d++){const cell=row.getCell(d);cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:Math.floor((i-7)/2)%2?'FFF9FBFE':'FFFFFFFF'}};cell.border={bottom:{style:'hair',color:{argb:'FFE3EAF3'}},right:{style:'hair',color:{argb:'FFE3EAF3'}}};}}
  const gridSessions=schedule.groups.flatMap((entry,subjectIndex)=>entry.group.sessions.map(s=>({entry,subjectIndex,s})));
  const slots=planGridSlots(gridSessions.map(x=>x.s),from);const firstRowOf=new Map<number,number>();
  slots.forEach(slot=>{
    const {entry,subjectIndex,s}=gridSessions[slot.index];const column=slot.column+2;
    const status=entry.group.teacherSource==='estimated'?' (estimado)':entry.group.teacherSource==='possible'?' (posible)':entry.group.teacherSource==='confirmed'?'':' (pendiente)';
    const text=`${entry.code} · ${entry.name}\n${entry.group.label} | ${formatHour(s.start)}–${formatHour(s.end)}\n${entry.group.teacher||'Docente por confirmar'}${status}\n${s.room||'Salón por confirmar'}`;
    if(slot.firstSlot===null){const c=ws.getCell(firstRowOf.get(slot.sharedWith)!,column);c.value=`${String(c.value??'')}\n\n${text}`;return;}
    const row=7+slot.firstSlot;const end=7+slot.lastSlot;firstRowOf.set(slot.index,row);
    if(end>row)ws.mergeCells(row,column,end,column);
    const c=ws.getCell(row,column);c.value=text;
    c.alignment={vertical:'middle',wrapText:true,indent:1};c.font={name:'Aptos',size:10,bold:true,color:{argb:'FF17304A'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:palette[subjectIndex%palette.length]}};c.border={top:{style:'thin',color:{argb:'FFDAE2EF'}},bottom:{style:'thin',color:{argb:'FFDAE2EF'}},left:{style:'thin',color:{argb:'FFDAE2EF'}},right:{style:'thin',color:{argb:'FFDAE2EF'}}};
  });
  ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,horizontalCentered:true,margins:{left:0.25,right:0.25,top:0.4,bottom:0.4,header:0.1,footer:0.2}};
  const details=wb.addWorksheet('Detalle de asignaturas');
  details.columns=[{header:'Código',key:'code',width:15},{header:'Asignatura',key:'subject',width:46},{header:'Grupo',key:'group',width:24},{header:'Horario',key:'sessions',width:44},{header:'Salón',key:'room',width:30},{header:'Docente',key:'teacher',width:43},{header:'Estado docente',key:'status',width:23}];
  details.getRow(1).height=28;details.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF152541'}};c.alignment={vertical:'middle'};});
  for(const x of buildSubjectDetailRows(schedule)){details.addRow({code:x.code,subject:x.subject,group:x.group,sessions:x.sessions,room:x.rooms||'Por confirmar',teacher:x.teacher||'Por confirmar',status:statusLabel(x.teacherSource)});}
  for(let r=2;r<=details.rowCount;r++){const row=details.getRow(r);row.height=Math.max(22,15*Math.ceil(String(row.getCell(4).value??'').length/44));row.eachCell(c=>{c.alignment={vertical:'middle',wrapText:true};if(r%2===0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5FA'}};});}
  details.autoFilter={from:'A1',to:'G1'};details.views=[{state:'frozen',ySplit:1}];
  const data=await wb.xlsx.writeBuffer();
  download(new Blob([data as ArrayBuffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`Traza-Horario-${safeName(catalog.term)}.xlsx`);
}
function statusLabel(status:string){return status==='confirmed'?'Confirmado en PDF':status==='estimated'?'Estimado del semestre anterior':status==='possible'?'Posible (referencia histórica)':'Por confirmar';}
export async function exportPdf(schedule:Schedule,catalog:Catalog){
  const {jsPDF}=await import('jspdf');
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const w=297,h=210,margin=13;
  doc.setFillColor(21,37,65);doc.rect(0,0,w,32,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(21);doc.text('TRAZA  /  MI HORARIO',margin,16);
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`UPC  ·  Ingeniería de Sistemas  ·  ${catalog.term}`,margin,24);
  doc.setTextColor(70,86,110);doc.setFontSize(8.5);doc.text('Planificación personal. Profesor probable = estimación, no designación oficial.',margin,39);
  const cols=8;const left=margin;const top=44;const gridW=w-2*margin;const colW=gridW/cols;const gridH=149;
  const sessions=schedule.groups.flatMap((x,i)=>x.group.sessions.map(session=>({session,x,i})));
  const start=Math.min(360,...sessions.map(x=>x.session.start));const end=Math.max(1320,...sessions.map(x=>x.session.end));
  const tStart=Math.floor(start/60)*60;const tEnd=Math.ceil(end/60)*60;const units=tEnd-tStart;
  const headH=9;const bodyH=gridH-headH;
  doc.setFillColor(43,98,167);doc.rect(left,top,gridW,headH,'F');doc.setTextColor(255,255,255);doc.setFontSize(9);doc.setFont('helvetica','bold');
  ['Hora',...DAY_NAMES].forEach((label,i)=>doc.text(label,left+i*colW+3,top+5.8));
  const palette:[[number,number,number],...Array<[number,number,number]>]=[[229,239,253],[230,246,237],[244,232,250],[255,244,225],[226,246,248],[255,234,240],[237,235,252]];
  for(let hour=tStart;hour<=tEnd;hour+=60){const y=top+headH+(hour-tStart)/units*bodyH;doc.setDrawColor(222,231,242);doc.setLineWidth(.25);doc.line(left,y,left+gridW,y);if(hour<tEnd){doc.setFont('helvetica','normal');doc.setTextColor(80,98,119);doc.setFontSize(7.4);doc.text(formatHour(hour),left+3,y+3.8);}}
  for(let i=0;i<=cols;i++){doc.setDrawColor(222,231,242);doc.line(left+i*colW,top+headH,left+i*colW,top+gridH);}
  for(const {session,x,i} of sessions){
    const bx=left+(session.day+1)*colW+0.7;const by=top+headH+(session.start-tStart)/units*bodyH+0.5;const bh=(session.end-session.start)/units*bodyH-1;const bw=colW-1.4;
    const color=palette[i%palette.length];doc.setFillColor(...color);doc.roundedRect(bx,by,bw,bh,1.3,1.3,'F');
    // Stack wrapped lines top-down and stop when the block runs out of room, so long labels never overlap.
    const lines:[string,'bold'|'normal',number][]=[[`${x.code} · ${x.group.label}`,'bold',7.3],[`${formatHour(session.start)}–${formatHour(session.end)} · ${session.room||'Salón por confirmar'}`,'normal',6.6],[(x.group.teacher||'Por confirmar')+(x.group.teacherSource==='estimated'?' *':''),'normal',6.3]];
    doc.setTextColor(28,46,72);let ty=by+3.3;const bottom=by+bh-0.8;
    outer:for(const [text,weight,size] of lines){doc.setFont('helvetica',weight);doc.setFontSize(size);const lh=size*0.42;
      for(const part of doc.splitTextToSize(text,bw-3.6) as string[]){if(ty>bottom)break outer;doc.text(part,bx+1.8,ty);ty+=lh;}
      ty+=0.5;}
  }
  doc.setFontSize(7.5);doc.setTextColor(80,98,119);doc.text('* Docente estimado a partir de un horario anterior, sujeto a cambios.',margin,h-6);
  doc.addPage('a4','landscape');
  doc.setFillColor(21,37,65);doc.rect(0,0,w,28,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('Detalle de asignaturas y grupos',margin,18);
  let y=38;const widths=[18,62,26,62,34,69];const xs=[margin];for(let i=0;i<widths.length-1;i++)xs.push(xs[i]+widths[i]);
  const header=()=>{doc.setFillColor(233,240,250);doc.rect(margin,y,w-2*margin,9,'F');doc.setTextColor(32,60,91);doc.setFont('helvetica','bold');doc.setFontSize(8);['Código','Asignatura','Grupo','Horario','Salón','Docente y estado'].forEach((v,i)=>doc.text(v,xs[i]+2,y+5.7));y+=10;};header();
  const lineH=3.2;
  buildSubjectDetailRows(schedule).forEach((row,index)=>{
    const status=row.teacherSource==='estimated'?' [estimado]':row.teacherSource==='possible'?' [posible]':row.teacherSource==='unassigned'?' [sin asignar]':'';
    const values=[row.code,row.subject,row.group,row.sessions,row.rooms||'Por confirmar',`${row.teacher||'Por confirmar'}${status}`];
    doc.setFont('helvetica','normal');doc.setFontSize(7);
    const cells=values.map((v,i)=>doc.splitTextToSize(v,widths[i]-3) as string[]);
    const rowH=Math.max(8,Math.max(...cells.map(c=>c.length))*lineH+3.4);
    if(y+rowH>h-10){doc.addPage('a4','landscape');y=15;header();}
    if(index%2===0){doc.setFillColor(248,250,253);doc.rect(margin,y,w-2*margin,rowH,'F');}
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(45,62,81);
    cells.forEach((lines,i)=>doc.text(lines,xs[i]+2,y+5,{lineHeightFactor:1.3}));y+=rowH;
  });
  doc.save(`Traza-Horario-${safeName(catalog.term)}.pdf`);
}
export function exportJson(catalog:Catalog){download(new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'}),`Traza-Catalogo-${safeName(catalog.term)}.json`);}
export function exportHtml(catalog:Catalog){
  const clean=JSON.stringify(catalog).replace(/</g,'\\u003c');
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Catálogo ${catalog.term}</title></head><body><h1>Traza · Catálogo ${catalog.term}</h1><p>Archivo estructurado para reimportación. No representa la tabla visual original de Academusoft.</p><script id="traza-catalog-json" type="application/json">${clean}</script></body></html>`;
  download(new Blob([html],{type:'text/html;charset=utf-8'}),`Traza-Catalogo-${safeName(catalog.term)}.html`);
}
