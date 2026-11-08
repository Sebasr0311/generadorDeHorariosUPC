import rawPensumJson from '../data/PENSUM_UPC_DATOS.json';
import type {
  Catalog,
  Choice,
  CurriculumCourse,
  CurriculumMetadata,
  CurriculumSubject,
  PensumSelectionMode,
  ReconciledCatalogItem,
  ReconciliationIncident,
  RomanSemester,
  SemesterFilterValue,
  SemesterNumber,
  Subject,
} from './types';

export const SEMESTER_NUMBERS: readonly SemesterNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const ROMAN_SEMESTERS: Record<SemesterNumber, RomanSemester> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
};

export const ROMAN_TO_NUMBER: Record<string, SemesterNumber> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
};

export const EXPECTED_SEMESTER_TOTALS: Record<
  SemesterNumber,
  { subjects: number; academicWeight: number; credits: number }
> = {
  1: { subjects: 7, academicWeight: 16, credits: 16 },
  2: { subjects: 8, academicWeight: 18, credits: 18 },
  3: { subjects: 8, academicWeight: 19, credits: 19 },
  4: { subjects: 7, academicWeight: 19, credits: 19 },
  5: { subjects: 7, academicWeight: 18, credits: 18 },
  6: { subjects: 7, academicWeight: 18, credits: 18 },
  7: { subjects: 7, academicWeight: 17, credits: 17 },
  8: { subjects: 7, academicWeight: 17, credits: 17 },
  9: { subjects: 4, academicWeight: 13, credits: 13 },
};

/**
 * Documented friendly display aliases for official abbreviated titles in Academusoft.
 * The original `name` from PENSUM_UPC_DATOS.json is always preserved verbatim.
 */
export const DISPLAY_NAME_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  FC407: 'FORMULACION Y EVALUACION DE PROYECTOS EN INGENIERIA',
  SS705: 'ELECTIVA CIENCIAS ADMINISTRATIVAS, ECONOMICAS Y CONTABLES',
});

/**
 * Documented divergences between external/brochure pensum codes and the official
 * Academusoft "Consultar Pensum" dataset (PENSUM_UPC_DATOS.json).
 * Kept as audit documentation; never used to silently overwrite canonical codes.
 */
export const DOCUMENTED_EXTERNAL_PENSUM_DIVERGENCES = Object.freeze([
  { canonicalCode: 'MT117', externalCode: 'MT203', name: 'LOGICA MATEMATICA', semester: 1 },
  { canonicalCode: 'ID212', externalCode: 'ID301', name: 'TECH ENGLISH I', semester: 2 },
  { canonicalCode: 'SS303', externalCode: 'ING300', name: 'SEMILLERO DE INVESTIGACION', semester: 3 },
  { canonicalCode: 'ID341', externalCode: 'ID302', name: 'TECH ENGLISH II', semester: 3 },
  { canonicalCode: 'SS705', externalCode: 'EC105', name: 'ELECTIVA CIENCIAS ADMIN ECONOMICAS Y CONTABLES', semester: 4 },
  { canonicalCode: 'SS802', externalCode: 'SS503', name: 'BASE DE DATOS AVANZADAS', semester: 5 },
  { canonicalCode: 'UPC23', externalCode: 'UPC15', name: 'CATEDRA DE LA PAZ', semester: 5 },
  { canonicalCode: 'UPC25', externalCode: 'SS706', name: 'CATEDRA AMBIENTAL Y DESARROLLO SOSTENIBLE', semester: 6 },
  { canonicalCode: 'SS604', externalCode: 'ING303', name: 'INNOVACION Y EMPRENDIMIENTO TECNOLOGICO', semester: 6 },
  { canonicalCode: 'UPC24', externalCode: 'UPC10', name: 'CATEDRA DE EMPRENDIMIENTO', semester: 7 },
  { canonicalCode: 'SS706', externalCode: 'SS704', name: 'INGENIERIA DE SOFTWARE III', semester: 7 },
  { canonicalCode: 'SS702', externalCode: 'SS700', name: 'INTELIGENCIA ARTIFICIAL', semester: 7 },
  { canonicalCode: 'SS708', externalCode: 'ING304', name: 'RESEARCH PROJECT', semester: 7 },
  { canonicalCode: 'SS707', externalCode: 'SS705', name: 'TECNOLOGIAS INMERSIVAS', semester: 7 },
  { canonicalCode: 'SS810', externalCode: 'SS801', name: 'ELECTIVA BASICA DE INGENIERIA', semester: 8 },
  { canonicalCode: 'SS811', externalCode: 'SS806', name: 'ETICA PROFESIONAL', semester: 8 },
  { canonicalCode: 'SS809', externalCode: 'SS802', name: 'GESTION DE PROYECTOS TI', semester: 8 },
  { canonicalCode: 'SS807', externalCode: 'SS804', name: 'OPTATIVA DE PROFUNDIZACION I', semester: 8 },
  { canonicalCode: 'SS808', externalCode: 'SS805', name: 'OPTATIVA DE PROFUNDIZACION II', semester: 8 },
  { canonicalCode: 'SS812', externalCode: 'SS807', name: 'PROYECTO DE GRADO I', semester: 8 },
  { canonicalCode: 'SS806', externalCode: 'SS803', name: 'SEGURIDAD DE LA INFORMACION', semester: 8 },
  { canonicalCode: 'SS906', externalCode: 'SS901', name: 'OPTATIVA DE PROFUNDIZACION III', semester: 9 },
  { canonicalCode: 'SS907', externalCode: 'SS902', name: 'OPTATIVA DE PROFUNDIZACION IV', semester: 9 },
  { canonicalCode: 'SS908', externalCode: 'SS903', name: 'OPTATIVA DE PROFUNDIZACION V', semester: 9 },
  { canonicalCode: 'SS909', externalCode: 'SS904', name: 'TRABAJO DE GRADO II', semester: 9 },
]);

