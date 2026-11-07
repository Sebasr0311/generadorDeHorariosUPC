import {useRef,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {AlertCircle,ArrowRight,CheckCircle2,FileText,FileUp,GitCompareArrows,ShieldCheck,X} from 'lucide-react';
import type {Catalog,GroupChange} from '../lib/types';
import {parseCatalogFile} from '../lib/importer';
import {reconcileCatalog} from '../lib/reconcile';
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
    onImport({...review.catalog,term:t,label:`${t} · Catálogo importado`,teacherMode:'mixed',warnings:review.warnings});setOpen(false);setReview(null);setError('');}
  const counts={new:review?.changes.filter(c=>c.type==='new').length||0,removed:review?.changes.filter(c=>c.type==='removed').length||0,rescheduled:review?.changes.filter(c=>c.type==='rescheduled').length||0,teacher:review?.changes.filter(c=>c.type==='teacher').length||0};
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
        <label className="field-label" htmlFor="term">Período que vas a importar</label><input id="term" className="field" placeholder="Ej. 2027-1" value={term} onChange={e=>setTerm(e.target.value)}/>
        <div className="import-diff-title"><GitCompareArrows size={17}/> Comparación con {active.term}</div>
        <div className="diff-grid"><div><strong>{counts.new}</strong><span>Grupos nuevos</span></div><div><strong>{counts.removed}</strong><span>Eliminados</span></div><div><strong>{counts.rescheduled}</strong><span>Reprogramados</span></div><div><strong>{counts.teacher}</strong><span>Cambio docente</span></div></div>
        {review.changes.filter(x=>x.type==='new'||x.type==='rescheduled').length>0&&<div className="diff-list">{review.changes.filter(x=>x.type==='new'||x.type==='rescheduled').slice(0,7).map((x,i)=><div key={i}><span className="mini-dot"/><b>{x.code}</b> {x.label} · {x.type==='new'?'Grupo nuevo':'Horario modificado'}</div>)}</div>}
        <button className="link-btn" onClick={()=>setShowWarnings(p=>!p)}>{showWarnings?'Ocultar':'Ver'} {review.warnings.length} advertencias de interpretación</button>
        {showWarnings&&<div className="warnings">{review.warnings.length?review.warnings.slice(0,75).map((x,i)=><p key={i}>{x}</p>):<p>No se detectaron advertencias.</p>}</div>}
        <div className="info-note"><AlertCircle size={18}/><p>Revisa las materias y los grupos antes de matricularte. Este planificador no verifica disponibilidad de cupos ni sustituye Academusoft.</p></div>
        <div className="modal-actions"><button className="btn-outline" onClick={()=>setReview(null)}><FileText size={16}/> Cambiar archivo</button><button className="btn-primary" onClick={save}><CheckCircle2 size={17}/> Confirmar catálogo <ArrowRight size={16}/></button></div>
      </>}
      {error&&<p role="alert" className="error-note"><AlertCircle size={16}/>{error}</p>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
