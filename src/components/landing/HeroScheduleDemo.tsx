import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';

type Slot = { day: number; start: number; end: number };
type DemoSubject = { id: string; name: string; tone: string };
type DemoOption = { label: string; detail: string; slots: Record<string, [Slot, Slot]> };

const DAY_START = 7;
const DAY_SPAN = 10;
const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];
const HOUR_MARKS = [7, 9, 11, 13, 15];
const CYCLE_MS = 3600;

const SUBJECTS: DemoSubject[] = [
  { id: 'ed', name: 'ESTRUCTURA DE DATOS', tone: 'm1' },
  { id: 'ci', name: 'CÁLCULO INTEGRAL', tone: 'm2' },
  { id: 'bd', name: 'BASES DE DATOS', tone: 'm3' },
  { id: 'ar', name: 'ARQUITECTURA', tone: 'm4' },
  { id: 'pw', name: 'PROGRAMACIÓN WEB', tone: 'm5' },
];

const s = (day: number, start: number, end: number): Slot => ({ day, start, end });

const OPTIONS: DemoOption[] = [
  {
    label: 'Equilibrada',
    detail: 'Clases repartidas en la semana',
    slots: {
      ed: [s(0, 8, 10), s(2, 8, 10)],
      ci: [s(1, 10, 12), s(3, 10, 12)],
      bd: [s(0, 14, 16), s(2, 14, 16)],
      ar: [s(1, 7, 9), s(4, 7, 9)],
      pw: [s(3, 14, 16), s(4, 10, 12)],
    },
  },
  {
    label: 'Sin clases a las 7',
    detail: 'Todas empiezan desde las 8 AM',
    slots: {
      ed: [s(1, 8, 10), s(3, 8, 10)],
      ci: [s(0, 10, 12), s(2, 10, 12)],
      bd: [s(1, 14, 16), s(3, 14, 16)],
      ar: [s(4, 8, 10), s(0, 14, 16)],
      pw: [s(2, 14, 16), s(4, 10, 12)],
    },
  },
  {
    label: 'Viernes libre',
    detail: 'Todo en mañanas de lunes a jueves',
    slots: {
      ed: [s(0, 7, 9), s(2, 7, 9)],
      ci: [s(0, 9, 11), s(2, 9, 11)],
      bd: [s(1, 7, 9), s(3, 7, 9)],
      ar: [s(1, 9, 11), s(3, 9, 11)],
      pw: [s(0, 11, 13), s(3, 11, 13)],
    },
  },
];

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const hourLabel = (h: number) => (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
const weeklyHours = (option: DemoOption) =>
  Object.values(option.slots)
    .flat()
    .reduce((n, slot) => n + slot.end - slot.start, 0);

/**
 * Animated hero preview: cycles through conflict-free combinations of the same five subjects
 * so the landing shows what the generator actually does. Pauses on hover, focus, off-screen,
 * and under reduced motion.
 */
export function HeroScheduleDemo() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const option = OPTIONS[index];

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || !visible) return undefined;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex(i => (i + 1) % OPTIONS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused, visible]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 170, damping: 24, mass: 0.9 };

  return (
    <div
      ref={rootRef}
      className="hero-visual"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero-ambient halo-1" aria-hidden="true" />
      <div className="hero-ambient halo-2" aria-hidden="true" />
      <div className="hero-visual-stack">
        <div className="hero-badges-row top">
          <div className="floating-tag tag-left">
            <span aria-hidden="true">
              <Sparkles size={15} />
            </span>
            <div aria-live="polite">
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </div>
          </div>
          <div className="demo-switch" role="group" aria-label="Combinaciones de ejemplo">
            {OPTIONS.map((o, i) => (
              <button
                key={o.label}
                type="button"
                className={i === index ? 'active' : ''}
                aria-pressed={i === index}
                aria-label={`Ver opción ${i + 1}: ${o.label}`}
                onClick={() => setIndex(i)}
              >
                <span aria-hidden="true">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mock-calendar" aria-hidden="true">
          <div className="mock-top">
            <div className="mock-window-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-title">Mi semana</div>
            <span className="mock-term">
              Opción {index + 1} de {OPTIONS.length}
            </span>
          </div>
          <div className="mock-main">
            <div className="mock-header">
              <div>
                <small>CALENDARIO SEMANAL</small>
                <h3>Tu horario de clases</h3>
              </div>
              <span className="mock-status">
                <CheckCircle2 size={12} /> Sin cruces
              </span>
            </div>
            <div className="mock-grid">
              <div className="mock-grid-head">
                <span />
                {DAYS.map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="mock-time">
                {HOUR_MARKS.map(h => (
                  <span key={h} style={{ top: `${((h - DAY_START) / DAY_SPAN) * 100}%` }}>
                    {hourLabel(h)}
                  </span>
                ))}
              </div>
              <div className="mock-slots">
                <div className="mock-stripes" />
                {SUBJECTS.flatMap(subject =>
                  option.slots[subject.id].map((slot, k) => (
                    <motion.div
                      key={`${subject.id}-${k}`}
                      className={`mock-event ${subject.tone}`}
                      initial={false}
                      animate={{
                        left: `${slot.day * 20 + 1}%`,
                        top: `${((slot.start - DAY_START) / DAY_SPAN) * 100 + 0.6}%`,
                        height: `${((slot.end - slot.start) / DAY_SPAN) * 100 - 1.2}%`,
                      }}
                      transition={{ ...transition, delay: reduceMotion ? 0 : k * 0.04 }}
                    >
                      <strong>{subject.name}</strong>
                      <small>
                        {pad(slot.start)} – {pad(slot.end)}
                      </small>
                    </motion.div>
                  )),
                )}
              </div>
            </div>
            <div className="mock-bottom">
              <div>
                <span className="mock-dot" /> {SUBJECTS.length} materias <span>·</span>{' '}
                {weeklyHours(option)} horas semanales
              </div>
              <div className="mock-progress" key={index} data-running={!reduceMotion && !paused}>
                <span />
              </div>
            </div>
          </div>
        </div>
        <p className="sr-only">
          Ejemplo: tres combinaciones distintas de las mismas cinco materias, todas sin cruces de
          horario.
        </p>
      </div>
    </div>
  );
}