export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type RawPensumEntry = {
  semestre: number;
  codigo: string;
  nombre: string;
  ht: number | null;
  hp: number | null;
  htp: number | null;
  ponderacionAcademica: number;
  creditosRequisito: number;
  prerequisitoCodigo: string | null;
  prerequisitoNombre: string | null;
};

type RawPensumDataset = {
  metadatos: {
    universidad: string;
    programa: string;
    jornada: string;
    periodosDeclarados: number;
    periodosDetallados: number[];
    periodo10: string;
    totalAsignaturasDocumentadas: number;
    totalPonderacionAcademicaDocumentada: number;
    fuente: string;
  };
  asignaturas: RawPensumEntry[];
};

function buildCurriculumFromDataset(dataset: RawPensumDataset): {
  metadata: CurriculumMetadata;
  courses: readonly CurriculumCourse[];
} {
  const seenCodes = new Set<string>();
  const preliminaryByCode = new Map<string, RawPensumEntry>();

  for (const row of dataset.asignaturas) {
    const code = row.codigo.trim().toUpperCase();
    if (seenCodes.has(code)) {
      throw new Error(`Código curricular duplicado en PENSUM_UPC_DATOS.json: ${code}`);
    }
    seenCodes.add(code);
    preliminaryByCode.set(code, row);
  }

  const courses: CurriculumCourse[] = dataset.asignaturas.map(row => {
    const semester = row.semestre as SemesterNumber;
    const code = row.codigo.trim().toUpperCase();
    const name = row.nombre.trim();
    const prerequisiteCodes: string[] = [];
    const prerequisiteNames: string[] = [];

    if (row.prerequisitoCodigo) {
      const prereqCode = row.prerequisitoCodigo.trim().toUpperCase();
      const target = preliminaryByCode.get(prereqCode);
      if (!target) {
        throw new Error(`El prerrequisito ${prereqCode} de ${code} no existe en el pensum.`);
      }
      prerequisiteCodes.push(prereqCode);
      prerequisiteNames.push(target.nombre.trim());
    }

    return Object.freeze({
      code,
      name,
      displayName: DISPLAY_NAME_ALIASES[code],
      semester,
      romanSemester: ROMAN_SEMESTERS[semester],
      academicWeight: row.ponderacionAcademica,
      credits: row.ponderacionAcademica,
      ht: row.ht,
      hp: row.hp,
      htp: row.htp,
      requiredCredits: row.creditosRequisito,
      prerequisiteCodes,
      prerequisiteNames,
    });
  });

  const metadata: CurriculumMetadata = Object.freeze({
    universidad: dataset.metadatos.universidad,
    programa: dataset.metadatos.programa,
    jornada: dataset.metadatos.jornada,
    periodosDeclarados: dataset.metadatos.periodosDeclarados,
    periodosDetallados: Object.freeze([...SEMESTER_NUMBERS]),
    periodo10: dataset.metadatos.periodo10,
    periodo10Note: 'El período 10 no tiene información en la fuente suministrada',
    totalAsignaturasDocumentadas: dataset.metadatos.totalAsignaturasDocumentadas,
    totalPonderacionAcademicaDocumentada: dataset.metadatos.totalPonderacionAcademicaDocumentada,
    fuente: dataset.metadatos.fuente,
  });

  return { metadata, courses: Object.freeze(courses) };
}

const builtCurriculum = buildCurriculumFromDataset(rawPensumJson as RawPensumDataset);

