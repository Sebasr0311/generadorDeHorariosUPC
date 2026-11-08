import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudOff,
  Download,
  FileClock,
  FileDown,
  FileSpreadsheet,
  GitCompareArrows,
  GraduationCap,
  Heart,
  Info,
  Layers3,
  LayoutGrid,
  List,
  ListFilter,
  Menu,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type {
  Catalog,
  Choice,
  Group,
  Preferences,
  ReconciledCatalogItem,
  SavedPlan,
  SemesterFilterValue,
  Subject,
} from './lib/types';
import { DAY_NAMES, DEFAULT_PREFERENCES, SHORT_DAYS, formatHour } from './lib/types';
import { describeConflicts, generateSchedules, groupConflictReason, groupOptions } from './lib/generator';
import {
  CURRICULUM_METADATA,
  computeSemesterCounts,
  filterReconciledItems,
  loadCentralSelection,
  loadPersistedSemesterFilter,
  migrateChoicesForCatalog,
  persistCentralSelection,
  persistSemesterFilter,
  reconcileCurriculumAndCatalog,
  reconcileSelectionWithNewCatalog,
} from './lib/curriculum';
import { loadCatalogs, loadPlans, saveCatalog, savePlan, deletePlan } from './lib/storage';
import { exportExcel, exportHtml, exportJson, exportPdf } from './lib/exporters';
import { ImportDialog } from './components/ImportDialog';
import { PensumPage } from './components/PensumPage';
import { SemesterFilter } from './components/SemesterFilter';
import { SelectedSubjectsSummary } from './components/SelectedSubjectsSummary';
import { SubjectCatalogList } from './components/SubjectCatalogList';
import WeeklyCalendar from './components/WeeklyCalendar';
import { ShinyText } from './components/ShinyText';
import { SpotlightCard } from './components/SpotlightCard';
import { useReducedMotion } from 'motion/react';
import DotGrid from './components/reactbits/DotGrid/DotGrid';
import BlurText from './components/reactbits/BlurText/BlurText';
import AnimatedContent from './components/reactbits/AnimatedContent/AnimatedContent';
import Magnet from './components/reactbits/Magnet/Magnet';
import StarBorder from './components/reactbits/StarBorder/StarBorder';
import CountUp from './components/reactbits/CountUp/CountUp';
import ClickSpark from './components/reactbits/ClickSpark/ClickSpark';
import sample from './data/catalogo-base.json';

const initial = sample as Catalog;
const subjectCount = (c: Catalog) => c.subjects.length;
const groupCount = (c: Catalog) => c.subjects.reduce((n, s) => n + s.groups.length, 0);
const sourceText = (source: string) =>
  source === 'confirmed'
    ? 'Confirmado'
    : source === 'estimated'
      ? 'Probable'
      : source === 'possible'
        ? 'Posible'
        : 'Por confirmar';
const badges: Record<string, string> = {
  confirmed: 'success',
  estimated: 'estimated',
  possible: 'estimated',
  unassigned: 'unknown',
};

const HERO_FROM = { filter: 'blur(10px)', opacity: 0, y: 14 };
const HERO_TO = [{ filter: 'blur(0px)', opacity: 1, y: 0 }];
const HERO_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Traza - ir a inicio">
      <span className="brand-mark">
        <Layers3 size={22} strokeWidth={2.4} />
      </span>
      <span>
        traza<span className="brand-point">.</span>
      </span>
    </button>
  );
}

