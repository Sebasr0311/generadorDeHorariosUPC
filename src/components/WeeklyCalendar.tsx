import type {Schedule} from '../lib/types';
import {DAY_NAMES,formatHour} from '../lib/types';
const colors=['#DBEAFE','#DCFCE7','#F3E8FF','#FFEDD5','#CCFBF1','#FCE7F3','#E0E7FF','#FEF3C7'];
const borders=['#93C5FD','#86EFAC','#D8B4FE','#FDBA74','#5EEAD4','#F9A8D4','#A5B4FC','#FCD34D'];
export default function WeeklyCalendar({schedule}:{schedule:Schedule|null}){
  const all=schedule?.groups.flatMap((item,i)=>item.group.sessions.map(s=>({...s,item,i})))||[];
  const start=all.length?Math.min(360,...all.map(s=>s.start)):360;
  const end=all.length?Math.max(1260,...all.map(s=>s.end)):1260;
  const from=Math.floor(start/60)*60;
  const to=Math.ceil(end/60)*60;
  const rows=(to-from)/60;
  return <div className="calendar-wrap" role="region" aria-label="Visualización semanal del horario" tabIndex={0}>
    <div className="calendar-grid" style={{height:Math.max(680,rows*68+48)}}>
      <div className="calendar-head time-head">GMT-5</div>
      {DAY_NAMES.map((d,i)=><div key={d} className="calendar-head" style={{gridColumn:i+2}}>{d.slice(0,3)}<span>{d}</span></div>)}
      <div className="calendar-body">
        {Array.from({length:rows},(_,i)=>{const pct=i/rows*100;return <div key={i} className="calendar-time-line" style={{top:`${pct}%`}}><span>{formatHour(from+i*60)}</span></div>;})}
        {Array.from({length:7},(_,i)=><div key={i} className="calendar-day-line" style={{left:`${(i+1)/7*100}%`}}/>)}
        {all.map((s,n)=>{
          const top=(s.start-from)/(to-from)*100;
          const height=(s.end-s.start)/(to-from)*100;
          const duration=s.end-s.start;
          const compact=duration<=70;
          return <div key={`${s.item.code}-${s.item.group.id}-${s.day}-${s.start}-${n}`} title={`${s.item.name} · ${s.item.group.label} · ${formatHour(s.start)}–${formatHour(s.end)} · ${s.room}`} className={`calendar-event${compact?' compact':''}`} style={{top:`calc(${top}% + 2px)`,height:`calc(${height}% - 4px)`,left:`calc(${s.day/7*100}% + 3px)`,width:'calc(14.285714% - 6px)',background:colors[s.i%colors.length],borderLeft:`3px solid ${borders[s.i%borders.length]}`}}>
            {compact ? (
              <>
                <strong>{s.item.code} · {s.item.group.label}</strong>
                <span className="calendar-event-name">{s.item.name}</span>
                <small className="event-room">{formatHour(s.start)}–{formatHour(s.end)} · {s.room}</small>
              </>
            ) : (
              <>
                <strong>{s.item.code}</strong>
                <span className="calendar-event-name">{s.item.name}</span>
                <span>{formatHour(s.start)} – {formatHour(s.end)}</span>
                <small>{s.item.group.label}</small>
                <small className="event-room">{s.room}</small>
              </>
            )}
          </div>;
        })}
      </div>
    </div>
    {!all.length&&<div className="calendar-empty"><span>✳</span><strong>Tu semana aún está en blanco</strong><p>Selecciona asignaturas y genera combinaciones para empezar.</p></div>}
  </div>;
}