export const CURRICULUM_METADATA: CurriculumMetadata = builtCurriculum.metadata;
export const CURRICULUM_COURSES: readonly CurriculumCourse[] = builtCurriculum.courses;
export const CURRICULUM_SUBJECTS: readonly CurriculumSubject[] = builtCurriculum.courses;

export type CurriculumMemoIndex = {
  byCode: ReadonlyMap<string, CurriculumCourse>;
  bySemester: ReadonlyMap<SemesterNumber, readonly CurriculumCourse[]>;
  searchHaystackByCode: ReadonlyMap<string, string>;
  dependentsByCode: ReadonlyMap<string, readonly CurriculumCourse[]>;
};

function createCurriculumIndex(courses: readonly CurriculumCourse[]): CurriculumMemoIndex {
  const byCode = new Map<string, CurriculumCourse>();
  const bySemester = new Map<SemesterNumber, CurriculumCourse[]>();
  const searchHaystackByCode = new Map<string, string>();
  const dependentsByCode = new Map<string, CurriculumCourse[]>();

  for (const sem of SEMESTER_NUMBERS) {
    bySemester.set(sem, []);
  }

  for (const course of courses) {
    byCode.set(course.code, course);
    bySemester.get(course.semester)?.push(course);

    const searchParts = [
      course.code,
      course.name,
      course.displayName || '',
      `SEMESTRE ${course.romanSemester}`,
      `PERIODO ${course.semester}`,
    ];
    searchHaystackByCode.set(course.code, normalizeText(searchParts.join(' ')));

    for (const prereqCode of course.prerequisiteCodes) {
      const list = dependentsByCode.get(prereqCode) || [];
      list.push(course);
      dependentsByCode.set(prereqCode, list);
    }
  }

  return Object.freeze({
    byCode,
    bySemester,
    searchHaystackByCode,
    dependentsByCode,
  });
}

export const CURRICULUM_INDEX: CurriculumMemoIndex = createCurriculumIndex(CURRICULUM_COURSES);

export type CourseRequirementDescription = {
  subjectPrerequisites: {
    code: string;
    name: string;
    message: string;
    rawCodeLabel: string;
  }[];
  creditRequirement: {
    credits: number;
    message: string;
    detailNote: string;
  } | null;
  hasAnyRequirement: boolean;
  primaryMessage: string;
};

/**
 * Resolves prerequisites for a course into clear human-readable text using the canonical name
 * from the memoized index, visually separating subject prerequisites from numeric credit requirements.
 */
export function describeCourseRequirements(
  course: Pick<CurriculumCourse, 'prerequisiteCodes' | 'prerequisiteNames' | 'requiredCredits'>
): CourseRequirementDescription {
  const subjectPrerequisites = course.prerequisiteCodes.map((code, idx) => {
    const resolvedName =
      CURRICULUM_INDEX.byCode.get(code.toUpperCase())?.name ||
      course.prerequisiteNames[idx] ||
      code;
    return {
      code,
      name: resolvedName,
      message: `Debes haber aprobado ${resolvedName}`,
      rawCodeLabel: `R - ${code}`,
    };
  });

  const creditRequirement =
    course.requiredCredits > 0
      ? {
          credits: course.requiredCredits,
          message: `Requiere ${course.requiredCredits} créditos`,
          detailNote: 'Requisito numérico registrado por Academusoft (informativo)',
        }
      : null;

  const hasAnyRequirement = subjectPrerequisites.length > 0 || creditRequirement !== null;

  let primaryMessage = 'Sin prerrequisito indicado';
  if (subjectPrerequisites.length > 0 && creditRequirement) {
    primaryMessage = `${subjectPrerequisites.map(p => p.message).join('; ')} · ${creditRequirement.message}`;
  } else if (subjectPrerequisites.length > 0) {
    primaryMessage = subjectPrerequisites.map(p => p.message).join('; ');
  } else if (creditRequirement) {
    primaryMessage = `${creditRequirement.message} (${creditRequirement.detailNote})`;
  }

  return {
    subjectPrerequisites,
    creditRequirement,
    hasAnyRequirement,
    primaryMessage,
  };
}

export function formatHoursValue(val: number | null): string {
  return val === null || val === undefined ? '—' : String(val);
}