function Landing({
  onStart,
  onOpenPensum,
}: {
  onStart: () => void;
  onOpenPensum: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="landing">
      <div className="landing-top-glow" aria-hidden="true" />
      <header className="topnav container">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <nav
          className={menu ? 'nav-links mobile-visible' : 'nav-links'}
          aria-label="Navegación principal"
        >
          <a href="#pensum-section" onClick={() => setMenu(false)}>
            Mi pensum
          </a>
          <a href="#beneficios" onClick={() => setMenu(false)}>
            Beneficios
          </a>
          <a href="#como-funciona" onClick={() => setMenu(false)}>
            Cómo funciona
          </a>
          <a href="#preguntas" onClick={() => setMenu(false)}>
            Preguntas
          </a>
        </nav>
        <div className="nav-actions">
          <span className="nav-tag">
            <span /> Para estudiantes UPC
          </span>
          <button className="btn-outline small" onClick={onOpenPensum}>
            <GraduationCap size={15} /> Mi pensum
          </button>
          <button className="btn-primary small" onClick={onStart}>
            Abrir planificador <ArrowRight size={16} />
          </button>
          <button
            className="icon-btn menu-button"
            onClick={() => setMenu(m => !m)}
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero container">
          <div className="hero-dotgrid" aria-hidden="true">
            <DotGrid
              dotSize={4}
              gap={22}
              baseColor="#dbe3ef"
              activeColor="#2554d8"
              proximity={130}
              strength={0.7}
              shockRadius={220}
              shockStrength={2.5}
              swell={0.5}
              stretch={0.3}
              glow={0.25}
              fade={0.7}
              opacity={0.85}
            />
          </div>
          <div className="hero-copy">
            <div className="pill-eyebrow">
              <span className="eyebrow-star">✦</span> HECHO PARA INGENIERÍA DE SISTEMAS · UPC
            </div>
            <h1>
              <BlurText
                as="span"
                className="hero-line"
                text="Tu semestre,"
                trigger="load"
                delay={90}
                stepDuration={0.7}
                animationFrom={HERO_FROM}
                animationTo={HERO_TO}
                easing={HERO_EASE}
              />
              <span className="hero-gradient hero-accent-in">
                <ShinyText>a tu manera.</ShinyText>
              </span>
            </h1>
            <p className="hero-description">
              Olvídate de comparar grupos a mano. Explora tu pensum, elige tus materias, encuentra
              combinaciones sin cruces y arma un horario que sí se adapte a tu vida.
            </p>
            <div className="hero-ctas">
              <Magnet
                padding={48}
                magnetStrength={8}
                maxOffset={6}
                wrapperClassName="hero-magnet"
              >
                <button className="btn-primary big" onClick={onStart}>
                  Crear mi horario gratis <ArrowRight size={18} />
                </button>
              </Magnet>
              <button className="btn-outline big" onClick={onOpenPensum}>
                <GraduationCap size={17} /> Explorar mi pensum
              </button>
            </div>
            <div className="hero-meta">
              <div className="avatar-stack">
                <span>IS</span>
                <span>UPC</span>
                <span>✓</span>
              </div>
              <div>
                <strong>Un horario a tu ritmo</strong>
                <small>Sin registro, sin pagos, sin complicaciones</small>
              </div>
            </div>
          </div>
          <HeroIllustration />
        </section>

        <section className="trust-strip container" aria-label="Características">
          <span>
            <CheckCircle2 size={17} /> Sin cruces de horario
          </span>
          <span>
            <GraduationCap size={17} /> 62 materias y prerrequisitos claros
          </span>
          <span>
            <CloudOff size={17} /> Tus datos permanecen en tu navegador
          </span>
          <span>
            <FileDown size={17} /> Exportación a PDF y Excel
          </span>
        </section>

        <section className="pensum-landing-section section container" id="pensum-section">
          <div className="pensum-landing-card">
            <div className="pensum-landing-copy">
              <div className="eyebrow">MALLA CURRICULAR INTERACTIVA · MI PENSUM</div>
              <h2>Explora el pensum, elige materias y genera horarios.</h2>
              <p>
                Recorre las {CURRICULUM_METADATA.totalAsignaturasDocumentadas} asignaturas
                documentadas ({CURRICULUM_METADATA.totalPonderacionAcademicaDocumentada} unidades de
                ponderación académica en los períodos I a IX) mediante búsqueda global o por
                semestre. Consulta prerrequisitos explicados por nombre completo y transfiere tu
                selección directamente al planificador.
              </p>
              <div className="pensum-landing-highlights">
                <span>
                  <Check size={15} /> Dos vías sincronizadas: «Todas las materias» y «Por semestre»
                </span>
                <span>
                  <Check size={15} /> Prerrequisitos legibles por nombre y créditos requisito diferenciados
                </span>
                <span>
                  <Check size={15} /> Selección persistente multisemestre conectada al generador
                </span>
              </div>
              <div className="pensum-landing-ctas">
                <button type="button" className="btn-primary" onClick={onOpenPensum}>
                  <GraduationCap size={17} /> Explorar mi pensum <ArrowRight size={16} />
                </button>
                <button type="button" className="btn-outline" onClick={onStart}>
                  <CalendarDays size={17} /> Armar horario
                </button>
              </div>
            </div>
            <div className="pensum-landing-preview" aria-hidden="true">
              <div className="pensum-preview-pill">
                <strong>SS301 · ESTRUCTURA DE DATOS</strong>
                <small>Sem. III · 3 pond. · Debes haber aprobado PROGRAMACION DE COMPUTADORES I</small>
              </div>
              <div className="pensum-preview-pill second">
                <strong>SS802 · BASE DE DATOS AVANZADAS</strong>
                <small>Sem. V · 3 pond. · Requiere 70 créditos (Academusoft)</small>
              </div>
              <div className="pensum-preview-pill third">
                <strong>SS702 · INTELIGENCIA ARTIFICIAL</strong>
                <small>Sem. VII · 3 pond. · Debes haber aprobado MODELOS Y SIMULACION</small>
              </div>
            </div>
          </div>
        </section>

        <section className="features section container" id="beneficios">
          <div className="section-intro">
            <div className="eyebrow">MENOS ESTRÉS, MÁS CONTROL</div>
            <h2>
              Organizar el semestre
              <br />
              no debería ser un rompecabezas.
            </h2>
            <p>
              Todas las herramientas que necesitas para pasar del PDF oficial a una semana
              perfectamente organizada.
            </p>
          </div>
          <AnimatedContent
            className="feature-grid"
            distance={28}
            blur={6}
            duration={0.7}
            ease="expo.out"
            stagger={0.08}
            threshold={0.15}
          >
            <SpotlightCard className="feature-card primary-feature">
              <div className="feature-copy">
                <div className="feature-icon blue">
                  <Sparkles size={25} />
                </div>
                <h3>Combinaciones inteligentes</h3>
                <p>
                  Explora distintas opciones compatibles. Agrupa cada materia con todas sus clases y
                  evita cruces automáticamente.
                </p>
              </div>
              <div className="feature-art">
                <div className="stack-chip">
                  <Check size={15} /> Horario compatible
                </div>
                <div className="stack-chip second">
                  <Check size={15} /> 5 materias seleccionadas
                </div>
                <div className="stack-chip third">
                  <Sparkles size={15} /> Días más compactos
                </div>
              </div>
            </SpotlightCard>
            <SpotlightCard className="feature-card">
              <div className="feature-icon mint">
                <Users size={25} />
              </div>
              <h3>Tu profesor, tu elección</h3>
              <p>
                Filtra por docente y grupo. Si la asignación aún no es oficial, te mostraremos
                claramente qué es probable y qué está por confirmar.
              </p>
              <div className="feature-tag">
                <span className="status success">● Confirmado</span>
                <span className="status estimated">◕ Estimado</span>
              </div>
            </SpotlightCard>
            <SpotlightCard className="feature-card">
              <div className="feature-icon peach">
                <FileClock size={25} />
              </div>
              <h3>Siempre actualizado</h3>
              <p>
                Importa un nuevo PDF de Academusoft y detecta grupos nuevos, eliminados o
                reprogramados sin perder tus versiones previas.
              </p>
              <div className="mini-change">
                <GitCompareArrows size={16} />
                <span>Detectar cambios de horario</span>
                <strong>Listo</strong>
              </div>
            </SpotlightCard>
            <SpotlightCard className="feature-card">
              <div className="feature-icon purple">
                <Download size={25} />
              </div>
              <h3>Un horario para llevar</h3>
              <p>
                Descarga tu calendario en PDF o en un Excel elegante, con materias, franjas,
                docente, grupo y salón.
              </p>
              <div className="export-icons">
                <span>
                  <FileSpreadsheet size={18} /> Excel
                </span>
                <span>
                  <FileDown size={18} /> PDF
                </span>
              </div>
            </SpotlightCard>
          </AnimatedContent>
        </section>

        <section className="how section" id="como-funciona">
          <div className="container">
            <div className="section-intro centered">
              <div className="eyebrow">ASÍ DE SENCILLO</div>
              <h2>
                De un PDF a tu horario ideal
                <br />
                en solo cuatro pasos.
              </h2>
              <p>No tienes que saber de algoritmos ni perder horas comparando tablas.</p>
            </div>
            <AnimatedContent
              className="steps-grid"
              distance={20}
              duration={0.6}
              ease="power3.out"
              stagger={0.1}
              threshold={0.15}
            >
              <div className="step-card">
                <span>01</span>
                <div className="step-icon">
                  <BookOpen size={25} />
                </div>
                <h3>Elige tus materias</h3>
                <p>
                  Busca y selecciona las asignaturas desde «Mi pensum» o directamente en el
                  planificador.
                </p>
              </div>
              <div className="step-card">
                <span>02</span>
                <div className="step-icon">
                  <ListFilter size={25} />
                </div>
                <h3>Marca preferencias</h3>
                <p>Selecciona profesores, horarios y días que quisieras dejar libres.</p>
              </div>
              <div className="step-card">
                <span>03</span>
                <div className="step-icon">
                  <CalendarDays size={25} />
                </div>
                <h3>Descubre opciones</h3>
                <p>Revisa combinaciones sin cruces y escoge la que mejor te funcione.</p>
              </div>
              <div className="step-card">
                <span>04</span>
                <div className="step-icon">
                  <Download size={25} />
                </div>
                <h3>Guarda y comparte</h3>
                <p>Conserva tu propuesta y exporta tu horario a Excel o PDF.</p>
              </div>
            </AnimatedContent>
          </div>
        </section>

        <section className="notice-section container">
          <div className="notice-card">
            <div className="notice-icon">
              <ShieldCheck size={27} />
            </div>
            <div>
              <h3>Información clara, incluso cuando la universidad cambia los grupos.</h3>
              <p>
                Traza distingue docentes oficiales de estimaciones históricas. Si un grupo es nuevo
                o cambia su franja, no inventamos quién lo dictará. Siempre podrás comprobar el
                horario publicado antes de matricularte.
              </p>
            </div>
            <button className="btn-outline" onClick={onStart}>
              Explorar horarios <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="faq section container" id="preguntas">
          <div className="section-intro centered">
            <div className="eyebrow">PREGUNTAS FRECUENTES</div>
            <h2>Todo más claro.</h2>
          </div>
          <div className="faq-grid">
            <details>
              <summary>
                ¿Necesito una cuenta? <ChevronDown size={18} />
              </summary>
              <p>
                No. Tus catálogos, selección curricular, preferencias y propuestas guardadas se
                conservan localmente en este navegador.
              </p>
            </details>
            <details>
              <summary>
                ¿Qué pasa si cambian los grupos? <ChevronDown size={18} />
              </summary>
              <p>
                Importa el PDF actualizado. Traza compara los cursos y sus franjas, conserva tu
                selección de materias y te avisa si un grupo o materia dejó de estar disponible.
              </p>
            </details>
            <details>
              <summary>
                ¿La asignación de profesor es oficial? <ChevronDown size={18} />
              </summary>
              <p>
                Solo cuando está expresamente identificada en el catálogo importado. Los docentes
                del semestre anterior aparecerán marcados como probables y nunca se anunciarán como
                confirmados.
              </p>
            </details>
            <details>
              <summary>
                ¿Esto matricula mis materias? <ChevronDown size={18} />
              </summary>
              <p>
                No. Traza es un planificador independiente. Debes verificar cupos, requisitos y el
                horario definitivo en los canales oficiales de la universidad.
              </p>
            </details>
          </div>
        </section>

        <section className="cta-section container">
          <AnimatedContent
            className="cta-inner"
            distance={16}
            scale={0.98}
            duration={0.7}
            ease="expo.out"
            stagger={0.08}
            threshold={0.2}
          >
            <div className="cta-orb" />
            <div>
              <span>EL SIGUIENTE SEMESTRE COMIENZA AQUÍ</span>
              <h2>
                Tu tiempo vale demasiado
                <br />
                para dejarlo al azar.
              </h2>
              <p>Explora el pensum completo o empieza directamente en el planificador.</p>
            </div>
            <StarBorder
              className="btn-white"
              onClick={onStart}
              theme="light"
              color="#2554d8"
              trailColor="#6d8ff0"
              backgroundColor="#ffffff"
              textColor="#1d43b8"
              borderColor="rgba(37, 84, 216, 0.18)"
              radius={12}
              thickness={1.5}
              duration={5}
              glow={0.5}
            >
              Empezar ahora <ArrowRight size={18} />
            </StarBorder>
          </AnimatedContent>
        </section>
      </main>
      <footer className="footer container">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <div>
          <p>Planificador académico independiente para estudiantes de Ingeniería de Sistemas.</p>
          <small>No es un sitio oficial de la Universidad Popular del Cesar.</small>
        </div>
        <span>Hecho para estudiar mejor · 2026</span>
      </footer>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="hero-visual" aria-label="Vista previa del calendario semanal">
      <div className="hero-ambient halo-1" />
      <div className="hero-ambient halo-2" />
      <div className="hero-visual-stack">
        <div className="hero-badges-row top">
          <div className="floating-tag tag-left">
            <span>
              <Sparkles size={15} />
            </span>
            <div>
              <strong>Sin choques</strong>
              <small>Horario optimizado</small>
            </div>
          </div>
          <div className="hero-mini-badge">
            <Zap size={16} /> Horarios en segundos
          </div>
        </div>
        <div className="mock-calendar">
          <div className="mock-top">
            <div className="mock-window-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-title">Mi semana perfecta</div>
            <span className="mock-term">2026 · II</span>
          </div>
          <div className="mock-main">
            <div className="mock-header">
              <div>
                <small>CALENDARIO SEMANAL</small>
                <h3>Tu horario de clases</h3>
              </div>
              <span className="mock-status">
                <span /> Sin cruces
              </span>
            </div>
            <div className="mock-grid">
              <div className="mock-grid-head">
                <span />
                <span>LUN</span>
                <span>MAR</span>
                <span>MIÉ</span>
                <span>JUE</span>
                <span>VIE</span>
              </div>
              <div className="mock-time">
                {['7 AM', '9 AM', '11 AM', '1 PM', '3 PM'].map(s => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="mock-slots">
                <div className="mock-stripes" />
                <div className="mock-event m1">
                  <strong>ESTRUCTURA DE DATOS</strong>
                  <small>08:00 - 10:00</small>
                </div>
                <div className="mock-event m2">
                  <strong>CÁLCULO INTEGRAL</strong>
                  <small>10:00 - 12:00</small>
                </div>
                <div className="mock-event m3">
                  <strong>BASES DE DATOS</strong>
                  <small>08:00 - 10:00</small>
                </div>
                <div className="mock-event m4">
                  <strong>ARQUITECTURA</strong>
                  <small>12:00 - 14:00</small>
                </div>
                <div className="mock-event m5">
                  <strong>PROGRAMACIÓN WEB</strong>
                  <small>09:00 - 11:00</small>
                </div>
              </div>
            </div>
            <div className="mock-bottom">
              <div>
                <span className="mock-dot" /> 5 materias <span>·</span> 16 horas semanales
              </div>
              <div className="mock-avatars">✓ ✓ ✓</div>
            </div>
          </div>
        </div>
        <div className="hero-badges-row bottom">
          <div className="floating-tag tag-right">
            <span>
              <CheckCircle2 size={15} />
            </span>
            <div>
              <strong>Todo en orden</strong>
              <small>Listo para matricular</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatGroupSessions = (g: Group) =>
  g.sessions.length
    ? g.sessions.map(s => `${SHORT_DAYS[s.day]} ${formatHour(s.start)}–${formatHour(s.end)}`).join(', ')
    : 'Sin horario asignado';

function TeacherControls({
  subject,
  choice,
  onChange,
  onRemove,
  prefs,
  catalog,
  choices,
  curriculumItem,
}: {
  subject: Subject;
  choice: Choice;
  onChange: (choice: Choice) => void;
  onRemove: () => void;
  prefs: Preferences;
  catalog: Catalog;
  choices: Choice[];
  curriculumItem?: ReconciledCatalogItem;
}) {
  const [showGroups, setShowGroups] = useState(false);
  const teachers = new Map<string, string>();
  for (const g of subject.groups) if (g.teacherId && g.teacher) teachers.set(g.teacherId, g.teacher);
  const matching = groupOptions(subject, choice, prefs);
  const availableGroups = subject.groups.filter(g => {
    if (choice.teacherId && choice.teacherMode === 'only' && g.teacherId !== choice.teacherId)
      return false;
    if (choice.teacherId && choice.teacherMode === 'exclude' && g.teacherId === choice.teacherId)
      return false;
    return true;
  });
  const conflictMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const g of availableGroups) {
      map.set(g.id, groupConflictReason(subject.code, g, catalog, choices, prefs));
    }
    return map;
  }, [availableGroups, subject.code, catalog, choices, prefs]);
  const compatibleCount = matching.filter(g => !conflictMap.get(g.id)).length;
  const pinnedGroupObj = availableGroups.find(g => g.id === choice.pinnedGroup);
  const pinnedConflict = pinnedGroupObj ? conflictMap.get(pinnedGroupObj.id) : null;
  const renderGroupButton = (g: Group) => {
    const teacherName = `${g.teacher || 'Docente por confirmar'}${g.teacherSource === 'estimated' ? ' (probable)' : g.teacherSource === 'possible' ? ' (posible)' : ''}`;
    const isPinned = choice.pinnedGroup === g.id;
    const conflict = conflictMap.get(g.id);
    return (
      <button
        key={g.id}
        type="button"
        disabled={Boolean(conflict) && !isPinned}
        className={
          'group-option-btn' + (isPinned ? ' active' : '') + (conflict ? ' conflict' : '')
        }
        onClick={() => {
          if (conflict && !isPinned) return;
          onChange({ ...choice, pinnedGroup: isPinned ? undefined : g.id });
        }}
        aria-pressed={isPinned}
      >
        <strong>
          Grupo {g.label} · {teacherName}
        </strong>
        <small>{formatGroupSessions(g)}</small>
        {conflict && <span className="group-conflict-tag">⚠ {conflict}</span>}
      </button>
    );
  };
  const codeLabel =
    curriculumItem && curriculumItem.curriculumCode !== subject.code
      ? `${curriculumItem.curriculumCode} (Horario: ${subject.code})`
      : subject.code;
  const semPrefix = curriculumItem?.romanSemester ? `Sem. ${curriculumItem.romanSemester} · ` : '';
  const creditsLabel = curriculumItem?.credits ? ` · ${curriculumItem.credits} cr.` : '';
  return (
    <div className="choice-control">
      <div className="choice-control-top">
        <div>
          <strong>{subject.name}</strong>
          <small>
            {semPrefix}
            {codeLabel}
            {creditsLabel} · {subject.groups.length} grupos
          </small>
        </div>
        <div className="choice-control-top-actions">
          <span className="count-chip">{compatibleCount} opciones</span>
          <button
            type="button"
            className="selected-chip-remove"
            onClick={onRemove}
            aria-label={`Quitar ${subject.name} de la selección`}
            title="Quitar materia"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="choice-control-fields">
        <label>
          Preferencia de docente
          <select
            aria-label={`Profesor para ${subject.name}`}
            value={choice.teacherId || ''}
            onChange={e =>
              onChange({
                ...choice,
                teacherId: e.target.value || undefined,
                teacherMode: e.target.value ? 'only' : 'any',
                pinnedGroup: undefined,
              })
            }
          >
            <option value="">Cualquier docente</option>
            {[...teachers]
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Tipo de filtro
          <select
            aria-label={`Tipo de filtro docente para ${subject.name}`}
            value={choice.teacherMode || 'any'}
            disabled={!choice.teacherId}
            onChange={e => {
              const nextMode = e.target.value as Choice['teacherMode'];
              const stillValid =
                !choice.pinnedGroup ||
                subject.groups.some(
                  g =>
                    g.id === choice.pinnedGroup &&
                    !(choice.teacherId && nextMode === 'only' && g.teacherId !== choice.teacherId) &&
                    !(
                      choice.teacherId &&
                      nextMode === 'exclude' &&
                      g.teacherId === choice.teacherId
                    )
                );
              onChange({
                ...choice,
                teacherMode: nextMode,
                pinnedGroup: stillValid ? choice.pinnedGroup : undefined,
              });
            }}
          >
            <option value="any">Sin restricción</option>
            <option value="only">Solo este profesor</option>
            <option value="exclude">Excluir profesor</option>
          </select>
        </label>
        <label className="full-field">
          Fijar grupo (opcional)
          <select
            aria-label={`Grupo para ${subject.name}`}
            value={choice.pinnedGroup || ''}
            onChange={e => {
              const nextId = e.target.value || undefined;
              if (nextId && conflictMap.get(nextId)) return;
              onChange({ ...choice, pinnedGroup: nextId });
            }}
          >
            <option value="">Cualquier grupo compatible ({compatibleCount})</option>
            {availableGroups.map(g => {
              const conflict = conflictMap.get(g.id);
              const isPinned = choice.pinnedGroup === g.id;
              return (
                <option
                  key={g.id}
                  value={g.id}
                  disabled={Boolean(conflict) && !isPinned}
                >
                  Grupo {g.label} · {g.teacher || 'Docente por confirmar'}
                  {g.teacherSource === 'estimated'
                    ? ' (probable)'
                    : g.teacherSource === 'possible'
                      ? ' (posible)'
                      : ''}{' '}
                  · {formatGroupSessions(g)}
                  {conflict ? ` · ⚠ ${conflict}` : ''}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {choice.teacherId && choice.teacherMode === 'only' ? (
        <div
          className="teacher-groups-list"
          role="group"
          aria-label={`Grupos del docente en ${subject.name}`}
        >
          {availableGroups.map(renderGroupButton)}
        </div>
      ) : (
        <>
          {pinnedGroupObj && (
            <div className="pinned-group-summary">
              <strong>
                Grupo {pinnedGroupObj.label} · {pinnedGroupObj.teacher || 'Docente por confirmar'}
                {pinnedGroupObj.teacherSource === 'estimated'
                  ? ' (probable)'
                  : pinnedGroupObj.teacherSource === 'possible'
                    ? ' (posible)'
                    : ''}
              </strong>
              <small>{formatGroupSessions(pinnedGroupObj)}</small>
            </div>
          )}
          <div className="group-list-drawer">
            <button
              type="button"
              className={'group-drawer-toggle' + (showGroups ? ' open' : '')}
              aria-expanded={showGroups}
              onClick={() => setShowGroups(s => !s)}
            >
              <span>
                {showGroups ? 'Ocultar' : 'Ver'} grupos, docentes y horarios (
                {availableGroups.length})
              </span>
              <ChevronDown size={15} />
            </button>
            {showGroups && (
              <div
                className="teacher-groups-list"
                role="group"
                aria-label={`Grupos disponibles en ${subject.name}`}
              >
                {availableGroups.map(renderGroupButton)}
              </div>
            )}
          </div>
        </>
      )}
      {pinnedConflict && (
        <div className="tiny-alert">
          <strong>Cruce de horario:</strong> {pinnedConflict}. Libera o cambia este grupo para
          evitar el cruce.
        </div>
      )}
      {!matching.length && (
        <div className="tiny-alert">
          Ningún grupo cumple estos filtros. Modifícalos para generar horarios.
        </div>
      )}
      {matching.length > 0 && !compatibleCount && !pinnedConflict && (
        <div className="tiny-alert">
          Todos los grupos disponibles se cruzan en horario con tus otras materias seleccionadas.
        </div>
      )}
      {subject.groups.some(g => g.teacherSource !== 'confirmed') && (
        <p className="teacher-disclaimer">
          <Info size={13} /> Hay grupos con docentes estimados o por confirmar.
        </p>
      )}
    </div>
  );
}

function Planner({
  catalogs,
  activeId,
  choices,
  saved,
  message,
  setMessage,
  onSelectCatalog,
  onImportCatalog,
  onToggleItem,
  onRemoveChoice,
  onClearAllChoices,
  onUpdateChoice,
  onRemoveUnofferedChoices,
  onSavePlan,
  onRenameSavedPlan,
  onLoadSavedPlan,
  onDeleteSavedPlan,
  onHome,
  onOpenPensum,
}: {
  catalogs: Catalog[];
  activeId: string;
  choices: Choice[];
  saved: SavedPlan[];
  message: string;
  setMessage: (msg: string) => void;
  onSelectCatalog: (id: string) => void;
  onImportCatalog: (c: Catalog) => void;
  onToggleItem: (item: ReconciledCatalogItem) => void;
  onRemoveChoice: (code: string) => void;
  onClearAllChoices: () => void;
  onUpdateChoice: (choice: Choice) => void;
  onRemoveUnofferedChoices: () => void;
  onSavePlan: (plan: SavedPlan) => Promise<void>;
  onRenameSavedPlan: (id: string, nextName: string) => Promise<void>;
  onLoadSavedPlan: (plan: SavedPlan) => void;
  onDeleteSavedPlan: (id: string) => void;
  onHome: () => void;
  onOpenPensum: () => void;
}) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [semester, setSemester] = useState<SemesterFilterValue>(() => loadPersistedSemesterFilter());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [batchSize, setBatchSize] = useState(800);
  const [tab, setTab] = useState<'courses' | 'filters' | 'saved'>('courses');
  const [showDetail, setShowDetail] = useState(false);
  const [showReconcileReport, setShowReconcileReport] = useState(false);
  const [busyExport, setBusyExport] = useState<'pdf' | 'excel' | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'grid' | 'agenda'>('grid');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanName, setEditingPlanName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const resultsPanelRef = useRef<HTMLElement>(null);
  const calendarPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const catalog = catalogs.find(c => c.id === activeId) || initial;
  const reconciled = useMemo(() => reconcileCurriculumAndCatalog(catalog), [catalog]);
  const semesterCounts = useMemo(
    () => computeSemesterCounts(reconciled.items),
    [reconciled.items]
  );
  const filteredItems = useMemo(
    () => filterReconciledItems(reconciled.items, { semester, search }),
    [reconciled.items, semester, search]
  );

  const selectedChoiceCodes = useMemo(() => new Set(choices.map(c => c.code)), [choices]);
  const selectedReconciledItems = useMemo(
    () =>
      choices
        .map(
          c =>
            reconciled.byOfferingCode.get(c.code) ||
            (c.curriculumCode
              ? reconciled.byCurriculumCode.get(c.curriculumCode)
              : reconciled.byCurriculumCode.get(c.code))
        )
        .filter((x): x is ReconciledCatalogItem => Boolean(x)),
    [choices, reconciled]
  );

  const unofferedSelectedItems = useMemo(
    () => selectedReconciledItems.filter(item => !item.offering || item.offering.groups.length === 0),
    [selectedReconciledItems]
  );

  const offeredChoices = useMemo(
    () =>
      choices.filter(c => {
        const recItem =
          reconciled.byOfferingCode.get(c.code) ||
          (c.curriculumCode
            ? reconciled.byCurriculumCode.get(c.curriculumCode)
            : reconciled.byCurriculumCode.get(c.code));
        return Boolean(recItem?.offering && recItem.offering.groups.length > 0);
      }),
    [choices, reconciled]
  );

  const selected = useMemo(
    () =>
      offeredChoices
        .map(x => catalog.subjects.find(s => s.code === x.code))
        .filter((s): s is Subject => Boolean(s)),
    [offeredChoices, catalog.subjects]
  );

  const computed = useMemo(
    () =>
      generateSchedules(catalog, offeredChoices, prefs, {
        limit: batchSize,
        maxVisited: Math.max(450_000, batchSize * 250),
      }),
    [catalog, offeredChoices, prefs, batchSize]
  );

  const conflictMessages = useMemo(
    () =>
      offeredChoices.length > 1 && !computed.infeasible && computed.schedules.length === 0
        ? describeConflicts(catalog, offeredChoices, prefs)
        : [],
    [catalog, offeredChoices, prefs, computed.infeasible, computed.schedules.length]
  );

  const pageCount = Math.max(1, Math.ceil(computed.schedules.length / 10));
  const displayed = computed.schedules.slice(page * 10, page * 10 + 10);
  const current = computed.schedules[page * 10] || null;
  const [selectedResult, setSelectedResult] = useState(0);
  const activeSchedule = computed.schedules[selectedResult] || current;
  const activeOptionIndex = useMemo(() => {
    if (!activeSchedule) return 0;
    const idx = computed.schedules.findIndex(s => s.key === activeSchedule.key);
    return idx >= 0 ? idx : selectedResult;
  }, [activeSchedule, computed.schedules, selectedResult]);

  function selectScheduleIndex(nextIdx: number) {
    if (computed.schedules.length === 0) return;
    const clamped = Math.max(0, Math.min(computed.schedules.length - 1, nextIdx));
    setSelectedResult(clamped);
    setPage(Math.floor(clamped / 10));
    setShowDetail(false);
  }

  useEffect(() => {
    const onArrowNav = (e: KeyboardEvent) => {
      if (computed.schedules.length <= 1) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        if (el.getAttribute('role') === 'tab' || el.closest('[role="toolbar"]')) return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectScheduleIndex((activeOptionIndex + 1) % computed.schedules.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectScheduleIndex(
          (activeOptionIndex - 1 + computed.schedules.length) % computed.schedules.length
        );
      }
    };
    window.addEventListener('keydown', onArrowNav);
    return () => window.removeEventListener('keydown', onArrowNav);
  }, [activeOptionIndex, computed.schedules.length]);

  const activePrefCount = useMemo(
    () =>
      (prefs.mode !== DEFAULT_PREFERENCES.mode ? 1 : 0) +
      (prefs.earliest !== DEFAULT_PREFERENCES.earliest ||
      prefs.latest !== DEFAULT_PREFERENCES.latest
        ? 1
        : 0) +
      (prefs.freeDays.length > 0 ? 1 : 0) +
      (prefs.campusOnly !== DEFAULT_PREFERENCES.campusOnly ? 1 : 0) +
      (prefs.allowUnknown !== DEFAULT_PREFERENCES.allowUnknown ? 1 : 0),
    [prefs]
  );

  const pinnedByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of offeredChoices) {
      if (c.pinnedGroup) map.set(c.code, c.pinnedGroup);
    }
    return map;
  }, [offeredChoices]);

  function handleTogglePinFromCalendar(
    subjectCode: string,
    groupId: string,
    subjectName: string,
    groupLabel: string
  ) {
    const found = offeredChoices.find(c => c.code === subjectCode);
    if (!found) return;
    const isAlreadyPinned = found.pinnedGroup === groupId;
    onUpdateChoice({
      ...found,
      pinnedGroup: isAlreadyPinned ? undefined : groupId,
    });
    setMessage(
      isAlreadyPinned
        ? `Se liberó el Grupo ${groupLabel} de ${subjectName}.`
        : `Grupo ${groupLabel} de ${subjectName} fijado en tu selección.`
    );
  }

  useEffect(() => {
    setPage(0);
    setSelectedResult(0);
    setBatchSize(800);
  }, [activeId, offeredChoices, prefs]);

  const activePlanChanges = saved.filter(p => p.catalogId !== activeId).length;
  const unknownCount = catalog.subjects.reduce(
    (n, s) => n + s.groups.filter(g => g.teacherSource !== 'confirmed').length,
    0
  );
  const hasActiveFilters = semester !== 'all' || search.trim().length > 0;

  function handleSemesterChange(next: SemesterFilterValue) {
    setSemester(next);
    persistSemesterFilter(next);
  }

  function clearCatalogFilters() {
    setSemester('all');
    setSearch('');
    persistSemesterFilter('all');
  }

  async function saveCurrent() {
    if (!activeSchedule) return;
    const optionIndex = computed.schedules.findIndex(s => s.key === activeSchedule.key);
    const optNum = optionIndex >= 0 ? optionIndex + 1 : selectedResult + 1;
    const timeRange = `${formatHour(activeSchedule.earliest)}–${formatHour(activeSchedule.latest)}`;
    const name = `Mi horario ${catalog.term} · Opción ${optNum} (${timeRange}) · ${new Date().toLocaleDateString('es-CO')}`;
    const plan: SavedPlan = {
      id: crypto.randomUUID(),
      name,
      catalogId: catalog.id,
      createdAt: Date.now(),
      items: activeSchedule.groups.map(x => {
        const recItem = reconciled.byOfferingCode.get(x.code);
        return {
          code: x.code,
          groupId: x.group.id,
          curriculumCode: recItem?.kind === 'curriculum' ? recItem.curriculumCode : undefined,
        };
      }),
    };
    await onSavePlan(plan);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2200);
  }

  async function exportCurrent(kind: 'pdf' | 'excel') {
    if (!activeSchedule) return;
    setBusyExport(kind);
    try {
      if (kind === 'pdf') await exportPdf(activeSchedule, catalog);
      else await exportExcel(activeSchedule, catalog);
    } catch (e) {
      setMessage('No se pudo generar el archivo: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusyExport(null);
    }
  }

  const unknownSelected =
    activeSchedule?.groups.filter(x => x.group.teacherSource !== 'confirmed').length || 0;
  const reduceMotion = useReducedMotion();

  return (
    <ClickSpark
      className="planner-spark"
      style={{ height: 'auto' }}
      sparkColor="#2554d8"
      sparkSize={7}
      sparkRadius={16}
      sparkCount={6}
      sparkWidth={1.5}
      duration={360}
      disabled={!!reduceMotion}
    >
      <div className="planner">
        <header className="planner-header">
          <div className="planner-brand">
            <Logo onClick={onHome} />
            <span className="header-divider" />
            <span className="planner-header-label">Espacio de planificación</span>
          </div>
          <div className="planner-header-right">
            <span className="catalog-header-tag">
              <span /> {catalog.term}
            </span>
            <button type="button" className="header-home" onClick={onOpenPensum}>
              <GraduationCap size={16} /> Mi pensum
            </button>
            <button type="button" className="header-home" onClick={onHome}>
              <ArrowLeft size={16} /> Volver al inicio
            </button>
            <ImportDialog
              active={catalog}
              onImport={onImportCatalog}
              triggerClass="btn-primary small"
            />
          </div>
        </header>

        <div className="planner-body">
          <aside className="side-panel" aria-label="Materias disponibles">
            <div className="side-title">
              <div>
                <div className="eyebrow">PASO 01</div>
                <h2>Mis asignaturas</h2>
                <p>Selecciona las que quieres cursar.</p>
              </div>
              <div className="selected-number">{choices.length}</div>
            </div>
            <label className="sidebar-search">
              <Search size={17} />
              <input
                ref={searchInputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar materia, código o docente"
                aria-label="Buscar materia o docente"
              />
              {search ? (
                <button
                  type="button"
                  className="sidebar-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Borrar búsqueda"
                >
                  <X size={14} />
                </button>
              ) : (
                <span>⌘ K</span>
              )}
            </label>
            <SemesterFilter
              value={semester}
              onChange={handleSemesterChange}
              counts={semesterCounts}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearCatalogFilters}
              catalogTerm={catalog.term}
            />
            <SelectedSubjectsSummary
              selectedItems={selectedReconciledItems}
              activeSemester={semester}
              onRemove={onRemoveChoice}
            />
            <div className="catalog-card">
              <small>CATÁLOGO ACADÉMICO · HORARIO {catalog.term}</small>
              <select
                aria-label="Elegir catálogo"
                value={catalog.id}
                onChange={e => onSelectCatalog(e.target.value)}
              >
                {catalogs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div>
                <span>{subjectCount(catalog)} en oferta</span>
                <span>·</span>
                <span>62 en pensum</span>
                <span>·</span>
                <span>{groupCount(catalog)} grupos</span>
              </div>
            </div>
            <SubjectCatalogList
              items={filteredItems}
              selectedChoiceCodes={selectedChoiceCodes}
              semester={semester}
              hasActiveFilters={hasActiveFilters}
              onToggle={onToggleItem}
              onSelectAllSemesters={() => handleSemesterChange('all')}
              onClearFilters={clearCatalogFilters}
            />
            <div className="side-footer">
              <div className="privacy-small">
                <ShieldCheck size={17} />
                <span>
                  Privado y sin registro.
                  <small>Tus datos no salen de este navegador.</small>
                </span>
              </div>
            </div>
          </aside>

          <main className="planner-main">
            <div className="planner-welcome">
              <div>
                <div className="eyebrow">ORGANIZA TU SEMESTRE</div>
                <h1>
                  Construye tu horario <span>ideal.</span>
                </h1>
                <p>
                  Combina tus materias favoritas y encuentra la mejor forma de vivir tu semana.
                </p>
              </div>
              <div className="planner-header-stats">
                <button
                  type="button"
                  className="planner-stat-btn"
                  onClick={() => {
                    setTab('courses');
                    controlPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  title="Ir a materias elegidas"
                >
                  <strong>
                    <CountUp to={choices.length} duration={0.6} trigger="load" />
                  </strong>
                  <span>Materias</span>
                </button>
                <button
                  type="button"
                  className="planner-stat-btn"
                  onClick={() =>
                    resultsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  title="Ir a combinaciones disponibles"
                >
                  <strong>
                    <CountUp
                      to={computed.schedules.length}
                      suffix={computed.truncated ? '+' : ''}
                      duration={0.6}
                      trigger="load"
                    />
                  </strong>
                  <span>Opciones</span>
                </button>
                <button
                  type="button"
                  className="planner-stat-btn"
                  onClick={() =>
                    calendarPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  title="Ir al calendario semanal"
                >
                  <strong>
                    <CountUp to={activeSchedule?.days || 0} duration={0.6} trigger="load" />
                  </strong>
                  <span>Días de clase</span>
                </button>
              </div>
            </div>

            {message && (
              <div className="notice-inline" role="status">
                <Info size={17} />
                <span>{message}</span>
                {message.includes('Propuesta guardada') && tab !== 'saved' && (
                  <button
                    type="button"
                    className="btn-outline small notice-inline-cta"
                    onClick={() => {
                      setTab('saved');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Ver guardados ({saved.length})
                  </button>
                )}
                <button
                  type="button"
                  className="notice-close-btn"
                  onClick={() => setMessage('')}
                  aria-label="Cerrar aviso"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {unofferedSelectedItems.length > 0 && (
              <div className="planner-unoffered-banner" role="alert">
                <AlertTriangle size={18} />
                <div className="planner-unoffered-banner-copy">
                  <strong>
                    Atención: {unofferedSelectedItems.length}{' '}
                    {unofferedSelectedItems.length === 1
                      ? 'materia elegida no tiene grupos publicados'
                      : 'materias elegidas no tienen grupos publicados'}{' '}
                    en {catalog.term}
                  </strong>
                  <p>
                    {unofferedSelectedItems
                      .map(i => `${i.curriculumCode} (${i.curriculumName})`)
                      .join(', ')}{' '}
                    permanece en tu selección curricular, pero no puede incluirse en la generación
                    de combinaciones hasta que existan grupos publicados.{' '}
                    {offeredChoices.length > 0
                      ? `Se están calculando horarios con las ${offeredChoices.length} materias con grupos disponibles.`
                      : 'Elige al menos una materia con grupos publicados para generar combinaciones.'}
                  </p>
                </div>
                <div className="planner-unoffered-banner-actions">
                  <button
                    type="button"
                    className="btn-outline small"
                    onClick={onOpenPensum}
                  >
                    Revisar en Mi pensum
                  </button>
                  <button
                    type="button"
                    className="btn-primary small"
                    onClick={onRemoveUnofferedChoices}
                  >
                    Quitar sin grupos
                  </button>
                </div>
              </div>
            )}

            <div
              className="page-tabs"
              role="tablist"
              aria-label="Secciones del planificador"
              ref={controlPanelRef}
            >
              <button
                role="tab"
                aria-selected={tab === 'courses'}
                className={tab === 'courses' ? 'active' : ''}
                onClick={() => setTab('courses')}
              >
                <BookOpen size={16} /> Asignaturas <span>{choices.length}</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === 'filters'}
                className={tab === 'filters' ? 'active' : ''}
                onClick={() => setTab('filters')}
              >
                <ListFilter size={16} /> Preferencias{' '}
                {activePrefCount > 0 && <span>{activePrefCount}</span>}
              </button>
              <button
                role="tab"
                aria-selected={tab === 'saved'}
                className={tab === 'saved' ? 'active' : ''}
                onClick={() => setTab('saved')}
              >
                <Heart size={16} /> Guardados <span>{saved.length}</span>
              </button>
            </div>

            {tab === 'courses' && (
              <section className="panel control-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Materias elegidas</h2>
                    <p>
                      Define qué profesores o grupos prefieres. Si no estableces filtros,
                      incluiremos todas las opciones posibles.
                    </p>
                  </div>
                  <div className="panel-heading-actions">
                    {choices.length > 0 && (
                      <button
                        type="button"
                        className="btn-outline small"
                        onClick={onClearAllChoices}
                      >
                        <Trash2 size={14} /> Limpiar selección
                      </button>
                    )}
                    <div className="section-bubble">
                      <Users size={17} />
                    </div>
                  </div>
                </div>
                {selected.length === 0 ? (
                  <div className="selection-empty">
                    <div className="selection-illustration">
                      <BookOpen size={28} />
                    </div>
                    <h3>Empieza seleccionando materias</h3>
                    <p>
                      Escoge asignaturas desde la lista de la izquierda o explora la malla completa
                      en «Mi pensum».
                    </p>
                    <button
                      type="button"
                      className="btn-outline small"
                      onClick={onOpenPensum}
                    >
                      <GraduationCap size={15} /> Ir a Mi pensum
                    </button>
                  </div>
                ) : (
                  <div className="choice-grid">
                    {selected.map(s => (
                      <TeacherControls
                        key={s.code}
                        subject={s}
                        choice={offeredChoices.find(x => x.code === s.code)!}
                        onChange={onUpdateChoice}
                        onRemove={() => onRemoveChoice(s.code)}
                        prefs={prefs}
                        catalog={catalog}
                        choices={offeredChoices}
                        curriculumItem={reconciled.byOfferingCode.get(s.code)}
                      />
                    ))}
                  </div>
                )}
                {selected.length > 0 && (
                  <button className="inline-go" onClick={() => setTab('filters')}>
                    Personalizar preferencias de horario <ArrowRight size={16} />
                  </button>
                )}
              </section>
            )}

            {tab === 'filters' && (
              <section className="panel control-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Tu semana, tus reglas</h2>
                    <p>
                      Las restricciones son obligatorias; la prioridad elegida solo ordena
                      resultados válidos.
                    </p>
                  </div>
                  <div className="panel-heading-actions">
                    {activePrefCount > 0 && (
                      <button
                        type="button"
                        className="btn-outline small"
                        onClick={() => setPrefs(DEFAULT_PREFERENCES)}
                      >
                        <RotateCcw size={14} /> Restablecer reglas
                      </button>
                    )}
                    <div className="section-bubble">
                      <ListFilter size={17} />
                    </div>
                  </div>
                </div>
                <div className="preference-grid">
                  <div className="pref-block">
                    <label className="field-label" htmlFor="sort-mode">
                      Priorizar horarios
                    </label>
                    <select
                      className="field"
                      id="sort-mode"
                      value={prefs.mode}
                      onChange={e =>
                        setPrefs(p => ({
                          ...p,
                          mode: e.target.value as Preferences['mode'],
                        }))
                      }
                    >
                      <option value="compact">Menos huecos entre clases</option>
                      <option value="morning">Terminar temprano</option>
                      <option value="afternoon">Empezar tarde</option>
                      <option value="freeDays">Menos días de asistencia</option>
                    </select>
                  </div>
                  <div className="pref-block">
                    <label className="field-label">Franja mínima y máxima</label>
                    <div className="time-pair">
                      <select
                        aria-label="Hora de entrada mínima"
                        value={prefs.earliest}
                        onChange={e =>
                          setPrefs(p => ({ ...p, earliest: Number(e.target.value) }))
                        }
                      >
                        {Array.from({ length: 17 }, (_, i) => 360 + i * 60).map(n => (
                          <option key={n} value={n}>
                            {formatHour(n)}
                          </option>
                        ))}
                      </select>
                      <span>a</span>
                      <select
                        aria-label="Hora de salida máxima"
                        value={prefs.latest}
                        onChange={e =>
                          setPrefs(p => ({ ...p, latest: Number(e.target.value) }))
                        }
                      >
                        {Array.from({ length: 16 }, (_, i) => 420 + i * 60).map(n => (
                          <option key={n} value={n}>
                            {formatHour(n)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="pref-block">
                  <label className="field-label">Días que quieres dejar libres</label>
                  <div className="days-choice">
                    {DAY_NAMES.map((d, i) => (
                      <button
                        key={d}
                        aria-pressed={prefs.freeDays.includes(i)}
                        className={prefs.freeDays.includes(i) ? 'active' : ''}
                        onClick={() =>
                          setPrefs(p => ({
                            ...p,
                            freeDays: p.freeDays.includes(i)
                              ? p.freeDays.filter(x => x !== i)
                              : [...p.freeDays, i],
                          }))
                        }
                      >
                        {d.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="switch-stack">
                  <label className="toggle-row">
                    <span>
                      <strong>Priorizar sede principal</strong>
                      <small>
                        Excluir grupos Banco, Plato, El Copey y virtuales del generador.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.campusOnly}
                      onChange={e =>
                        setPrefs(p => ({ ...p, campusOnly: e.target.checked }))
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <span>
                      <strong>Aceptar grupos sin docente</strong>
                      <small>
                        Incluye grupos con profesores pendientes de publicación.
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={prefs.allowUnknown}
                      onChange={e =>
                        setPrefs(p => ({ ...p, allowUnknown: e.target.checked }))
                      }
                    />
                  </label>
                </div>
                <button className="inline-go" onClick={() => setTab('courses')}>
                  Volver a mis materias <ArrowRight size={16} />
                </button>
              </section>
            )}

            {tab === 'saved' && (
              <section className="panel control-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Horarios guardados</h2>
                    <p>
                      Tus propuestas se almacenan en este dispositivo. Los horarios de semestres
                      anteriores no se actualizan automáticamente.
                    </p>
                  </div>
                  <div className="section-bubble">
                    <Heart size={18} />
                  </div>
                </div>
                {saved.length ? (
                  <div className="saved-list">
                    {saved.map(p => {
                      const groupPills = p.items
                        .map(item => {
                          const code = item.curriculumCode || item.code;
                          const grp =
                            item.groupId.split('::')[1]?.split('-')[0]?.trim() || item.groupId;
                          return `${code}(${grp})`;
                        })
                        .join(' · ');
                      const isEditing = editingPlanId === p.id;
                      return (
                        <div key={p.id} className="saved-item">
                          <span className="saved-icon">
                            <CalendarDays size={18} />
                          </span>
                          <div className="saved-item-body">
                            {isEditing ? (
                              <form
                                className="saved-rename-form"
                                onSubmit={e => {
                                  e.preventDefault();
                                  const trimmed = editingPlanName.trim();
                                  if (trimmed) {
                                    void onRenameSavedPlan(p.id, trimmed);
                                  }
                                  setEditingPlanId(null);
                                }}
                              >
                                <input
                                  type="text"
                                  className="saved-rename-input"
                                  value={editingPlanName}
                                  onChange={e => setEditingPlanName(e.target.value)}
                                  aria-label="Nuevo nombre del horario guardado"
                                  autoFocus
                                />
                                <button type="submit" className="btn-primary small">
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  className="btn-outline small"
                                  onClick={() => setEditingPlanId(null)}
                                >
                                  Cancelar
                                </button>
                              </form>
                            ) : (
                              <strong>{p.name}</strong>
                            )}
                            <small>
                              {p.items.length} materias ·{' '}
                              {catalogs.find(c => c.id === p.catalogId)?.label ||
                                'Catálogo no disponible'}
                              {p.catalogId !== activeId ? ' · Otro catálogo' : ''}
                            </small>
                            {groupPills && (
                              <small className="saved-groups-summary">{groupPills}</small>
                            )}
                          </div>
                          {!isEditing && (
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Renombrar ${p.name}`}
                              title="Cambiar nombre"
                              onClick={() => {
                                setEditingPlanId(p.id);
                                setEditingPlanName(p.name);
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          <button
                            className="btn-outline small"
                            onClick={() => {
                              onLoadSavedPlan(p);
                              setTab('courses');
                              window.setTimeout(() => {
                                calendarPanelRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                });
                              }, 80);
                            }}
                          >
                            Abrir
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Eliminar ${p.name}`}
                            onClick={() => onDeleteSavedPlan(p.id)}
                          >
                            <X size={17} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="selection-empty">
                    <Heart size={28} />
                    <h3>Aún no tienes favoritos</h3>
                    <p>Guarda un horario desde el calendario y lo encontrarás aquí.</p>
                  </div>
                )}
              </section>
            )}

            <section className="panel results-panel" ref={resultsPanelRef}>
              <div className="results-heading">
                <div>
                  <div className="eyebrow">EXPLORA TUS OPCIONES</div>
                  <h2>Combinaciones disponibles</h2>
                  <p>
                    {offeredChoices.length === 0
                      ? 'Selecciona materias con grupos publicados para explorar posibles horarios.'
                      : computed.infeasible
                        ? 'No encontramos grupos que cumplan todas tus restricciones.'
                        : computed.schedules.length
                          ? `${computed.schedules.length} combinaciones encontradas${computed.truncated ? ' en esta búsqueda (hay más por explorar)' : ''}. Selecciona una para verla abajo en el calendario.`
                          : 'No existen combinaciones sin cruces con las reglas actuales.'}
                  </p>
                </div>
                {computed.schedules.length > 0 && (
                  <div className="results-heading-actions">
                    <span className="result-count">
                      <CountUp
                        to={computed.schedules.length}
                        suffix={`${computed.truncated ? '+' : ''} resultados`}
                        duration={0.6}
                        trigger="load"
                      />
                    </span>
                    <button
                      type="button"
                      className="btn-outline small"
                      onClick={() =>
                        calendarPanelRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        })
                      }
                    >
                      <CalendarDays size={15} /> Ir al calendario
                    </button>
                  </div>
                )}
              </div>
              {computed.infeasible && (
                <div className="tiny-alert-box">
                  <p className="tiny-alert">
                    Revisa las materias {computed.problemSubjects.join(', ')}. Ningún grupo
                    satisface los filtros actuales.
                  </p>
                  {activePrefCount > 0 && (
                    <div className="tiny-alert-actions">
                      <button
                        type="button"
                        className="btn-outline small"
                        onClick={() => setPrefs(DEFAULT_PREFERENCES)}
                      >
                        <RotateCcw size={14} /> Restablecer preferencias ({activePrefCount})
                      </button>
                      <button
                        type="button"
                        className="btn-outline small"
                        onClick={() => {
                          setTab('filters');
                          controlPanelRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                        }}
                      >
                        <ListFilter size={14} /> Ajustar preferencias
                      </button>
                    </div>
                  )}
                </div>
              )}
              {conflictMessages.length > 0 && (
                <div className="tiny-alert-box" role="alert">
                  <div className="tiny-alert">
                    <strong>Cruce de horario detectado:</strong> {conflictMessages.join(' ')}
                  </div>
                  {activePrefCount > 0 && (
                    <div className="tiny-alert-actions">
                      <button
                        type="button"
                        className="btn-outline small"
                        onClick={() => setPrefs(DEFAULT_PREFERENCES)}
                      >
                        <RotateCcw size={14} /> Restablecer preferencias ({activePrefCount})
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="result-list">
                {displayed.map((result, i) => {
                  const index = page * 10 + i;
                  const groupSummary = result.groups
                    .map(g => `${g.code}(${g.group.label.split('-')[0].trim()})`)
                    .join(' · ');
                  return (
                    <button
                      className={
                        'result-item' + (activeSchedule?.key === result.key ? ' active' : '')
                      }
                      key={result.key}
                      onClick={() => {
                        setSelectedResult(index);
                        setShowDetail(false);
                      }}
                      aria-pressed={activeSchedule?.key === result.key}
                    >
                      <span className="result-num">{String(index + 1).padStart(2, '0')}</span>
                      <span className="result-info">
                        <strong>Opción {index + 1}</strong>
                        <small>
                          {result.groups.length} materias · {result.days} días de clase ·{' '}
                          {Math.round((result.gaps / 60) * 10) / 10} h de huecos
                        </small>
                        <small className="result-groups-summary">{groupSummary}</small>
                      </span>
                      <span className="result-time">
                        <Clock3 size={14} />
                        {formatHour(result.earliest)}–{formatHour(result.latest)}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  );
                })}
              </div>
              {computed.schedules.length > 0 && (
                <div className="results-footer">
                  <div className="page-controls">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage(x => Math.max(0, x - 1))}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>
                      Página {page + 1} de {pageCount}
                    </span>
                    <button
                      disabled={page >= pageCount - 1}
                      onClick={() => setPage(x => Math.min(pageCount - 1, x + 1))}
                      aria-label="Página siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  {computed.truncated && (
                    <button
                      className="btn-outline small"
                      onClick={() => setBatchSize(x => Math.min(20000, x + 1000))}
                      disabled={batchSize >= 20000}
                    >
                      Explorar más <ArrowRight size={15} />
                    </button>
                  )}
                  <button className="link-btn" onClick={() => setShowDetail(x => !x)}>
                    {showDetail ? 'Ocultar' : 'Ver'} detalle del horario elegido{' '}
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
              {showDetail && activeSchedule && (
                <div className="schedule-detail">
                  {activeSchedule.groups.map(x => {
                    const recItem = reconciled.byOfferingCode.get(x.code);
                    return (
                      <div key={x.code}>
                        <div className="detail-name">
                          <strong>
                            {recItem && recItem.curriculumCode !== x.code
                              ? `${recItem.curriculumCode} (${x.code})`
                              : x.code}{' '}
                            · {recItem ? recItem.curriculumName : x.name}
                          </strong>
                          <span className={'status ' + badges[x.group.teacherSource]}>
                            {sourceText(x.group.teacherSource)}
                          </span>
                        </div>
                        <p>
                          {x.group.label} · {x.group.teacher || 'Docente por confirmar'}{' '}
                          {x.group.inferredFrom && `· Basado en ${x.group.inferredFrom}`}
                        </p>
                        {x.group.sessions.map((s, i) => (
                          <small key={i}>
                            {DAY_NAMES[s.day]}, {formatHour(s.start)}–{formatHour(s.end)} · {s.room}
                          </small>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="panel calendar-panel" ref={calendarPanelRef}>
              <div className="calendar-toolbar">
                <div className="toolbar-title">
                  <span className="section-bubble blue">
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <h2>Tu calendario semanal</h2>
                    <p>
                      {activeSchedule
                        ? `Opción ${activeOptionIndex + 1} · ${activeSchedule.days} días con clase · ${Math.round((activeSchedule.gaps / 60) * 10) / 10} horas libres entre clases`
                        : 'Una vista clara de tu semana, de lunes a domingo'}
                    </p>
                  </div>
                </div>
                <div className="toolbar-actions">
                  <button
                    disabled={!activeSchedule}
                    onClick={() => {
                      void saveCurrent();
                    }}
                    className={'btn-outline small' + (justSaved ? ' saved-pulse' : '')}
                    aria-label="Guardar horario actual"
                  >
                    {justSaved ? (
                      <>
                        <Check size={15} /> Guardado
                      </>
                    ) : (
                      <>
                        <Heart size={15} /> Guardar
                      </>
                    )}
                  </button>
                  <button
                    disabled={!activeSchedule || !!busyExport}
                    className="btn-outline small"
                    onClick={() => {
                      void exportCurrent('excel');
                    }}
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                  <button
                    disabled={!activeSchedule || !!busyExport}
                    className="btn-primary small"
                    onClick={() => {
                      void exportCurrent('pdf');
                    }}
                  >
                    <FileDown size={15} /> PDF
                  </button>
                </div>
              </div>
              {activeSchedule && computed.schedules.length > 0 && (
                <div className="calendar-subtoolbar">
                  <div className="calendar-option-stepper">
                    <button
                      type="button"
                      className="btn-outline small"
                      disabled={activeOptionIndex <= 0}
                      onClick={() => selectScheduleIndex(activeOptionIndex - 1)}
                      aria-label="Opción de horario anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="calendar-option-indicator">
                      <strong>
                        Opción {activeOptionIndex + 1} de {computed.schedules.length}
                      </strong>
                      <small>
                        {formatHour(activeSchedule.earliest)}–{formatHour(activeSchedule.latest)}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="btn-outline small"
                      disabled={activeOptionIndex >= computed.schedules.length - 1}
                      onClick={() => selectScheduleIndex(activeOptionIndex + 1)}
                      aria-label="Siguiente opción de horario"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div
                    className="calendar-view-toggle"
                    role="group"
                    aria-label="Modo de visualización del calendario"
                  >
                    <button
                      type="button"
                      className={'calendar-view-btn' + (calendarViewMode === 'grid' ? ' active' : '')}
                      aria-pressed={calendarViewMode === 'grid'}
                      onClick={() => setCalendarViewMode('grid')}
                    >
                      <LayoutGrid size={14} />
                      <span>Cuadrícula</span>
                    </button>
                    <button
                      type="button"
                      className={
                        'calendar-view-btn' + (calendarViewMode === 'agenda' ? ' active' : '')
                      }
                      aria-pressed={calendarViewMode === 'agenda'}
                      onClick={() => setCalendarViewMode('agenda')}
                    >
                      <List size={14} />
                      <span>Agenda por día</span>
                    </button>
                  </div>
                </div>
              )}
              {unknownSelected > 0 && (
                <div className="estimate-banner">
                  <Info size={16} />
                  <span>
                    Este horario incluye {unknownSelected}{' '}
                    {unknownSelected === 1
                      ? 'materia con docente estimado o pendiente'
                      : 'materias con docentes estimados o pendientes'}
                    . Verifica la asignación oficial antes de matricularte.
                  </span>
                </div>
              )}
              <WeeklyCalendar
                schedule={activeSchedule}
                viewMode={calendarViewMode}
                pinnedByCode={pinnedByCode}
                onTogglePinGroup={handleTogglePinFromCalendar}
              />
              <div className="calendar-foot">
                <span>
                  <span className="legend-dot blue-dot" /> Clases seleccionadas
                </span>
                <span>
                  <span className="legend-dot mint-dot" /> Clic en un bloque para fijar su grupo 📌
                </span>
                <span>
                  <span className="legend-dot orange-dot" /> Profesores por verificar en detalles
                </span>
              </div>
            </section>

            <div className="catalog-extra">
              <div>
                <Info size={17} />
                <span>
                  Catálogo {catalog.term}. {unknownCount} grupos tienen docentes estimados o
                  pendientes. Conciliación curricular: {semesterCounts.all.available}/62 materias
                  del pensum con grupos publicados.
                </span>
              </div>
              <div>
                <button className="link-btn" onClick={onOpenPensum}>
                  Abrir Mi pensum
                </button>
                {reconciled.incidents.length > 0 && (
                  <button
                    className="link-btn"
                    onClick={() => setShowReconcileReport(v => !v)}
                  >
                    {showReconcileReport ? 'Ocultar' : 'Ver'} divergencias (
                    {reconciled.incidents.length})
                  </button>
                )}
                <button className="link-btn" onClick={() => exportJson(catalog)}>
                  Respaldar JSON
                </button>
                <button className="link-btn" onClick={() => exportHtml(catalog)}>
                  Exportar HTML
                </button>
              </div>
            </div>

            {showReconcileReport && reconciled.incidents.length > 0 && (
              <section
                className="panel reconcile-report-panel"
                aria-label="Reporte de divergencias entre pensum y horario"
              >
                <div className="panel-heading">
                  <div>
                    <h2>Divergencias detectadas ({catalog.term})</h2>
                    <p>
                      Asignaturas con diferencias de código o fuera de las 62 materias del pensum
                      documentado.
                    </p>
                  </div>
                </div>
                <div className="reconcile-report-grid">
                  {reconciled.incidents.map((inc, idx) => (
                    <div key={idx} className="reconcile-incident-card">
                      <strong>
                        {inc.curriculumCode
                          ? `Pensum ${inc.curriculumCode} vs Horario ${inc.offeringCode}`
                          : `Horario ${inc.offeringCode}`}
                      </strong>
                      <span>
                        {inc.curriculumName
                          ? `${inc.curriculumName} (${inc.offeringName})`
                          : inc.offeringName}
                      </span>
                      <small>{inc.detail}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>

        <div className="mobile-selection-bar">
          <div className="mobile-selection-summary">
            <strong>{choices.length} materias</strong>
            <span>{computed.schedules.length} combinaciones</span>
          </div>
          <div className="mobile-selection-actions">
            <button
              type="button"
              className="btn-outline small"
              onClick={() => {
                setTab('filters');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Filtros <ListFilter size={14} />
            </button>
            <button
              type="button"
              className="btn-primary small"
              onClick={() =>
                resultsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              Ver horarios <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {activePlanChanges > 0 && (
          <div className="sr-only">
            {activePlanChanges} propuestas guardadas pertenecen a otras versiones del catálogo.
          </div>
        )}
      </div>
    </ClickSpark>
  );
}

function resolveViewFromLocation(): 'landing' | 'pensum' | 'planner' {
  if (typeof window === 'undefined') return 'landing';
  const hash = (window.location.hash || '').toLowerCase();
  const hasSemParam =
    new URLSearchParams(window.location.search).has('semestre') ||
    new URLSearchParams(window.location.search).has('semester');
  if (hash.startsWith('#pensum') || hash.startsWith('#/pensum') || hash.startsWith('#mi-pensum')) {
    return 'pensum';
  }
  if (
    hash.startsWith('#planificador') ||
    hash.startsWith('#/planificador') ||
    hasSemParam
  ) {
    return 'planner';
  }
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<'landing' | 'pensum' | 'planner'>(() =>
    resolveViewFromLocation()
  );
  const [catalogs, setCatalogs] = useState<Catalog[]>([initial]);
  const [activeId, setActiveId] = useState(initial.id);
  const [choices, setChoices] = useState<Choice[]>(() => loadCentralSelection(initial));
  const [saved, setSaved] = useState<SavedPlan[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    void Promise.all([loadCatalogs(), loadPlans()])
      .then(([stored, plans]) => {
        if (live) {
          setCatalogs([initial, ...stored.filter(c => c.id !== initial.id)]);
          setSaved(plans);
        }
      })
      .catch(() => {
        if (live) {
          setMessage(
            'No se pudo acceder al almacenamiento local; podrás seguir planificando en esta sesión.'
          );
        }
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    persistCentralSelection(choices);
  }, [choices]);

  useEffect(() => {
    const listener = () => {
      setView(resolveViewFromLocation());
    };
    window.addEventListener('hashchange', listener);
    window.addEventListener('popstate', listener);
    listener();
    return () => {
      window.removeEventListener('hashchange', listener);
      window.removeEventListener('popstate', listener);
    };
  }, []);

  const activeCatalog = catalogs.find(c => c.id === activeId) || initial;
  const activeReconciled = useMemo(
    () => reconcileCurriculumAndCatalog(activeCatalog),
    [activeCatalog]
  );

  function navigate(next: 'landing' | 'pensum' | 'planner') {
    window.location.hash =
      next === 'planner' ? 'planificador' : next === 'pensum' ? 'pensum' : '';
    setView(next);
    window.scrollTo({ top: 0 });
  }

  function handleToggleCourse(item: ReconciledCatalogItem) {
    const code = (item.choiceCode || item.curriculumCode).toUpperCase();
    setChoices(old =>
      old.some(x => x.code.toUpperCase() === code || x.curriculumCode?.toUpperCase() === code)
        ? old.filter(
            x => x.code.toUpperCase() !== code && x.curriculumCode?.toUpperCase() !== code
          )
        : [
            ...old,
            {
              code,
              curriculumCode: item.kind === 'curriculum' ? item.curriculumCode : undefined,
              teacherMode: 'any',
            },
          ]
    );
  }

  function handleRemoveCourse(code: string) {
    const clean = code.toUpperCase();
    setChoices(old =>
      old.filter(
        x => x.code.toUpperCase() !== clean && x.curriculumCode?.toUpperCase() !== clean
      )
    );
  }

  function handleClearAllCourses() {
    setChoices([]);
  }

  function handleRemoveUnofferedCourses() {
    setChoices(old =>
      old.filter(ch => {
        const recItem =
          activeReconciled.byOfferingCode.get(ch.code) ||
          (ch.curriculumCode
            ? activeReconciled.byCurriculumCode.get(ch.curriculumCode)
            : activeReconciled.byCurriculumCode.get(ch.code));
        return Boolean(recItem?.offering && recItem.offering.groups.length > 0);
      })
    );
  }

  function handleUpdateChoice(choice: Choice) {
    setChoices(cs => cs.map(c => (c.code === choice.code ? choice : c)));
  }

  function handleSelectCatalog(nextId: string) {
    const nextCat = catalogs.find(c => c.id === nextId);
    if (!nextCat) return;
    const { choices: reconciledChoices, warnings } = reconcileSelectionWithNewCatalog(
      choices,
      nextCat,
      activeCatalog
    );
    setActiveId(nextId);
    setChoices(reconciledChoices);
    if (warnings.length > 0) {
      setMessage(warnings.join(' '));
    }
  }

  function handleImportCatalog(c: Catalog) {
    const { choices: reconciledChoices, warnings } = reconcileSelectionWithNewCatalog(
      choices,
      c,
      activeCatalog
    );
    setCatalogs(old => [c, ...old.filter(x => x.id !== c.id)]);
    setActiveId(c.id);
    setChoices(reconciledChoices);
    const baseMsg = `Se cargó ${c.term}: ${subjectCount(c)} materias y ${groupCount(c)} grupos. Revisa las advertencias antes de matricular.`;
    setMessage(warnings.length > 0 ? `${baseMsg} ${warnings.join(' ')}` : baseMsg);
    void saveCatalog(c).catch(() =>
      setMessage('El catálogo se cargó, pero no pudo guardarse en este navegador.')
    );
  }

  async function handleSavePlan(plan: SavedPlan) {
    setSaved(s => [plan, ...s]);
    try {
      await savePlan(plan);
      setMessage('Propuesta guardada en este navegador.');
    } catch {
      setMessage('No fue posible conservar el horario en el almacenamiento local.');
    }
  }

  async function handleRenameSavedPlan(id: string, nextName: string) {
    const existing = saved.find(p => p.id === id);
    if (!existing) return;
    const updated: SavedPlan = { ...existing, name: nextName };
    setSaved(all => all.map(p => (p.id === id ? updated : p)));
    try {
      await savePlan(updated);
      setMessage('Nombre del horario actualizado.');
    } catch {
      setMessage('No fue posible actualizar el nombre en el almacenamiento local.');
    }
  }

  function handleLoadSavedPlan(plan: SavedPlan) {
    const c = catalogs.find(x => x.id === plan.catalogId);
    if (!c) {
      setMessage('La versión del catálogo usada por este horario no está disponible.');
      return;
    }
    const rec = reconcileCurriculumAndCatalog(c);
    setActiveId(c.id);
    setChoices(
      migrateChoicesForCatalog(
        plan.items.map(x => ({
          code: x.code,
          curriculumCode: x.curriculumCode,
          pinnedGroup: x.groupId,
        })),
        c,
        rec
      )
    );
    setMessage('Propuesta cargada. Verifica sus grupos y horarios antes de matricular.');
  }

  function handleDeleteSavedPlan(id: string) {
    setSaved(all => all.filter(x => x.id !== id));
    void deletePlan(id);
  }

  if (view === 'pensum') {
    return (
      <PensumPage
        catalog={activeCatalog}
        choices={choices}
        onToggleCourse={handleToggleCourse}
        onRemoveCourse={handleRemoveCourse}
        onClearAllCourses={handleClearAllCourses}
        onRemoveUnofferedCourses={handleRemoveUnofferedCourses}
        onHome={() => navigate('landing')}
        onOpenPlanner={() => navigate('planner')}
      />
    );
  }

  if (view === 'planner') {
    return (
      <Planner
        catalogs={catalogs}
        activeId={activeId}
        choices={choices}
        saved={saved}
        message={message}
        setMessage={setMessage}
        onSelectCatalog={handleSelectCatalog}
        onImportCatalog={handleImportCatalog}
        onToggleItem={handleToggleCourse}
        onRemoveChoice={handleRemoveCourse}
        onClearAllChoices={handleClearAllCourses}
        onUpdateChoice={handleUpdateChoice}
        onRemoveUnofferedChoices={handleRemoveUnofferedCourses}
        onSavePlan={handleSavePlan}
        onRenameSavedPlan={handleRenameSavedPlan}
        onLoadSavedPlan={handleLoadSavedPlan}
        onDeleteSavedPlan={handleDeleteSavedPlan}
        onHome={() => navigate('landing')}
        onOpenPensum={() => navigate('pensum')}
      />
    );
  }

  return (
    <Landing
      onStart={() => navigate('planner')}
      onOpenPensum={() => navigate('pensum')}
    />
  );
}
