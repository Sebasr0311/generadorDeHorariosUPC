import {useRef,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {AlertCircle,AlertTriangle,ArrowRight,CheckCircle2,FileText,FileUp,GitCompareArrows,ShieldCheck,UserCheck,UserX,X} from 'lucide-react';
import type {Catalog,GroupChange} from '../lib/types';
import {parseCatalogFile} from '../lib/importer';
import {reconcileCatalog} from '../lib/reconcile';
import {assessTermSequence} from '../lib/term';
type Review={catalog:Catalog;warnings:string[];changes:GroupChange[]};
export function ImportDialog({active,onImport,triggerClass='btn-outline'}:{active:Catalog;onImport:(catalog:Catalog)=>void;triggerClass?:string}){
  const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [review,setReview]=useState<Review|null>(null);const [term,setTerm]=useState('');const [showWarnings,setShowWarnings]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  async function handleFile(file?:File){if(!file)return;setBusy(true);setError('');setReview(null);
    try{
      const parsed=await parseCatalogFile(file);
      const diff=reconcileCatalog(parsed.catalog,active);
      setReview({catalog:diff.catalog,warnings:parsed.warnings,changes:diff.changes});
      setTerm(parsed.catalog.term==='Por definir'?'':parsed.catalog.term);
    }catch(e){setError(e instanceof Error?e.message:'Error al interpretar el archivo.');}
    finally{setBusy(false);}
  }
  function save(){if(!review)return;const t=term.trim();if(!/^\d{4}[-–][12]$/.test(t)){setError('Escribe un período válido, por ejemplo 2027-1.');return;}
    const normalized=t.replace('–','-');
    onImport({...review.catalog,term:normalized,label:`${normalized} · Catálogo importado`,teacherMode:'mixed',warnings:review.warnings,importedAt:Date.now()});setOpen(false);setReview(null);setError('');}
  // Groups of subjects missing from the file are not "removed": the file may simply be partial.
  const incomingCodes=new Set(review?.catalog.subjects.map(s=>s.code)||[]);
  const missingSubjects=active.subjects.filter(s=>!incomingCodes.has(s.code)).length;
  const counts={new:review?.changes.filter(c=>c.type==='new').length||0,removed:review?.changes.filter(c=>c.type==='removed'&&incomingCodes.has(c.code)).length||0,rescheduled:review?.changes.filter(c=>c.type==='rescheduled').length||0,teacher:review?.changes.filter(c=>c.type==='teacher').length||0};
  const allGroups=review?.catalog.subjects.flatMap(s=>s.groups)||[];
  const teacherCounts={confirmed:allGroups.filter(g=>g.teacherSource==='confirmed').length,estimated:allGroups.filter(g=>g.teacherSource==='estimated').length,unknown:allGroups.filter(g=>g.teacherSource!=='confirmed'&&g.teacherSource!=='estimated').length};
  const sequence=review?assessTermSequence(active.term,term.replace('–','-')):null;
  const risky=Boolean(sequence&&sequence.status!=='next');
  const subjects=review?.catalog.subjects.length||0;const groups=review?.catalog.subjects.reduce((n,s)=>n+s.groups.length,0)||0;
  return <Dialog.Root open={open} onOpenChange={value=>{setOpen(value);if(!value){setError('');setReview(null);}}}>
    <Dialog.Trigger className={triggerClass}><FileUp size={17}/> Importar PDF / datos</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="modal-content" aria-describedby="import-desc">
      <div className="modal-title-row"><div><div className="eyebrow">CATÁLOGO ACADÉMICO</div><Dialog.Title className="modal-title">Actualizar horarios oficiales</Dialog.Title></div><Dialog.Close className="icon-btn" aria-label="Cerrar"><X size={20}/></Dialog.Close></div>
      <Dialog.Description id="import-desc" className="muted">Carga el PDF de Academusoft del nuevo semestre. La importación se revisa antes de reemplazar el catálogo activo.</Dialog.Description>
      <div className="step-mini"><span className="step-current">01 · Cargar</span><span>02 · Verificar</span><span>03 · Publicar localmente</span></div>
      {!review&&<>
        <input ref={fileRef} hidden type="file" accept=".pdf,.json,.html,.htm,application/pdf,application/json,text/html" onChange={e=>{void handleFile(e.target.files?.[0]);e.target.value='';}}/>
        <button className="dropzone" disabled={busy} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void handleFile(e.dataTransfer.files[0]);}}>
          <div className="upload-icon"><FileUp size={28}/></div><strong>{busy?'Procesando el archivo…':'Selecciona o arrastra un archivo'}</strong><span>PDF oficial de Academusoft · JSON / HTML exportados desde Traza</span><small>Los documentos se procesan en tu navegador, sin subirse a ningún servidor.</small>
        </button>
        <div className="info-note"><ShieldCheck size={18}/><p>Si el nuevo documento no asigna docentes, se mostrará una estimación únicamente cuando el código, grupo y todos los encuentros coincidan con un semestre anterior confirmado. Grupos nuevos o reprogramados quedan sin profesor.</p></div>
      </>}
      {review&&<>
        <div className="import-summary"><div><strong>{subjects}</strong><span>Asignaturas</span></div><div><strong>{groups}</strong><span>Grupos</span></div><div><strong>{review.warnings.length}</strong><span>Advertencias</span></div></div>
        <label className="field-label" htmlFor="term">Período que vas a importar</label><input id="term" className="field" placeholder="Ej. 2027-1" value={term} onChange={e=>setTerm(e.target.value)} aria-describedby="term-check"/>
        {sequence&&<div id="term-check" className={risky?'term-check risk':'term-check ok'} role={risky?'alert':'status'}>{risky?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}<div><strong>{risky?(sequence.status==='unknown'?'Período sin identificar':'Este no es el horario siguiente'):'Período correcto'}</strong><p>{sequence.message}</p></div></div>}
        <div className="import-diff-title"><GitCompareArrows size={17}/> Comparación con {active.term}</div>
        <div className="diff-grid"><div><strong>{counts.new}</strong><span>Grupos nuevos</span></div><div><strong>{counts.removed}</strong><span>Eliminados</span></div><div><strong>{counts.rescheduled}</strong><span>Reprogramados</span></div><div><strong>{counts.teacher}</strong><span>Cambio docente</span></div></div>
        {missingSubjects>0&&<p className="missing-subjects"><AlertCircle size={15}/><span><b>{missingSubjects}</b> {missingSubjects===1?'materia':'materias'} de {active.term} no {missingSubjects===1?'aparece':'aparecen'} en este archivo. Si el PDF está completo, no se ofertarán este semestre.</span></p>}
        <div className="teacher-summary" aria-label="Profesores en el nuevo horario">
          {teacherCounts.confirmed>0&&<div><CheckCircle2 size={16}/><span><b>{teacherCounts.confirmed}</b> grupos con profesor publicado</span></div>}
          <div><UserCheck size={16}/><span><b>{teacherCounts.estimated}</b> con profesor probable: mismo día y hora que en {active.term}</span></div>
          <div><UserX size={16}/><span><b>{teacherCounts.unknown}</b> con profesor por confirmar: horario nuevo o distinto</span></div>
        </div>
        {review.changes.filter(x=>x.type==='new'||x.type==='rescheduled').length>0&&<div className="diff-list">{review.changes.filter(x=>x.type==='new'||x.type==='rescheduled').slice(0,7).map((x,i)=><div key={i}><span className="mini-dot"/><b>{x.code}</b> {x.label} · {x.detail}</div>)}</div>}
        {review.warnings.length>0&&<button className="link-btn" onClick={()=>setShowWarnings(p=>!p)}>{showWarnings?'Ocultar':'Ver'} {review.warnings.length} {review.warnings.length===1?'advertencia':'advertencias'} de interpretación</button>}
        {showWarnings&&review.warnings.length>0&&<div className="warnings">{review.warnings.slice(0,75).map((x,i)=><p key={i}>{x}</p>)}</div>}
        <div className="info-note"><AlertCircle size={18}/><p>Revisa las materias y los grupos antes de matricularte. Este planificador no verifica disponibilidad de cupos ni sustituye Academusoft.</p></div>
        <div className="modal-actions"><button className="btn-outline" onClick={()=>setReview(null)}><FileText size={16}/> Cambiar archivo</button><button className="btn-primary" onClick={save}><CheckCircle2 size={17}/> {risky?'Importar de todas formas':'Confirmar catálogo'} <ArrowRight size={16}/></button></div>
      </>}
      {error&&<p role="alert" className="error-note"><AlertCircle size={16}/>{error}</p>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