export function getCurriculumSummary(curriculum: readonly CurriculumCourse[] = CURRICULUM_COURSES) {
  const bySemester: Record<
    SemesterNumber,
    { subjects: number; credits: number; academicWeight: number; items: CurriculumCourse[] }
  > = {
    1: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    2: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    3: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    4: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    5: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    6: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    7: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    8: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
    9: { subjects: 0, credits: 0, academicWeight: 0, items: [] },
  };
  let totalCredits = 0;
  let totalPrerequisiteRelations = 0;
  const numericCreditCourses: CurriculumCourse[] = [];

  for (const subj of curriculum) {
    bySemester[subj.semester].subjects += 1;
    bySemester[subj.semester].credits += subj.academicWeight;
    bySemester[subj.semester].academicWeight += subj.academicWeight;
    bySemester[subj.semester].items.push(subj);
    totalCredits += subj.academicWeight;
    totalPrerequisiteRelations += subj.prerequisiteCodes.length;
    if (subj.requiredCredits > 0) {
      numericCreditCourses.push(subj);
    }
  }
  return {
    metadata: CURRICULUM_METADATA,
    totalSemesters: Object.values(bySemester).filter(s => s.subjects > 0).length,
    declaredPeriods: CURRICULUM_METADATA.periodosDeclarados,
    period10Status: CURRICULUM_METADATA.periodo10,
    period10Note: CURRICULUM_METADATA.periodo10Note,
    totalSubjects: curriculum.length,
    totalCredits,
    totalAcademicWeight: totalCredits,
    totalPrerequisiteRelations,
    numericCreditCourses,
    bySemester,
  };
}

export type CurriculumReconciliationResult = {
  items: ReconciledCatalogItem[];
  curriculumItems: ReconciledCatalogItem[];
  extraItems: ReconciledCatalogItem[];
  incidents: ReconciliationIncident[];
  byCurriculumCode: Map<string, ReconciledCatalogItem>;
  byOfferingCode: Map<string, ReconciledCatalogItem>;
};

/**
 * Reconciles the canonical curriculum (PENSUM_UPC_DATOS.json) against a schedule Catalog.
 * Never merges automatically when a subject in the catalog has a different code for a similar name
 * or a colliding code with a different name — instead detects and documents the divergence.
 */
