import { Pin } from 'lucide-react';
import type { Schedule } from '../lib/types';
import { DAY_NAMES, formatHour } from '../lib/types';

const colors = ['#DBEAFE', '#DCFCE7', '#F3E8FF', '#FFEDD5', '#CCFBF1', '#FCE7F3', '#E0E7FF', '#FEF3C7'];
const borders = ['#93C5FD', '#86EFAC', '#D8B4FE', '#FDBA74', '#5EEAD4', '#F9A8D4', '#A5B4FC', '#FCD34D'];

type WeeklyCalendarProps = {
  schedule: Schedule | null;
  viewMode?: 'grid' | 'agenda';
  pinnedByCode?: ReadonlyMap<string, string>;
  onTogglePinGroup?: (subjectCode: string, groupId: string, subjectName: string, groupLabel: string) => void;
};

export default function WeeklyCalendar({
  schedule,
  viewMode = 'grid',
  pinnedByCode,
  onTogglePinGroup,
}: WeeklyCalendarProps) {
  const all =
    schedule?.groups.flatMap((item, i) => item.group.sessions.map(s => ({ ...s, item, i }))) || [];
  const start = all.length ? Math.min(360, ...all.map(s => s.start)) : 360;
  const end = all.length ? Math.max(1260, ...all.map(s => s.end)) : 1260;
  const from = Math.floor(start / 60) * 60;
  const to = Math.ceil(end / 60) * 60;
  const rows = (to - from) / 60;

  if (viewMode === 'agenda' && all.length > 0) {
    const byDay = DAY_NAMES.map((dayName, dayIdx) => ({
      dayName,
      dayIdx,
      sessions: all
        .filter(s => s.day === dayIdx)
        .sort((a, b) => a.start - b.start),
    })).filter(d => d.sessions.length > 0);

    return (
      <div className="calendar-wrap calendar-agenda-wrap" role="region" aria-label="Agenda semanal por día" tabIndex={0}>
        <div className="calendar-agenda">
          {byDay.map(day => (
            <div key={day.dayName} className="agenda-day-card">
              <div className="agenda-day-head">
                <strong>{day.dayName}</strong>
                <span>
                  {day.sessions.length} {day.sessions.length === 1 ? 'bloque' : 'bloques'}
                </span>
              </div>
              <div className="agenda-day-list">
                {day.sessions.map((s, idx) => {
                  const isPinned = pinnedByCode?.get(s.item.code) === s.item.group.id;
                  const teacherLabel = s.item.group.teacher || 'Docente por confirmar';
                  return (
                    <div
                      key={`${s.item.code}-${s.item.group.id}-${day.dayIdx}-${s.start}-${idx}`}
                      className={'agenda-session-item' + (isPinned ? ' pinned' : '')}
                      style={{
                        background: colors[s.i % colors.length],
                        borderLeft: `4px solid ${borders[s.i % borders.length]}`,
                      }}
                    >
                      <div className="agenda-session-main">
                        <div className="agenda-session-top">
                          <span className="agenda-session-time">
                            {formatHour(s.start)} – {formatHour(s.end)}
                          </span>
                          <span className="agenda-session-code">
                            {s.item.code} · Grupo {s.item.group.label}
                          </span>
                        </div>
                        <strong className="agenda-session-title">{s.item.name}</strong>
                        <small className="agenda-session-meta">
                          {teacherLabel} · {s.room}
                        </small>
                      </div>
                      {onTogglePinGroup && (
                        <button
                          type="button"
                          className={'agenda-pin-btn' + (isPinned ? ' active' : '')}
                          onClick={() =>
                            onTogglePinGroup(
                              s.item.code,
                              s.item.group.id,
                              s.item.name,
                              s.item.group.label
                            )
                          }
                          aria-pressed={isPinned}
                          aria-label={`${isPinned ? 'Liberar' : 'Fijar'} grupo ${s.item.group.label} de ${s.item.name}`}
                        >
                          <Pin size={13} />
                          <span>{isPinned ? 'Fijado' : 'Fijar'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-wrap" role="region" aria-label="Visualización semanal del horario" tabIndex={0}>
      <div className="calendar-grid" style={{ height: Math.max(680, rows * 68 + 48) }}>
        <div className="calendar-head time-head">GMT-5</div>
        {DAY_NAMES.map((d, i) => (
          <div key={d} className="calendar-head" style={{ gridColumn: i + 2 }}>
            {d.slice(0, 3)}
            <span>{d}</span>
          </div>
        ))}
        <div className="calendar-body">
          {Array.from({ length: rows }, (_, i) => {
            const pct = (i / rows) * 100;
            return (
              <div key={i} className="calendar-time-line" style={{ top: `${pct}%` }}>
                <span>{formatHour(from + i * 60)}</span>
              </div>
            );
          })}
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="calendar-day-line" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
          {all.map((s, n) => {
            const top = ((s.start - from) / (to - from)) * 100;
            const height = ((s.end - s.start) / (to - from)) * 100;
            const duration = s.end - s.start;
            const compact = duration <= 70;
            const teacherLabel = s.item.group.teacher || 'Docente por confirmar';
            const isPinned = pinnedByCode?.get(s.item.code) === s.item.group.id;
            const pinHint = onTogglePinGroup
              ? isPinned
                ? ' · Clic para liberar grupo'
                : ' · Clic para fijar este grupo'
              : '';
            return (
              <div
                key={`${s.item.code}-${s.item.group.id}-${s.day}-${s.start}-${n}`}
                tabIndex={onTogglePinGroup ? 0 : undefined}
                aria-label={
                  onTogglePinGroup
                    ? `${isPinned ? 'Liberar' : 'Fijar'} grupo ${s.item.group.label} de ${s.item.name} (${s.item.code})`
                    : undefined
                }
                onClick={
                  onTogglePinGroup
                    ? () =>
                        onTogglePinGroup(
                          s.item.code,
                          s.item.group.id,
                          s.item.name,
                          s.item.group.label
                        )
                    : undefined
                }
                onKeyDown={
                  onTogglePinGroup
                    ? e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onTogglePinGroup(
                            s.item.code,
                            s.item.group.id,
                            s.item.name,
                            s.item.group.label
                          );
                        }
                      }
                    : undefined
                }
                title={`${s.item.name} · Grupo ${s.item.group.label} · ${teacherLabel} · ${formatHour(s.start)}–${formatHour(s.end)} · ${s.room}${pinHint}`}
                className={`calendar-event${compact ? ' compact' : ''}${isPinned ? ' is-pinned' : ''}${onTogglePinGroup ? ' interactive' : ''}`}
                style={{
                  top: `calc(${top}% + 2px)`,
                  height: `calc(${height}% - 4px)`,
                  left: `calc(${(s.day / 7) * 100}% + 3px)`,
                  width: 'calc(14.285714% - 6px)',
                  background: colors[s.i % colors.length],
                  borderLeft: `3px solid ${borders[s.i % borders.length]}`,
                }}
              >
                {compact ? (
                  <>
                    <strong>
                      {s.item.code} · {s.item.group.label}
                      {isPinned ? ' 📌' : ''}
                    </strong>
                    <span className="calendar-event-name">{s.item.name}</span>
                    <small className="event-room">
                      {formatHour(s.start)}–{formatHour(s.end)} · {s.room}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>
                      {s.item.code}
                      {isPinned ? ' 📌' : ''}
                    </strong>
                    <span className="calendar-event-name">{s.item.name}</span>
                    <span>
                      {formatHour(s.start)} – {formatHour(s.end)}
                    </span>
                    <small>{s.item.group.label}</small>
                    <small className="event-room">{s.room}</small>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {!all.length && (
        <div className="calendar-empty">
          <span>✳</span>
          <strong>Tu semana aún está en blanco</strong>
          <p>Selecciona asignaturas y genera combinaciones para empezar.</p>
        </div>
      )}
    </div>
  );
}
