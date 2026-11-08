import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  GraduationCap,
  Info,
  Layers3,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Catalog,
  Choice,
  PensumSelectionMode,
  ReconciledCatalogItem,
  RomanSemester,
  SemesterFilterValue,
  SemesterNumber,
} from '../lib/types';
import {
  CURRICULUM_INDEX,
  CURRICULUM_METADATA,
  ROMAN_SEMESTERS,
  SEMESTER_NUMBERS,
  computeSemesterCounts,
  describeCourseRequirements,
  filterReconciledItems,
  formatHoursValue,
  loadPersistedPensumMode,
  persistPensumMode,
  reconcileCurriculumAndCatalog,
} from '../lib/curriculum';
import { SHORT_DAYS, formatHour, normalizeName } from '../lib/types';

type PensumPageProps = {
  catalog: Catalog;
  choices: Choice[];
  onToggleCourse: (item: ReconciledCatalogItem) => void;
  onRemoveCourse: (code: string) => void;
  onClearAllCourses: () => void;
  onRemoveUnofferedCourses: () => void;
  onHome: () => void;
  onOpenPlanner: () => void;
};

export function PensumPage({
  catalog,
  choices,
  onToggleCourse,
  onRemoveCourse,
  onClearAllCourses,
  onRemoveUnofferedCourses,
  onHome,
  onOpenPlanner,
}: PensumPageProps) {
  const [mode, setMode] = useState<PensumSelectionMode>(() => loadPersistedPensumMode());
  const [activeSemester, setActiveSemester] = useState<SemesterNumber>(1);
  const [globalSemesterFilter, setGlobalSemesterFilter] = useState<SemesterFilterValue>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unoffered'>('all');
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showUnofferedGate, setShowUnofferedGate] = useState(false);
  const [mobileTrayOpen, setMobileTrayOpen] = useState(false);
  const [expandedCardCodes, setExpandedCardCodes] = useState<Set<string>>(() => new Set());
  const [allModePage, setAllModePage] = useState(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const semTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsMetaRef = useRef<HTMLDivElement>(null);

  function toggleCardGroups(code: string) {
    setExpandedCardCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && mobileTrayOpen) {
        setMobileTrayOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileTrayOpen]);

  const reconciled = useMemo(() => reconcileCurriculumAndCatalog(catalog), [catalog]);
  const semesterCounts = useMemo(
    () => computeSemesterCounts(reconciled.curriculumItems),
    [reconciled.curriculumItems]
  );

  const selectedCodes = useMemo(
    () => new Set(choices.map(c => (c.curriculumCode || c.code).toUpperCase())),
    [choices]
  );

  const selectedItems = useMemo(() => {
    const list: ReconciledCatalogItem[] = [];
    for (const ch of choices) {
      const code = (ch.curriculumCode || ch.code).toUpperCase();
      const found =
        reconciled.byCurriculumCode.get(code) || reconciled.byOfferingCode.get(ch.code.toUpperCase());
      if (found) list.push(found);
    }
    return list;
  }, [choices, reconciled]);

  const selectedBySemesterCount = useMemo(() => {
    const map: Record<SemesterNumber, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
    };
    for (const item of selectedItems) {
      if (item.semester) {
        map[item.semester] += 1;
      }
    }
    return map;
  }, [selectedItems]);

  const totalSelectedWeight = useMemo(
    () => selectedItems.reduce((sum, item) => sum + (item.academicWeight || item.credits || 0), 0),
    [selectedItems]
  );

  const offeredSelectedItems = useMemo(
    () => selectedItems.filter(item => item.offering && item.offering.groups.length > 0),
    [selectedItems]
  );

  const unofferedSelectedItems = useMemo(
    () => selectedItems.filter(item => !item.offering || item.offering.groups.length === 0),
    [selectedItems]
  );

  const effectiveSemesterFilter: SemesterFilterValue =
    mode === 'semester' ? (String(activeSemester) as SemesterFilterValue) : globalSemesterFilter;

  const visibleItems = useMemo(
    () =>
      filterReconciledItems(reconciled.curriculumItems, {
        semester: effectiveSemesterFilter,
        search,
        availability: mode === 'all' ? availabilityFilter : 'all',
      }),
    [reconciled.curriculumItems, effectiveSemesterFilter, search, mode, availabilityFilter]
  );

  const ALL_MODE_PAGE_SIZE = 8;
  const allModePageCount = Math.max(1, Math.ceil(visibleItems.length / ALL_MODE_PAGE_SIZE));
  const safeAllModePage = Math.min(allModePage, allModePageCount - 1);
  const displayedItems = useMemo(
    () =>
      mode === 'all'
        ? visibleItems.slice(
            safeAllModePage * ALL_MODE_PAGE_SIZE,
            (safeAllModePage + 1) * ALL_MODE_PAGE_SIZE
          )
        : visibleItems,
    [mode, visibleItems, safeAllModePage]
  );

  useEffect(() => {
    setAllModePage(0);
  }, [mode, search, availabilityFilter, globalSemesterFilter]);

  function handleSelectAllModePage(nextPage: number, shouldScroll = false) {
    const clamped = Math.max(0, Math.min(allModePageCount - 1, nextPage));
    setAllModePage(clamped);
    if (shouldScroll) {
      resultsMetaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderAllModePagination(position: 'top' | 'bottom') {
    if (mode !== 'all' || allModePageCount <= 1) return null;
    return (
      <nav
        className={`pensum-pagination pensum-pagination-${position}`}
        aria-label={
          position === 'top'
            ? 'Paginación superior de asignaturas en Todas las materias'
            : 'Paginación inferior de asignaturas en Todas las materias'
        }
      >
        <button
          type="button"
          className="btn-outline small pensum-page-nav-btn"
          disabled={safeAllModePage === 0}
          onClick={() => handleSelectAllModePage(safeAllModePage - 1, position === 'bottom')}
          aria-label="Página anterior de materias"
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <div className="pensum-pagination-pages" role="group" aria-label="Páginas">
          {Array.from({ length: allModePageCount }, (_, idx) => {
            const isCurrent = idx === safeAllModePage;
            return (
              <button
                key={idx}
                type="button"
                className={'pensum-page-num-btn' + (isCurrent ? ' active' : '')}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Ir a la página ${idx + 1} de ${allModePageCount}`}
                onClick={() => handleSelectAllModePage(idx, position === 'bottom')}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-outline small pensum-page-nav-btn"
          disabled={safeAllModePage >= allModePageCount - 1}
          onClick={() => handleSelectAllModePage(safeAllModePage + 1, position === 'bottom')}
          aria-label="Página siguiente de materias"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </nav>
    );
  }

  function handleModeChange(nextMode: PensumSelectionMode) {
    setMode(nextMode);
    persistPensumMode(nextMode);
    if (nextMode === 'all') {
      // Switching to "Todas las materias" never restricts global search to the previously viewed semester
      setGlobalSemesterFilter('all');
    }
  }

  function handleSemesterKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % SEMESTER_NUMBERS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + SEMESTER_NUMBERS.length) % SEMESTER_NUMBERS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = SEMESTER_NUMBERS.length - 1;
    }
    if (nextIndex >= 0) {
      e.preventDefault();
      const targetSem = SEMESTER_NUMBERS[nextIndex];
      setActiveSemester(targetSem);
      semTabRefs.current[nextIndex]?.focus();
    }
  }

  function handleToggle(item: ReconciledCatalogItem) {
    const wasSelected = selectedCodes.has(item.curriculumCode);
    onToggleCourse(item);
    setConfirmClear(false);
    if (wasSelected) {
      setLiveAnnouncement(`Quitada ${item.curriculumName} (${item.curriculumCode}) de tu selección.`);
    } else if (!item.offering || item.offering.groups.length === 0) {
      setLiveAnnouncement(
        `Agregada ${item.curriculumName} (${item.curriculumCode}). Atención: esta materia no tiene grupos publicados en ${catalog.term}.`
      );
    } else {
      setLiveAnnouncement(`Agregada ${item.curriculumName} (${item.curriculumCode}) a tu selección.`);
    }
  }

  function handleBuildScheduleClick() {
    if (unofferedSelectedItems.length > 0 && !showUnofferedGate) {
      setShowUnofferedGate(true);
      setMobileTrayOpen(true);
      return;
    }
    setShowUnofferedGate(false);
    onOpenPlanner();
  }

  function resetSearchAndFilters() {
    setSearch('');
    setAvailabilityFilter('all');
    setGlobalSemesterFilter('all');
  }

  const hasFiltersActive =
    search.trim().length > 0 ||
    (mode === 'all' && (availabilityFilter !== 'all' || globalSemesterFilter !== 'all'));

  const activeSemSummary = semesterCounts[String(activeSemester) as SemesterFilterValue];
  const activeSemOfferedItems = useMemo(
    () =>
      reconciled.curriculumItems.filter(
        item => item.semester === activeSemester && item.offering && item.offering.groups.length > 0
      ),
    [reconciled.curriculumItems, activeSemester]
  );
  const allActiveSemOfferedSelected =
    activeSemOfferedItems.length > 0 &&
    activeSemOfferedItems.every(item => selectedCodes.has(item.curriculumCode));

  function handleToggleEntireSemester() {
    if (allActiveSemOfferedSelected) {
      for (const item of activeSemOfferedItems) {
        if (selectedCodes.has(item.curriculumCode)) {
          onRemoveCourse(item.curriculumCode);
        }
      }
      setLiveAnnouncement(
        `Se quitaron las materias del Semestre ${ROMAN_SEMESTERS[activeSemester]} de tu selección.`
      );
    } else {
      let added = 0;
      for (const item of activeSemOfferedItems) {
        if (!selectedCodes.has(item.curriculumCode)) {
          onToggleCourse(item);
          added++;
        }
      }
      setLiveAnnouncement(
        `Se agregaron ${added} materias con grupos del Semestre ${ROMAN_SEMESTERS[activeSemester]}.`
      );
    }
  }

  function handleInspectPrerequisite(prereqCode: string) {
    const target = reconciled.byCurriculumCode.get(prereqCode.toUpperCase());
    if (mode === 'semester' && target?.semester) {
      setActiveSemester(target.semester);
      setSearch(prereqCode);
    } else {
      setGlobalSemesterFilter('all');
      setAvailabilityFilter('all');
      setSearch(prereqCode);
    }
    setLiveAnnouncement(`Filtrando prerrequisito ${prereqCode}.`);
  }

  return (
    <div className="pensum-page">
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      <header className="planner-header pensum-header">
        <div className="planner-brand">
          <button className="brand" onClick={onHome} aria-label="Traza - ir a inicio">
            <span className="brand-mark">
              <Layers3 size={22} strokeWidth={2.4} />
            </span>
            <span>
              traza<span className="brand-point">.</span>
            </span>
          </button>
          <span className="header-divider" />
          <span className="planner-header-label">Mi pensum · Ingeniería de Sistemas</span>
        </div>
        <div className="planner-header-right">
          <span className="catalog-header-tag">
            <span /> Horario {catalog.term}
          </span>
          <button type="button" className="header-home" onClick={onHome}>
            <ArrowLeft size={16} /> Volver al inicio
          </button>
          <button
            type="button"
            className="btn-primary small"
            onClick={handleBuildScheduleClick}
            aria-label={`Armar mi horario con ${selectedItems.length} materias seleccionadas`}
          >
            Armar mi horario ({selectedItems.length}) <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <div className="pensum-container">
        <section className="pensum-hero" aria-label="Resumen del programa académico">
          <div className="pensum-hero-copy">
            <div className="eyebrow">
              {CURRICULUM_METADATA.universidad.toUpperCase()} · {CURRICULUM_METADATA.programa} ·{' '}
              {CURRICULUM_METADATA.jornada}
            </div>
            <h1>
              Explora tu pensum, <span>elige tus materias.</span>
            </h1>
            <p>
              Consulta las asignaturas oficiales, revisa sus prerrequisitos explicados por nombre y
              arma una selección única sincronizada con el generador de horarios.
            </p>
          </div>
          <div className="pensum-metrics-grid">
            <div className="pensum-metric-card">
              <strong>{CURRICULUM_METADATA.totalAsignaturasDocumentadas}</strong>
              <span>Materias documentadas</span>
              <small>Períodos 1 al 9 detallados</small>
            </div>
            <div className="pensum-metric-card">
              <strong>{CURRICULUM_METADATA.totalPonderacionAcademicaDocumentada}</strong>
              <span>Ponderación académica</span>
              <small>Unidades usadas como créditos</small>
            </div>
            <div className="pensum-metric-card">
              <strong>9 / {CURRICULUM_METADATA.periodosDeclarados}</strong>
              <span>Períodos con detalle</span>
              <small>{CURRICULUM_METADATA.periodo10Note}</small>
            </div>
            <div className="pensum-metric-card">
              <strong>
                {semesterCounts.all.available} / {CURRICULUM_METADATA.totalAsignaturasDocumentadas}
              </strong>
              <span>Con grupos en {catalog.term}</span>
              <small>{semesterCounts.all.unoffered} sin grupos publicados</small>
            </div>
          </div>
        </section>

        <div className="pensum-workspace">
          <main className="pensum-catalog-column" aria-label="Catálogo curricular">
            <div className="pensum-controls-card">
              <div className="pensum-mode-bar">
                <div
                  className="pensum-mode-tabs"
                  role="tablist"
                  aria-label="Vía de selección del pensum"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'all'}
                    className={'pensum-mode-tab' + (mode === 'all' ? ' active' : '')}
                    onClick={() => handleModeChange('all')}
                  >
                    <BookOpen size={16} />
                    <span>Todas las materias</span>
                    <small>{CURRICULUM_METADATA.totalAsignaturasDocumentadas}</small>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'semester'}
                    className={'pensum-mode-tab' + (mode === 'semester' ? ' active' : '')}
                    onClick={() => handleModeChange('semester')}
                  >
                    <GraduationCap size={16} />
                    <span>Por semestre</span>
                    <small>I – IX</small>
                  </button>
                </div>

                {hasFiltersActive && (
                  <button
                    type="button"
                    className="clear-filters-btn"
                    onClick={resetSearchAndFilters}
                  >
                    <RotateCcw size={13} />
                    <span>Limpiar búsqueda y filtros</span>
                  </button>
                )}
              </div>

              <div className="pensum-search-row">
                <label className="pensum-search-input">
                  <Search size={18} />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={
                      mode === 'all'
                        ? 'Buscar en todas las materias por nombre, sin tildes o código (ej. electromagnetismo, FS400, SS301)...'
                        : `Buscar dentro del Semestre ${ROMAN_SEMESTERS[activeSemester]} por nombre o código...`
                    }
                    aria-label="Buscar materia en el pensum"
                  />
                  {search ? (
                    <button
                      type="button"
                      className="pensum-search-clear"
                      onClick={() => setSearch('')}
                      aria-label="Borrar texto de búsqueda"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <span className="search-kbd-hint" aria-hidden="true">
                      ⌘ K
                    </span>
                  )}
                </label>
              </div>

              {mode === 'all' ? (
                <div className="pensum-all-filters" aria-label="Filtros opcionales del catálogo global">
                  <div className="pensum-availability-pills" role="group" aria-label="Filtrar por disponibilidad de grupos">
                    <button
                      type="button"
                      aria-pressed={availabilityFilter === 'all'}
                      className={'pensum-filter-pill' + (availabilityFilter === 'all' ? ' active' : '')}
                      onClick={() => setAvailabilityFilter('all')}
                    >
                      Todas ({semesterCounts.all.total})
                    </button>
                    <button
                      type="button"
                      aria-pressed={availabilityFilter === 'available'}
                      className={
                        'pensum-filter-pill' + (availabilityFilter === 'available' ? ' active' : '')
                      }
                      onClick={() => setAvailabilityFilter('available')}
                    >
                      Con grupos publicados ({semesterCounts.all.available})
                    </button>
                    <button
                      type="button"
                      aria-pressed={availabilityFilter === 'unoffered'}
                      className={
                        'pensum-filter-pill' + (availabilityFilter === 'unoffered' ? ' active' : '')
                      }
                      onClick={() => setAvailabilityFilter('unoffered')}
                    >
                      Sin grupos publicados ({semesterCounts.all.unoffered})
                    </button>
                  </div>

                  <label className="pensum-optional-sem-select">
                    <Filter size={14} />
                    <span>Semestre:</span>
                    <select
                      aria-label="Filtro opcional de semestre en vista global"
                      value={globalSemesterFilter}
                      onChange={e => setGlobalSemesterFilter(e.target.value as SemesterFilterValue)}
                    >
                      <option value="all">Todos (I – IX)</option>
                      {SEMESTER_NUMBERS.map(num => (
                        <option key={num} value={String(num)}>
                          Semestre {ROMAN_SEMESTERS[num]} ({semesterCounts[String(num) as SemesterFilterValue].total})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="pensum-semester-nav" role="region" aria-label="Navegación por semestres I a IX">
                  <div className="pensum-semester-nav-top">
                    <span className="semester-filter-label">
                      SELECCIONA UN SEMESTRE DOCUMENTADO (I – IX)
                    </span>
                    <label className="pensum-mobile-sem-select">
                      <span className="sr-only">Elegir semestre</span>
                      <select
                        aria-label="Elegir semestre del pensum"
                        value={activeSemester}
                        onChange={e => setActiveSemester(Number(e.target.value) as SemesterNumber)}
                      >
                        {SEMESTER_NUMBERS.map(num => (
                          <option key={num} value={num}>
                            Semestre {ROMAN_SEMESTERS[num]} ({semesterCounts[String(num) as SemesterFilterValue].total} materias ·{' '}
                            {semesterCounts[String(num) as SemesterFilterValue].academicWeight} pond.)
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div
                    className="pensum-semester-tabs"
                    role="toolbar"
                    aria-label="Selector de semestre I a IX"
                  >
                    {SEMESTER_NUMBERS.map((num, idx) => {
                      const roman: RomanSemester = ROMAN_SEMESTERS[num];
                      const c = semesterCounts[String(num) as SemesterFilterValue];
                      const selCount = selectedBySemesterCount[num];
                      const isActive = activeSemester === num;
                      return (
                        <button
                          key={num}
                          ref={el => {
                            semTabRefs.current[idx] = el;
                          }}
                          type="button"
                          aria-pressed={isActive}
                          aria-label={`Semestre ${roman} (${c.total} materias, ${c.academicWeight} de ponderación académica${selCount > 0 ? `, ${selCount} seleccionadas` : ''})`}
                          className={'pensum-sem-tab' + (isActive ? ' active' : '')}
                          onClick={() => setActiveSemester(num)}
                          onKeyDown={e => handleSemesterKeyDown(e, idx)}
                        >
                          <div className="pensum-sem-tab-top">
                            <strong>Sem. {roman}</strong>
                            {selCount > 0 && (
                              <span className="pensum-sem-selected-badge" title={`${selCount} seleccionadas`}>
                                ✓ {selCount}
                              </span>
                            )}
                          </div>
                          <small>
                            {c.total} mat. · {c.academicWeight} pond.
                          </small>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pensum-active-sem-banner" aria-live="polite">
                    <div>
                      <strong>
                        Período {activeSemester} — Semestre {ROMAN_SEMESTERS[activeSemester]}:
                      </strong>{' '}
                      {activeSemSummary.total} asignaturas · {activeSemSummary.academicWeight} de
                      ponderación académica · {activeSemSummary.available} con grupos en {catalog.term}
                      {selectedBySemesterCount[activeSemester] > 0
                        ? ` · ${selectedBySemesterCount[activeSemester]} en tu selección`
                        : ''}
                    </div>
                    <div className="pensum-active-sem-actions">
                      {activeSemOfferedItems.length > 0 && (
                        <button
                          type="button"
                          className="btn-outline small pensum-batch-sem-btn"
                          onClick={handleToggleEntireSemester}
                        >
                          {allActiveSemOfferedSelected ? (
                            <>
                              <X size={14} /> Quitar Sem. {ROMAN_SEMESTERS[activeSemester]}
                            </>
                          ) : (
                            <>
                              <Check size={14} /> Seleccionar disponibles ({activeSemOfferedItems.length})
                            </>
                          )}
                        </button>
                      )}
                      <small className="period-10-discrete-note">
                        <Info size={13} /> {CURRICULUM_METADATA.periodo10Note} (la consulta declara{' '}
                        {CURRICULUM_METADATA.periodosDeclarados} períodos, con detalle en 1–9).
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pensum-results-meta" ref={resultsMetaRef}>
              <span>
                {mode === 'all' && visibleItems.length > 0 ? (
                  <>
                    Mostrando{' '}
                    <strong>
                      {safeAllModePage * ALL_MODE_PAGE_SIZE + 1}–
                      {Math.min(visibleItems.length, (safeAllModePage + 1) * ALL_MODE_PAGE_SIZE)}
                    </strong>{' '}
                    de <strong>{visibleItems.length}</strong>{' '}
                    {visibleItems.length === 1 ? 'asignatura' : 'asignaturas'}
                    {globalSemesterFilter !== 'all'
                      ? ` del Semestre ${ROMAN_SEMESTERS[Number(globalSemesterFilter) as SemesterNumber]}`
                      : ' del pensum documentado (I–IX)'}
                  </>
                ) : (
                  <>
                    Mostrando <strong>{visibleItems.length}</strong>{' '}
                    {visibleItems.length === 1 ? 'asignatura' : 'asignaturas'}
                    {mode === 'semester'
                      ? ` del Semestre ${ROMAN_SEMESTERS[activeSemester]}`
                      : globalSemesterFilter !== 'all'
                        ? ` del Semestre ${ROMAN_SEMESTERS[Number(globalSemesterFilter) as SemesterNumber]}`
                        : ' del pensum documentado (I–IX)'}
                  </>
                )}
              </span>
              <span>
                Leyenda: <strong>HT</strong> Teóricas · <strong>HP</strong> Prácticas ·{' '}
                <strong>HTP</strong> Teórico-prácticas · <strong>Pond.</strong> Ponderación Académica
              </span>
            </div>

            {renderAllModePagination('top')}

            {visibleItems.length === 0 ? (
              <div className="panel pensum-empty-state" role="status">
                <BookOpen size={32} />
                <h3>No encontramos asignaturas con esos criterios</h3>
                <p>
                  Prueba con otro término o limpia los filtros activos. Tus materias seleccionadas se
                  mantienen intactas.
                </p>
                <div className="empty-list-actions">
                  {mode === 'semester' && search.trim().length > 0 && (
                    <button
                      type="button"
                      className="btn-outline small"
                      onClick={() => handleModeChange('all')}
                    >
                      Buscar en Todas las materias
                    </button>
                  )}
                  <button type="button" className="btn-primary small" onClick={resetSearchAndFilters}>
                    Limpiar búsqueda y filtros
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pensum-cards-grid" role="list" aria-label="Asignaturas del pensum">
                  {displayedItems.map(item => {
                  const isSelected = selectedCodes.has(item.curriculumCode);
                  const req = describeCourseRequirements(item);
                  const dependents = CURRICULUM_INDEX.dependentsByCode.get(item.curriculumCode) || [];
                  const groupCount = item.offering?.groups.length || 0;
                  const isAvailable = groupCount > 0;
                  const isGroupsOpen = expandedCardCodes.has(item.curriculumCode);
                  const normName = normalizeName(item.curriculumName);

                  return (
                    <article
                      key={item.id}
                      role="listitem"
                      className={
                        'pensum-course-card' +
                        (isSelected ? ' selected' : '') +
                        (!isAvailable ? ' unoffered' : '')
                      }
                    >
                      <div className="pensum-card-top">
                        <div className="pensum-card-badges">
                          <span className="pensum-code-badge">{item.curriculumCode}</span>
                          <span className="pensum-sem-badge">Sem. {item.romanSemester}</span>
                          <span
                            className="pensum-weight-badge"
                            title="Ponderación Académica (usada como créditos para sumatoria)"
                          >
                            {item.academicWeight} pond. / cr.
                          </span>
                        </div>
                        <span
                          className={
                            'status ' + (isAvailable ? 'success' : 'unknown pensum-unoffered-status')
                          }
                        >
                          {isAvailable
                            ? `● ${groupCount} ${groupCount === 1 ? 'grupo publicado' : 'grupos publicados'}`
                            : '○ Sin grupos publicados'}
                        </span>
                      </div>

                      <h3 className="pensum-course-title">{item.curriculumName}</h3>
                      {item.displayName && (
                        <small className="pensum-course-alias">
                          Nombre expandido: {item.displayName}
                        </small>
                      )}

                      <div className="pensum-hours-strip" aria-label="Horas académicas">
                        <span>
                          <b>HT:</b> {formatHoursValue(item.ht)}
                        </span>
                        <span>
                          <b>HP:</b> {formatHoursValue(item.hp)}
                        </span>
                        <span>
                          <b>HTP:</b> {formatHoursValue(item.htp)}
                        </span>
                      </div>

                      <div className="pensum-prereq-section">
                        {req.subjectPrerequisites.map(p => (
                          <button
                            key={p.code}
                            type="button"
                            className="pensum-prereq-pill subject-prereq prereq-interactive"
                            onClick={() => handleInspectPrerequisite(p.code)}
                            title={`Consultar prerrequisito ${p.code}`}
                          >
                            <CheckCircle2 size={14} aria-hidden="true" />
                            <div>
                              <strong>{p.message}</strong>
                              <span className="prereq-secondary-code">({p.rawCodeLabel})</span>
                            </div>
                          </button>
                        ))}

                        {req.creditRequirement && (
                          <div className="pensum-prereq-pill credit-prereq">
                            <Award size={14} aria-hidden="true" />
                            <div>
                              <strong>{req.creditRequirement.message}</strong>
                              <span className="prereq-secondary-code">
                                ({req.creditRequirement.detailNote})
                              </span>
                            </div>
                          </div>
                        )}

                        {!req.hasAnyRequirement && (
                          <div className="pensum-prereq-pill no-prereq">
                            <span>Sin prerrequisito indicado</span>
                          </div>
                        )}

                        {dependents.length > 0 && (
                          <div className="pensum-unlocks-box">
                            <span className="pensum-unlocks-label">Abre paso a:</span>
                            <div className="pensum-unlocks-pills">
                              {dependents.map(dep => (
                                <button
                                  key={dep.code}
                                  type="button"
                                  className="pensum-unlock-pill"
                                  onClick={() => handleInspectPrerequisite(dep.code)}
                                  title={`Ir a ${dep.code} · ${dep.name} (Sem. ${dep.romanSemester})`}
                                >
                                  <span>
                                    {dep.name} (Sem. {dep.romanSemester})
                                  </span>
                                  <ArrowRight size={12} aria-hidden="true" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {isAvailable && item.offering && (
                        <div className="pensum-groups-preview">
                          <button
                            type="button"
                            className={'pensum-groups-preview-toggle' + (isGroupsOpen ? ' open' : '')}
                            aria-expanded={isGroupsOpen}
                            onClick={() => toggleCardGroups(item.curriculumCode)}
                          >
                            <span>
                              {isGroupsOpen ? 'Ocultar' : 'Ver'} {groupCount}{' '}
                              {groupCount === 1 ? 'grupo y horario' : 'grupos y horarios'}
                            </span>
                            <ChevronDown size={14} aria-hidden="true" />
                          </button>
                          {isGroupsOpen && (
                            <div
                              className="pensum-groups-preview-list"
                              role="region"
                              aria-label={`Grupos publicados de ${item.curriculumName}`}
                            >
                              {item.offering.groups.map(g => (
                                <div key={g.id} className="pensum-group-preview-item">
                                  <div className="pensum-group-preview-top">
                                    <strong>Grupo {g.label}</strong>
                                    <span>{g.teacher || 'Docente por confirmar'}</span>
                                  </div>
                                  <small>
                                    {g.sessions.length > 0
                                      ? g.sessions
                                          .map(
                                            s =>
                                              `${SHORT_DAYS[s.day]} ${formatHour(s.start)}–${formatHour(s.end)}`
                                          )
                                          .join(', ')
                                      : 'Sin horario asignado'}
                                  </small>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {!isAvailable && (
                        <p className="pensum-unoffered-card-note">
                          <Info size={13} /> Sin grupos publicados en {catalog.term}. Puedes
                          seleccionarla para consulta, pero no podrá incluirse en una generación
                          completa hasta que exista algún grupo compatible.
                        </p>
                      )}

                      <div className="pensum-card-footer">
                        <button
                          type="button"
                          className={'pensum-select-btn' + (isSelected ? ' active' : '')}
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? 'Quitar' : 'Seleccionar'} ${item.curriculumCode} ${item.curriculumName} ${normName !== item.curriculumName ? normName : ''}`}
                          onClick={() => handleToggle(item)}
                        >
                          {isSelected ? (
                            <>
                              <Check size={15} strokeWidth={2.8} />
                              <span>Seleccionada</span>
                            </>
                          ) : (
                            <>
                              <span>Seleccionar materia</span>
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
                </div>

                {renderAllModePagination('bottom')}
              </>
            )}

            <div className="pensum-period10-footer-card">
              <Info size={18} />
              <div>
                <strong>Acerca de los períodos y requisitos del pensum</strong>
                <p>
                  El encabezado de «Consultar Pensum» declara {CURRICULUM_METADATA.periodosDeclarados}{' '}
                  períodos, pero la fuente oficial suministrada detalla las asignaturas de los
                  períodos 1 a 9 (62 asignaturas y 155 unidades de Ponderación Académica).{' '}
                  {CURRICULUM_METADATA.periodo10Note}. Los valores de «Créditos Requisitos»
                  (70, 80, 115 y 132) se muestran con fines informativos tal como están registrados en
                  Academusoft y no bloquean la exploración ni la selección en Traza.
                </p>
              </div>
            </div>
          </main>

          {mobileTrayOpen && (
            <div
              className="pensum-tray-backdrop"
              aria-hidden="true"
              onClick={() => setMobileTrayOpen(false)}
            />
          )}

          <aside
            className={'pensum-tray-panel' + (mobileTrayOpen ? ' mobile-open' : '')}
            aria-label="Bandeja de materias seleccionadas"
          >
            <div className="pensum-tray-card">
              <div className="pensum-tray-head">
                <div>
                  <span className="eyebrow">MI SELECCIÓN CENTRALIZADA</span>
                  <h2>Materias elegidas</h2>
                </div>
                <div className="pensum-tray-head-right">
                  <span className="selected-number">{selectedItems.length}</span>
                  {mobileTrayOpen && (
                    <button
                      type="button"
                      className="icon-btn pensum-tray-close-btn"
                      onClick={() => setMobileTrayOpen(false)}
                      aria-label="Cerrar bandeja"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="pensum-tray-stats">
                <div>
                  <strong>{selectedItems.length}</strong>
                  <span>Materias</span>
                </div>
                <div>
                  <strong>{totalSelectedWeight}</strong>
                  <span>Pond. académica / cr.</span>
                </div>
                <div>
                  <strong>{offeredSelectedItems.length}</strong>
                  <span>Con grupos</span>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <div className="pensum-tray-empty">
                  <Sparkles size={24} />
                  <p>
                    Aún no has seleccionado materias. Explora por «Todas las materias» o «Por
                    semestre» y pulsa <strong>Seleccionar materia</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="pensum-tray-list" role="list" aria-label="Lista de materias en tu selección">
                    {selectedItems.map(item => {
                      const hasGroups = Boolean(item.offering && item.offering.groups.length > 0);
                      return (
                        <div
                          key={item.id}
                          role="listitem"
                          className={'pensum-tray-item' + (!hasGroups ? ' unoffered' : '')}
                        >
                          <div
                            className="pensum-tray-item-info clickable"
                            role="button"
                            tabIndex={0}
                            title={`Localizar ${item.curriculumCode} en el catálogo`}
                            onClick={() => {
                              handleInspectPrerequisite(item.curriculumCode);
                              setMobileTrayOpen(false);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleInspectPrerequisite(item.curriculumCode);
                                setMobileTrayOpen(false);
                              }
                            }}
                          >
                            <div className="pensum-tray-item-top">
                              <span className="pensum-tray-code">
                                Sem. {item.romanSemester} · {item.curriculumCode}
                              </span>
                              <span className="pensum-tray-weight">
                                {item.academicWeight} pond.
                              </span>
                            </div>
                            <strong>{item.curriculumName}</strong>
                            <small className={hasGroups ? 'avail-ok' : 'avail-warn'}>
                              {hasGroups
                                ? `${item.offering!.groups.length} grupos en ${catalog.term}`
                                : `Sin grupos publicados en ${catalog.term}`}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="selected-chip-remove"
                            aria-label={`Quitar ${item.curriculumCode} ${item.curriculumName} de la selección`}
                            onClick={() => {
                              onRemoveCourse(item.curriculumCode);
                              setLiveAnnouncement(
                                `Quitada ${item.curriculumName} (${item.curriculumCode}) de tu selección.`
                              );
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {unofferedSelectedItems.length > 0 && (
                    <div className="pensum-unoffered-alert" role="alert">
                      <div className="pensum-unoffered-alert-head">
                        <AlertTriangle size={16} />
                        <strong>
                          {unofferedSelectedItems.length === 1
                            ? '1 materia seleccionada sin grupos publicados'
                            : `${unofferedSelectedItems.length} materias seleccionadas sin grupos publicados`}
                        </strong>
                      </div>
                      <p>
                        {unofferedSelectedItems.map(i => `${i.curriculumCode} (${i.curriculumName})`).join(', ')}{' '}
                        no {unofferedSelectedItems.length === 1 ? 'tiene' : 'tienen'} grupos en el
                        horario {catalog.term}. No se omitirán en silencio: puedes quitarlas ahora o
                        continuar al planificador generando combinaciones con las{' '}
                        {offeredSelectedItems.length} disponibles.
                      </p>
                      {showUnofferedGate && (
                        <div className="pensum-unoffered-gate-actions">
                          <button
                            type="button"
                            className="btn-primary small"
                            onClick={() => {
                              setShowUnofferedGate(false);
                              onOpenPlanner();
                            }}
                          >
                            Generar con las {offeredSelectedItems.length} con grupo{' '}
                            <ArrowRight size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-outline small"
                            onClick={() => {
                              onRemoveUnofferedCourses();
                              setShowUnofferedGate(false);
                              onOpenPlanner();
                            }}
                          >
                            Quitar sin grupo y continuar
                          </button>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setShowUnofferedGate(false)}
                          >
                            Seguir revisando en Mi pensum
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pensum-tray-actions">
                    <button
                      type="button"
                      className="btn-primary pensum-cta-build"
                      onClick={handleBuildScheduleClick}
                    >
                      <CalendarDays size={17} />
                      <span>Armar mi horario</span>
                      <ArrowRight size={16} />
                    </button>

                    {!confirmClear ? (
                      <button
                        type="button"
                        className="pensum-clear-trigger"
                        onClick={() => setConfirmClear(true)}
                      >
                        <Trash2 size={14} />
                        <span>Limpiar selección</span>
                      </button>
                    ) : (
                      <div className="pensum-clear-confirm" role="alertdialog" aria-label="Confirmar limpieza de selección">
                        <span>¿Vaciar las {selectedItems.length} materias elegidas?</span>
                        <div className="pensum-clear-confirm-btns">
                          <button
                            type="button"
                            className="btn-danger-confirm"
                            onClick={() => {
                              onClearAllCourses();
                              setConfirmClear(false);
                              setShowUnofferedGate(false);
                              setLiveAnnouncement('Se limpió toda la selección de materias.');
                            }}
                          >
                            Sí, limpiar
                          </button>
                          <button
                            type="button"
                            className="btn-outline small"
                            onClick={() => setConfirmClear(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="pensum-mobile-bar" role="region" aria-label="Resumen móvil de selección del pensum">
        <div className="pensum-mobile-bar-summary">
          <strong>{selectedItems.length} materias</strong>
          <span>{totalSelectedWeight} pond. / cr.</span>
        </div>
        <div className="pensum-mobile-bar-actions">
          <button
            type="button"
            className="btn-outline small"
            onClick={() => setMobileTrayOpen(v => !v)}
            aria-expanded={mobileTrayOpen}
          >
            {mobileTrayOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            <span>{mobileTrayOpen ? 'Ocultar' : 'Bandeja'}</span>
          </button>
          <button
            type="button"
            className="btn-primary small"
            onClick={handleBuildScheduleClick}
          >
            <span>Armar mi horario</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