export function reconcileCurriculumAndCatalog(
  catalog: Catalog,
  curriculum: readonly CurriculumCourse[] = CURRICULUM_COURSES
): CurriculumReconciliationResult {
  const currByCode = new Map<string, CurriculumCourse>();
  const currByNormName = new Map<string, CurriculumCourse[]>();

  for (const c of curriculum) {
    currByCode.set(c.code.toUpperCase(), c);
    const norm = normalizeText(c.name);
    currByNormName.set(norm, [...(currByNormName.get(norm) || []), c]);
    if (c.displayName) {
      const normAlias = normalizeText(c.displayName);
      if (normAlias !== norm) {
        currByNormName.set(normAlias, [...(currByNormName.get(normAlias) || []), c]);
      }
    }
  }

  const matchedOfferingByCurrCode = new Map<
    string,
    { offering: Subject; origin: 'exact-code-name' | 'exact-code-alias'; note?: string }
  >();
  const unmatchedOfferings: {
    offering: Subject;
    reason: 'extra' | 'review-required';
    detail: string;
  }[] = [];
  const incidents: ReconciliationIncident[] = [];

  for (const offering of catalog.subjects) {
    if (!offering.groups || offering.groups.length === 0) continue;
    const offCode = offering.code.toUpperCase().trim();
    const offNormName = normalizeText(offering.name);
    const sameCodeCurr = currByCode.get(offCode);

    if (sameCodeCurr) {
      const currNormName = normalizeText(sameCodeCurr.name);
      const aliasNormName = sameCodeCurr.displayName ? normalizeText(sameCodeCurr.displayName) : '';

      if (offNormName === currNormName) {
        matchedOfferingByCurrCode.set(sameCodeCurr.code, {
          offering,
          origin: 'exact-code-name',
        });
        continue;
      }

      if (aliasNormName && offNormName === aliasNormName) {
        matchedOfferingByCurrCode.set(sameCodeCurr.code, {
          offering,
          origin: 'exact-code-alias',
          note: `Alias de visualización reconocido para ${sameCodeCurr.code} (${sameCodeCurr.name}).`,
        });
        continue;
      }

      // Code exists in pensum, but the name diverges -> do NOT merge automatically!
      const detail = `Divergencia de código detectada: en el horario aparece "${offering.code} · ${offering.name}", pero en el pensum oficial el código ${sameCodeCurr.code} corresponde a "${sameCodeCurr.name}" (Semestre ${sameCodeCurr.romanSemester}). No se fusiona automáticamente.`;
      unmatchedOfferings.push({
        offering,
        reason: 'review-required',
        detail,
      });
      incidents.push({
        type: 'code-divergence',
        curriculumCode: sameCodeCurr.code,
        curriculumName: sameCodeCurr.name,
        offeringCode: offering.code,
        offeringName: offering.name,
        detail,
      });
      continue;
    }

    // Code is not in pensum; check if name matches a pensum course -> detect divergence without auto-merging!
    const similarByName = currByNormName.get(offNormName) || [];
    if (similarByName.length > 0) {
      const target = similarByName[0];
      const detail = `Divergencia de código para nombre similar: "${offering.code} · ${offering.name}" comparte nombre con la asignatura del pensum "${target.code} · ${target.name}" (Semestre ${target.romanSemester}). Se registra la divergencia sin fusionar automáticamente.`;
      unmatchedOfferings.push({
        offering,
        reason: 'review-required',
        detail,
      });
      incidents.push({
        type: 'name-similarity-divergence',
        curriculumCode: target.code,
        curriculumName: target.name,
        offeringCode: offering.code,
        offeringName: offering.name,
        detail,
      });
      continue;
    }

    // Otherwise, it's an extra offering not in the 62 curriculum courses
    const detail = `Asignatura del horario (${offering.code} · ${offering.name}) fuera de las 62 materias documentadas en el pensum; clasificada en "Otras".`;
    unmatchedOfferings.push({
      offering,
      reason: 'extra',
      detail,
    });
    incidents.push({
      type: 'extra-offering',
      offeringCode: offering.code,
      offeringName: offering.name,
      detail,
    });
  }

  const curriculumItems: ReconciledCatalogItem[] = [];
  const byCurriculumCode = new Map<string, ReconciledCatalogItem>();
  const byOfferingCode = new Map<string, ReconciledCatalogItem>();

  for (const curr of curriculum) {
    const match = matchedOfferingByCurrCode.get(curr.code);
    if (match && match.offering.groups.length > 0) {
      const item: ReconciledCatalogItem = {
        id: `curr:${curr.code}`,
        kind: 'curriculum',
        status: 'available',
        semester: curr.semester,
        romanSemester: curr.romanSemester,
        curriculumCode: curr.code,
        curriculumName: curr.name,
        displayName: curr.displayName,
        academicWeight: curr.academicWeight,
        credits: curr.credits,
        ht: curr.ht,
        hp: curr.hp,
        htp: curr.htp,
        requiredCredits: curr.requiredCredits,
        prerequisiteCodes: curr.prerequisiteCodes,
        prerequisiteNames: curr.prerequisiteNames,
        offering: match.offering,
        offeringCode: match.offering.code,
        offeringName: match.offering.name,
        choiceCode: curr.code,
        matchOrigin: match.origin,
        matchNote: match.note,
      };
      curriculumItems.push(item);
      byCurriculumCode.set(curr.code, item);
      byOfferingCode.set(match.offering.code, item);
    } else {
      const item: ReconciledCatalogItem = {
        id: `curr:${curr.code}`,
        kind: 'curriculum',
        status: 'unoffered',
        semester: curr.semester,
        romanSemester: curr.romanSemester,
        curriculumCode: curr.code,
        curriculumName: curr.name,
        displayName: curr.displayName,
        academicWeight: curr.academicWeight,
        credits: curr.credits,
        ht: curr.ht,
        hp: curr.hp,
        htp: curr.htp,
        requiredCredits: curr.requiredCredits,
        prerequisiteCodes: curr.prerequisiteCodes,
        prerequisiteNames: curr.prerequisiteNames,
        offering: null,
        offeringCode: null,
        offeringName: null,
        choiceCode: curr.code,
        matchOrigin: 'unoffered',
        matchNote: 'Sin grupos publicados / No disponible para este período',
      };
      curriculumItems.push(item);
      byCurriculumCode.set(curr.code, item);
    }
  }

  const extraItems: ReconciledCatalogItem[] = unmatchedOfferings.map(({ offering, reason, detail }) => {
    const item: ReconciledCatalogItem = {
      id: `extra:${offering.code}`,
      kind: 'extra',
      status: reason === 'review-required' ? 'review-required' : 'extra-offering',
      semester: null,
      romanSemester: null,
      curriculumCode: offering.code,
      curriculumName: offering.name,
      academicWeight: null,
      credits: null,
      ht: null,
      hp: null,
      htp: null,
      requiredCredits: 0,
      prerequisiteCodes: [],
      prerequisiteNames: [],
      offering,
      offeringCode: offering.code,
      offeringName: offering.name,
      choiceCode: offering.code,
      matchOrigin: reason === 'review-required' ? 'review-required' : 'extra-offering',
      matchNote: detail,
    };
    byOfferingCode.set(offering.code, item);
    return item;
  });

  const items = [...curriculumItems, ...extraItems];

  return {
    items,
    curriculumItems,
    extraItems,
    incidents,
    byCurriculumCode,
    byOfferingCode,
  };
}

export type CatalogFilterState = {
  semester: SemesterFilterValue;
  search: string;
  availability?: 'all' | 'available' | 'unoffered';
  modality?: 'all' | 'campus' | 'external';
  teacher?: string;
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  semester: 'all',
  search: '',
  availability: 'all',
  modality: 'all',
  teacher: '',
};

const EXTERNAL_GROUP_RE = /VIRTUAL|BANCO|PLATO|COPEY/i;

export function filterReconciledItems(
  items: readonly ReconciledCatalogItem[],
  filters: CatalogFilterState
): ReconciledCatalogItem[] {
  const semFilter = filters.semester || 'all';
  const normQuery = normalizeText(filters.search || '');
  const availability = filters.availability || 'all';
  const modality = filters.modality || 'all';
  const normTeacher = normalizeText(filters.teacher || '');

  return items.filter(item => {
    // 1. Semester filter
    if (semFilter === 'other') {
      if (item.kind !== 'extra') return false;
    } else if (semFilter !== 'all') {
      const targetSem = Number(semFilter) as SemesterNumber;
      if (item.kind !== 'curriculum' || item.semester !== targetSem) return false;
    }

    // 2. Availability filter
    if (availability === 'available' && !item.offering) return false;
    if (availability === 'unoffered' && item.offering !== null) return false;

    // 3. Modality filter
    if (modality === 'campus') {
      if (!item.offering) return false;
      if (!item.offering.groups.some(g => !EXTERNAL_GROUP_RE.test(g.label))) return false;
    } else if (modality === 'external') {
      if (!item.offering) return false;
      if (!item.offering.groups.some(g => EXTERNAL_GROUP_RE.test(g.label))) return false;
    }

    // 4. Teacher filter
    if (normTeacher) {
      if (!item.offering) return false;
      const matchesTeacher = item.offering.groups.some(
        g =>
          (g.teacherId && normalizeText(g.teacherId) === normTeacher) ||
          (g.teacher && normalizeText(g.teacher).includes(normTeacher))
      );
      if (!matchesTeacher) return false;
    }

    // 5. Text search using memoized curriculum index + dynamic teacher/offering data
    if (normQuery) {
      const memoBase = CURRICULUM_INDEX.searchHaystackByCode.get(item.curriculumCode) || '';
      const dynamicParts = [
        memoBase,
        item.curriculumCode,
        item.curriculumName,
        item.displayName || '',
        item.offeringCode ?? '',
        item.offeringName ?? '',
        ...(item.offering ? item.offering.groups.map(g => g.teacher || '') : []),
      ];
      const haystack = normalizeText(dynamicParts.join(' '));
      if (!haystack.includes(normQuery)) return false;
    }

    return true;
  });
}

export type SemesterCountSummary = {
  total: number;
  available: number;
  unoffered: number;
  credits: number;
  academicWeight: number;
};

export function computeSemesterCounts(
  items: readonly ReconciledCatalogItem[]
): Record<SemesterFilterValue, SemesterCountSummary> {
  const result: Record<SemesterFilterValue, SemesterCountSummary> = {
    all: { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '1': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '2': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '3': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '4': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '5': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '6': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '7': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '8': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    '9': { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
    other: { total: 0, available: 0, unoffered: 0, credits: 0, academicWeight: 0 },
  };

  for (const item of items) {
    const isAvail = item.offering !== null && item.offering.groups.length > 0;
    const weight = item.academicWeight || item.credits || 0;
    result.all.total += 1;
    if (isAvail) result.all.available += 1;
    else result.all.unoffered += 1;
    result.all.credits += weight;
    result.all.academicWeight += weight;

    if (item.kind === 'curriculum' && item.semester) {
      const key = String(item.semester) as SemesterFilterValue;
      result[key].total += 1;
      if (isAvail) result[key].available += 1;
      else result[key].unoffered += 1;
      result[key].credits += weight;
      result[key].academicWeight += weight;
    } else {
      result.other.total += 1;
      if (isAvail) result.other.available += 1;
      else result.other.unoffered += 1;
    }
  }

  return result;
}

/**
 * Resolves a Choice code against a Catalog safely.
 */
export function resolveChoiceSubject(
  choice: Pick<Choice, 'code' | 'curriculumCode'>,
  catalog: Catalog,
  reconciled?: CurriculumReconciliationResult
): Subject | undefined {
  if (choice.curriculumCode && reconciled) {
    const byCurr = reconciled.byCurriculumCode.get(choice.curriculumCode.toUpperCase());
    if (byCurr) return byCurr.offering || undefined;
  }
  const direct = catalog.subjects.find(s => s.code.toUpperCase() === choice.code.toUpperCase());
  if (direct) return direct;

  const rec = reconciled || reconcileCurriculumAndCatalog(catalog);
  const byCurr = rec.byCurriculumCode.get(choice.code.toUpperCase());
  if (byCurr && byCurr.offering) return byCurr.offering;
  return undefined;
}

/**
 * Normalizes and deduplicates choices while preserving both offered and unoffered
 * canonical curriculum selections and validating existing teacher/group preferences.
 */
export function migrateChoicesForCatalog(
  choices: readonly Choice[],
  catalog: Catalog,
  reconciled?: CurriculumReconciliationResult
): Choice[] {
  const rec = reconciled || reconcileCurriculumAndCatalog(catalog);
  const migrated: Choice[] = [];
  const seenCodes = new Set<string>();

  for (const ch of choices) {
    if (!ch || typeof ch.code !== 'string') continue;
    const cleanCode = ch.code.trim().toUpperCase();
    if (!cleanCode) continue;

    const targetItem =
      rec.byCurriculumCode.get(cleanCode) ||
      (ch.curriculumCode ? rec.byCurriculumCode.get(ch.curriculumCode.toUpperCase()) : undefined) ||
      rec.byOfferingCode.get(cleanCode);

    const effectiveCode = targetItem?.choiceCode || cleanCode;
    if (seenCodes.has(effectiveCode)) continue;
    seenCodes.add(effectiveCode);

    const offering = targetItem?.offering || null;
    let teacherId = ch.teacherId;
    let teacherMode: Choice['teacherMode'] = ch.teacherMode || 'any';
    let pinnedGroup = ch.pinnedGroup;

    if (offering) {
      if (teacherId && !offering.groups.some(g => g.teacherId === teacherId)) {
        teacherId = undefined;
        teacherMode = 'any';
      }
      if (pinnedGroup && !offering.groups.some(g => g.id === pinnedGroup)) {
        pinnedGroup = undefined;
      }
    }

    migrated.push({
      code: effectiveCode,
      curriculumCode:
        targetItem?.kind === 'curriculum' ? targetItem.curriculumCode : ch.curriculumCode || effectiveCode,
      teacherId,
      teacherMode,
      pinnedGroup,
    });
  }

  return migrated;
}

/**
 * Reconciles the user's centralized selection when a new PDF catalog is imported or switched.
 * Never discards selected courses; preserves valid group/teacher preferences and produces
 * explicit warnings if a previously available course lost its groups or a pinned group disappeared.
 */
export function reconcileSelectionWithNewCatalog(
  choices: readonly Choice[],
  newCatalog: Catalog,
  previousCatalog?: Catalog
): { choices: Choice[]; warnings: string[] } {
  const newRec = reconcileCurriculumAndCatalog(newCatalog);
  const prevRec = previousCatalog ? reconcileCurriculumAndCatalog(previousCatalog) : null;
  const warnings: string[] = [];
  const nextChoices: Choice[] = [];
  const seen = new Set<string>();

  for (const ch of choices) {
    const cleanCode = ch.code.trim().toUpperCase();
    if (!cleanCode || seen.has(cleanCode)) continue;
    seen.add(cleanCode);

    const newItem =
      newRec.byCurriculumCode.get(cleanCode) || newRec.byOfferingCode.get(cleanCode);
    const prevItem = prevRec
      ? prevRec.byCurriculumCode.get(cleanCode) || prevRec.byOfferingCode.get(cleanCode)
      : null;

    const courseName = newItem?.curriculumName || prevItem?.curriculumName || cleanCode;
    const newOffering = newItem?.offering || null;
    const hadOfferingBefore = Boolean(prevItem?.offering && prevItem.offering.groups.length > 0);

    if (!newOffering) {
      if (hadOfferingBefore) {
        warnings.push(
          `La asignatura ${cleanCode} (${courseName}) tenía grupos en ${previousCatalog?.term || 'el catálogo anterior'}, pero no tiene grupos publicados en ${newCatalog.term}.`
        );
      }
      nextChoices.push({
        code: cleanCode,
        curriculumCode: newItem?.curriculumCode || ch.curriculumCode || cleanCode,
        teacherMode: 'any',
      });
      continue;
    }

    let teacherId = ch.teacherId;
    let teacherMode: Choice['teacherMode'] = ch.teacherMode || 'any';
    let pinnedGroup = ch.pinnedGroup;

    if (pinnedGroup && !newOffering.groups.some(g => g.id === pinnedGroup)) {
      warnings.push(
        `El grupo fijado en ${cleanCode} (${courseName}) ya no existe en ${newCatalog.term}; selecciona un nuevo grupo.`
      );
      pinnedGroup = undefined;
    }

    if (teacherId && !newOffering.groups.some(g => g.teacherId === teacherId)) {
      teacherId = undefined;
      teacherMode = 'any';
    }

    nextChoices.push({
      code: newItem?.choiceCode || cleanCode,
      curriculumCode: newItem?.curriculumCode || ch.curriculumCode || cleanCode,
      teacherId,
      teacherMode,
      pinnedGroup,
    });
  }

  return { choices: nextChoices, warnings };
}

export function parseSemesterFilterParam(raw: unknown): SemesterFilterValue {
  if (typeof raw !== 'string') return 'all';
  const clean = raw.trim().toUpperCase();
  if (!clean || clean === 'ALL' || clean === 'TODOS') return 'all';
  if (clean === 'OTHER' || clean === 'OTRAS' || clean === 'OTROS') return 'other';
  if (/^[1-9]$/.test(clean)) return clean as SemesterFilterValue;
  if (clean in ROMAN_TO_NUMBER) return String(ROMAN_TO_NUMBER[clean]) as SemesterFilterValue;
  return 'all';
}

export function formatSemesterParamForUrl(sem: SemesterFilterValue): string | null {
  if (sem === 'all') return null;
  if (sem === 'other') return 'otras';
  const num = Number(sem) as SemesterNumber;
  return ROMAN_SEMESTERS[num] || null;
}

const FILTER_STORAGE_KEY = 'traza-catalog-filters-v1';
const CENTRAL_SELECTION_STORAGE_KEY = 'traza-central-selection-v1';
const PENSUM_MODE_STORAGE_KEY = 'traza-pensum-mode-v1';

export function loadPersistedSemesterFilter(): SemesterFilterValue {
  if (typeof window === 'undefined') return 'all';
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch = searchParams.get('semestre') || searchParams.get('semester');
    if (fromSearch) return parseSemesterFilterParam(fromSearch);

    const hash = window.location.hash || '';
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const hashParams = new URLSearchParams(hash.slice(qIdx + 1));
      const fromHash = hashParams.get('semestre') || hashParams.get('semester');
      if (fromHash) return parseSemesterFilterParam(fromHash);
    }

    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return 'all';
    const parsed = JSON.parse(raw) as { semester?: unknown };
    return parseSemesterFilterParam(parsed?.semester);
  } catch {
    return 'all';
  }
}

export function persistSemesterFilter(semester: SemesterFilterValue): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ semester }));
    const url = new URL(window.location.href);
    const formatted = formatSemesterParamForUrl(semester);
    if (formatted) {
      url.searchParams.set('semestre', formatted);
    } else {
      url.searchParams.delete('semestre');
      url.searchParams.delete('semester');
    }
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Ignore storage/history errors in restricted environments
  }
}

export function loadPersistedPensumMode(): PensumSelectionMode {
  if (typeof window === 'undefined') return 'all';
  try {
    const raw = window.localStorage.getItem(PENSUM_MODE_STORAGE_KEY);
    if (raw === 'semester' || raw === 'all') return raw;
    return 'all';
  } catch {
    return 'all';
  }
}

export function persistPensumMode(mode: PensumSelectionMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENSUM_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads the centralized course selection from localStorage with safe migration
 * from older formats (array of string codes or legacy Choice objects).
 */
export function loadCentralSelection(catalog: Catalog): Choice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CENTRAL_SELECTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    let rawList: unknown[] = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      'choices' in parsed &&
      Array.isArray((parsed as { choices: unknown[] }).choices)
    ) {
      rawList = (parsed as { choices: unknown[] }).choices;
    }

    const candidates: Choice[] = [];
    for (const item of rawList) {
      if (typeof item === 'string') {
        candidates.push({ code: item.trim().toUpperCase(), curriculumCode: item.trim().toUpperCase(), teacherMode: 'any' });
      } else if (item && typeof item === 'object' && 'code' in item && typeof (item as { code: unknown }).code === 'string') {
        const c = item as Choice;
        candidates.push({
          code: c.code.trim().toUpperCase(),
          curriculumCode: c.curriculumCode ? c.curriculumCode.trim().toUpperCase() : c.code.trim().toUpperCase(),
          teacherId: c.teacherId,
          teacherMode: c.teacherMode || 'any',
          pinnedGroup: c.pinnedGroup,
        });
      }
    }

    return migrateChoicesForCatalog(candidates, catalog);
  } catch {
    return [];
  }
}

export function persistCentralSelection(choices: readonly Choice[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CENTRAL_SELECTION_STORAGE_KEY,
      JSON.stringify({ version: 1, updatedAt: Date.now(), choices })
    );
  } catch {
    // Ignore storage errors
  }
}
