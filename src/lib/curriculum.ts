import rawPensumTxt from '../data/PENSUM_INGENIERIA_SISTEMAS_UPC.txt?raw';
import type {
  Catalog,
  Choice,
  CurriculumSubject,
  FormationArea,
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

export const EXPECTED_SEMESTER_TOTALS: Record<SemesterNumber, { subjects: number; credits: number }> = {
  1: { subjects: 7, credits: 16 },
  2: { subjects: 8, credits: 18 },
  3: { subjects: 8, credits: 19 },
  4: { subjects: 7, credits: 19 },
  5: { subjects: 7, credits: 18 },
  6: { subjects: 7, credits: 18 },
  7: { subjects: 7, credits: 17 },
  8: { subjects: 7, credits: 17 },
  9: { subjects: 4, credits: 13 },
};

export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCurriculumTxt(txt: string): CurriculumSubject[] {
  const subjects: CurriculumSubject[] = [];
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = /^([1-9])\s*\|\s*([A-Z0-9]+)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(.+)$/.exec(line);
    if (!match) continue;
    const semester = Number(match[1]) as SemesterNumber;
    const code = match[2].trim().toUpperCase();
    const name = match[3].trim();
    const credits = Number(match[4]);
    const area = match[5].trim() as FormationArea;
    subjects.push({
      semester,
      romanSemester: ROMAN_SEMESTERS[semester],
      code,
      name,
      credits,
      area,
    });
  }
  return subjects;
}

export const CURRICULUM_SUBJECTS: readonly CurriculumSubject[] = Object.freeze(parseCurriculumTxt(rawPensumTxt));

export function getCurriculumSummary(curriculum: readonly CurriculumSubject[] = CURRICULUM_SUBJECTS) {
  const bySemester: Record<SemesterNumber, { subjects: number; credits: number; items: CurriculumSubject[] }> = {
    1: { subjects: 0, credits: 0, items: [] },
    2: { subjects: 0, credits: 0, items: [] },
    3: { subjects: 0, credits: 0, items: [] },
    4: { subjects: 0, credits: 0, items: [] },
    5: { subjects: 0, credits: 0, items: [] },
    6: { subjects: 0, credits: 0, items: [] },
    7: { subjects: 0, credits: 0, items: [] },
    8: { subjects: 0, credits: 0, items: [] },
    9: { subjects: 0, credits: 0, items: [] },
  };
  let totalCredits = 0;
  for (const subj of curriculum) {
    bySemester[subj.semester].subjects += 1;
    bySemester[subj.semester].credits += subj.credits;
    bySemester[subj.semester].items.push(subj);
    totalCredits += subj.credits;
  }
  return {
    totalSemesters: Object.values(bySemester).filter(s => s.subjects > 0).length,
    totalSubjects: curriculum.length,
    totalCredits,
    bySemester,
  };
}

export type ValidatedEquivalenceRule = {
  curriculumCode: string;
  curriculumName: string;
  allowedOfferingCodes: readonly string[];
  acceptedNormalizedNames: readonly string[];
  hasCodeCollisionWithCurriculum?: string;
  note: string;
};

/**
 * Explicit, audited equivalences between the official UPC Systems Engineering curriculum
 * (PENSUM_INGENIERIA_SISTEMAS_UPC.txt) and Academusoft schedule offerings.
 * Never links by code alone: both the offering code and normalized subject name must match.
 */
export const VALIDATED_EQUIVALENCES: readonly ValidatedEquivalenceRule[] = Object.freeze([
  {
    curriculumCode: 'MT203',
    curriculumName: 'Lógica Matemática',
    allowedOfferingCodes: ['MT203', 'MT117'],
    acceptedNormalizedNames: ['LOGICA MATEMATICA'],
    note: 'Malla MT203 ↔ Horario Academusoft MT117 (Lógica Matemática, Semestre I)',
  },
  {
    curriculumCode: 'ID301',
    curriculumName: 'Tech English I',
    allowedOfferingCodes: ['ID301', 'ID212'],
    acceptedNormalizedNames: ['TECH ENGLISH I'],
    note: 'Malla ID301 ↔ Horario Academusoft ID212 (Tech English I, Semestre II)',
  },
  {
    curriculumCode: 'ING300',
    curriculumName: 'Semillero de Investigación',
    allowedOfferingCodes: ['ING300', 'SS303'],
    acceptedNormalizedNames: ['SEMILLERO DE INVESTIGACION'],
    note: 'Malla ING300 ↔ Horario Academusoft SS303 (Semillero de Investigación, Semestre III)',
  },
  {
    curriculumCode: 'ID302',
    curriculumName: 'Tech English II',
    allowedOfferingCodes: ['ID302', 'ID341'],
    acceptedNormalizedNames: ['TECH ENGLISH II'],
    note: 'Malla ID302 ↔ Horario Academusoft ID341 (Tech English II, Semestre III)',
  },
  {
    curriculumCode: 'ING301',
    curriculumName: 'Metodología de Investigación',
    allowedOfferingCodes: ['ING301'],
    acceptedNormalizedNames: ['METODOLOGIA DE INVESTIGACION', 'METODOLOGIA DE LA INVESTIGACION'],
    note: 'Malla ING301 ↔ Horario Academusoft ING301 (variante de preposición "de la" en nombre oficial)',
  },
  {
    curriculumCode: 'SS503',
    curriculumName: 'Base de Datos Avanzadas',
    allowedOfferingCodes: ['SS503', 'SS802'],
    acceptedNormalizedNames: ['BASE DE DATOS AVANZADAS'],
    hasCodeCollisionWithCurriculum: 'SS802',
    note: 'Colisión controlada: Malla SS503 (Base de Datos Avanzadas, Sem. V) se publica como SS802 en PDF Academusoft; SS802 en malla es Gestión de Proyectos TI (Sem. VIII).',
  },
  {
    curriculumCode: 'UPC15',
    curriculumName: 'Cátedra de la Paz',
    allowedOfferingCodes: ['UPC15', 'UPC23'],
    acceptedNormalizedNames: ['CATEDRA DE LA PAZ'],
    note: 'Malla UPC15 ↔ Horario Academusoft UPC23 (Cátedra de la Paz, Semestre V)',
  },
  {
    curriculumCode: 'SS706',
    curriculumName: 'Cátedra Ambiental y Desarrollo Sostenible',
    allowedOfferingCodes: ['SS706', 'UPC25'],
    acceptedNormalizedNames: ['CATEDRA AMBIENTAL Y DESARROLLO SOSTENIBLE'],
    hasCodeCollisionWithCurriculum: 'SS706',
    note: 'Colisión controlada: Malla SS706 (Cátedra Ambiental y Desarrollo Sostenible, Sem. VI) se publica como UPC25 en PDF; el código SS706 del PDF corresponde a Ingeniería de Software III (malla SS704).',
  },
  {
    curriculumCode: 'ING303',
    curriculumName: 'Innovación y Emprendimiento Tecnológico',
    allowedOfferingCodes: ['ING303', 'SS604'],
    acceptedNormalizedNames: ['INNOVACION Y EMPRENDIMIENTO TECNOLOGICO'],
    note: 'Malla ING303 ↔ Horario Academusoft SS604 (Innovación y Emprendimiento Tecnológico, Semestre VI)',
  },
  {
    curriculumCode: 'FC407',
    curriculumName: 'Formulación y Evaluación de Proyectos de Ingeniería',
    allowedOfferingCodes: ['FC407'],
    acceptedNormalizedNames: [
      'FORMULACION Y EVALUACION DE PROYECTOS DE INGENIERIA',
      'FORMULACION Y EVALU DE PROYEC EN INGENIERIA',
      'FORMULACION Y EVALUACION DE PROYECTOS EN INGENIERIA',
    ],
    note: 'Malla FC407 ↔ Horario Academusoft FC407 (nombre abreviado en reporte Academusoft)',
  },
  {
    curriculumCode: 'SS700',
    curriculumName: 'Inteligencia Artificial',
    allowedOfferingCodes: ['SS700', 'SS702'],
    acceptedNormalizedNames: ['INTELIGENCIA ARTIFICIAL'],
    note: 'Malla SS700 ↔ Horario Academusoft SS702 (Inteligencia Artificial, Semestre VII)',
  },
  {
    curriculumCode: 'SS704',
    curriculumName: 'Ingeniería de Software III',
    allowedOfferingCodes: ['SS704', 'SS706'],
    acceptedNormalizedNames: ['INGENIERIA DE SOFTWARE III'],
    hasCodeCollisionWithCurriculum: 'SS706',
    note: 'Colisión controlada: Malla SS704 (Ingeniería de Software III, Sem. VII) se publica como SS706 en PDF; SS706 en malla es Cátedra Ambiental y Desarrollo Sostenible (Sem. VI).',
  },
  {
    curriculumCode: 'SS705',
    curriculumName: 'Tecnologías Inmersivas',
    allowedOfferingCodes: ['SS705', 'SS707'],
    acceptedNormalizedNames: ['TECNOLOGIAS INMERSIVAS'],
    note: 'Malla SS705 ↔ Horario Academusoft SS707 (Tecnologías Inmersivas, Semestre VII)',
  },
  {
    curriculumCode: 'UPC10',
    curriculumName: 'Cátedra de Emprendimiento',
    allowedOfferingCodes: ['UPC10', 'UPC24'],
    acceptedNormalizedNames: ['CATEDRA DE EMPRENDIMIENTO'],
    note: 'Malla UPC10 ↔ Horario Academusoft UPC24 (Cátedra de Emprendimiento, Semestre VII)',
  },
  {
    curriculumCode: 'ING304',
    curriculumName: 'Research Project',
    allowedOfferingCodes: ['ING304', 'SS708'],
    acceptedNormalizedNames: ['RESEARCH PROJECT'],
    note: 'Malla ING304 ↔ Horario Academusoft SS708 (Research Project, Semestre VII)',
  },
  {
    curriculumCode: 'SS803',
    curriculumName: 'Seguridad de la Información',
    allowedOfferingCodes: ['SS803', 'SS806'],
    acceptedNormalizedNames: ['SEGURIDAD DE LA INFORMACION'],
    hasCodeCollisionWithCurriculum: 'SS806',
    note: 'Colisión controlada: Malla SS803 (Seguridad de la Información, Sem. VIII) se publica como SS806 en PDF; SS806 en malla es Ética Profesional (Sem. VIII).',
  },
  {
    curriculumCode: 'SS806',
    curriculumName: 'Ética Profesional',
    allowedOfferingCodes: ['SS806', 'SS811'],
    acceptedNormalizedNames: ['ETICA PROFESIONAL'],
    hasCodeCollisionWithCurriculum: 'SS806',
    note: 'Colisión controlada: Malla SS806 (Ética Profesional, Sem. VIII) se publica como SS811 en PDF; el código SS806 del PDF se usa para Seguridad de la Información (malla SS803).',
  },
  {
    curriculumCode: 'SS807',
    curriculumName: 'Proyecto de Grado I',
    allowedOfferingCodes: ['SS807', 'SS812'],
    acceptedNormalizedNames: ['PROYECTO DE GRADO I'],
    note: 'Malla SS807 ↔ Horario Academusoft SS812 (Proyecto de Grado I, Semestre VIII)',
  },
]);

export type CurriculumReconciliationResult = {
  items: ReconciledCatalogItem[];
  curriculumItems: ReconciledCatalogItem[];
  extraItems: ReconciledCatalogItem[];
  incidents: ReconciliationIncident[];
  byCurriculumCode: Map<string, ReconciledCatalogItem>;
  byOfferingCode: Map<string, ReconciledCatalogItem>;
};

export function reconcileCurriculumAndCatalog(
  catalog: Catalog,
  curriculum: readonly CurriculumSubject[] = CURRICULUM_SUBJECTS
): CurriculumReconciliationResult {
  const currByCode = new Map<string, CurriculumSubject>();
  const currByNormName = new Map<string, CurriculumSubject[]>();
  for (const c of curriculum) {
    currByCode.set(c.code.toUpperCase(), c);
    const norm = normalizeText(c.name);
    currByNormName.set(norm, [...(currByNormName.get(norm) || []), c]);
  }

  const rulesByCurrCode = new Map<string, ValidatedEquivalenceRule>();
  for (const r of VALIDATED_EQUIVALENCES) {
    rulesByCurrCode.set(r.curriculumCode.toUpperCase(), r);
  }

  type CandidateMatch = {
    offering: Subject;
    curriculumCode: string;
    origin: 'exact-code-name' | 'exact-code-alias' | 'validated-equivalence' | 'unique-normalized-name';
    priority: number;
    note?: string;
    collisionCode?: string;
  };

  const candidatesByCurr = new Map<string, CandidateMatch[]>();
  const unmatchedOfferings: { offering: Subject; reason: 'extra' | 'review-required'; detail: string }[] = [];
  const incidents: ReconciliationIncident[] = [];

  for (const offering of catalog.subjects) {
    if (!offering.groups || offering.groups.length === 0) continue;
    const offCode = offering.code.toUpperCase().trim();
    const offNormName = normalizeText(offering.name);

    // 1. Exact code + exact normalized name
    const sameCodeCurr = currByCode.get(offCode);
    if (sameCodeCurr && normalizeText(sameCodeCurr.name) === offNormName) {
      const list = candidatesByCurr.get(sameCodeCurr.code) || [];
      list.push({
        offering,
        curriculumCode: sameCodeCurr.code,
        origin: 'exact-code-name',
        priority: 1,
      });
      candidatesByCurr.set(sameCodeCurr.code, list);
      continue;
    }

    // 2. Exact code + validated alias for that same code
    const sameCodeRule = rulesByCurrCode.get(offCode);
    if (
      sameCodeCurr &&
      sameCodeRule &&
      sameCodeRule.allowedOfferingCodes.includes(offCode) &&
      sameCodeRule.acceptedNormalizedNames.includes(offNormName)
    ) {
      const list = candidatesByCurr.get(sameCodeCurr.code) || [];
      list.push({
        offering,
        curriculumCode: sameCodeCurr.code,
        origin: 'exact-code-alias',
        priority: 2,
        note: sameCodeRule.note,
      });
      candidatesByCurr.set(sameCodeCurr.code, list);
      continue;
    }

    // 3. Validated equivalence (different code in schedule PDF, verified code+name pair)
    const matchedRules = VALIDATED_EQUIVALENCES.filter(
      r => r.allowedOfferingCodes.includes(offCode) && r.acceptedNormalizedNames.includes(offNormName)
    );
    if (matchedRules.length === 1) {
      const rule = matchedRules[0];
      const list = candidatesByCurr.get(rule.curriculumCode) || [];
      list.push({
        offering,
        curriculumCode: rule.curriculumCode,
        origin: 'validated-equivalence',
        priority: 3,
        note: rule.note,
        collisionCode: rule.hasCodeCollisionWithCurriculum,
      });
      candidatesByCurr.set(rule.curriculumCode, list);
      continue;
    }

    // 4. Check if the offering code collides with a curriculum code, but its name does NOT match!
    if (sameCodeCurr) {
      // Never link by code alone when the name does not correspond to the curriculum subject!
      const detail = `Colisión de código detectada: "${offering.code} - ${offering.name}" comparte el código ${sameCodeCurr.code} con "${sameCodeCurr.name}" (Semestre ${sameCodeCurr.romanSemester}), pero el nombre no coincide. Se mantiene sin vincular para revisión.`;
      unmatchedOfferings.push({
        offering,
        reason: 'review-required',
        detail,
      });
      incidents.push({
        type: 'review-required',
        curriculumCode: sameCodeCurr.code,
        curriculumName: sameCodeCurr.name,
        offeringCode: offering.code,
        offeringName: offering.name,
        detail,
      });
      continue;
    }

    // 5. Unique normalized name match (only when offering code is not a colliding curriculum code)
    const nameMatches = currByNormName.get(offNormName) || [];
    if (nameMatches.length === 1) {
      const targetCurr = nameMatches[0];
      const list = candidatesByCurr.get(targetCurr.code) || [];
      list.push({
        offering,
        curriculumCode: targetCurr.code,
        origin: 'unique-normalized-name',
        priority: 4,
        note: `Vinculado por nombre normalizado único: Malla ${targetCurr.code} ↔ Horario ${offering.code}`,
      });
      candidatesByCurr.set(targetCurr.code, list);
      continue;
    }

    // 6. Otherwise it is an extra subject outside the 62 curriculum subjects
    const detail = `Asignatura del horario (${offering.code} · ${offering.name}) fuera de las 62 materias de la malla curricular; disponible en "Otras / sin clasificación curricular".`;
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

  const winnersByCurr = new Map<string, CandidateMatch>();
  for (const [currCode, candidates] of candidatesByCurr.entries()) {
    if (candidates.length === 1) {
      const win = candidates[0];
      winnersByCurr.set(currCode, win);
      if (win.origin === 'validated-equivalence' || win.origin === 'unique-normalized-name') {
        incidents.push({
          type: win.collisionCode ? 'code-collision-resolved' : 'code-equivalence',
          curriculumCode: currCode,
          curriculumName: currByCode.get(currCode)?.name,
          offeringCode: win.offering.code,
          offeringName: win.offering.name,
          detail: win.note || `Malla ${currCode} vinculada con código de horario ${win.offering.code}.`,
        });
      }
    } else if (candidates.length > 1) {
      // Multiple offerings in the same catalog claim the same curriculum subject!
      candidates.sort((a, b) => a.priority - b.priority);
      const best = candidates[0];
      const second = candidates[1];
      if (best.priority < second.priority) {
        // Keep the strictly higher-priority match (e.g. exact code+name) and send the other to review
        winnersByCurr.set(currCode, best);
        for (const extraCand of candidates.slice(1)) {
          const detail = `Ambigüedad de oferta: "${extraCand.offering.code} - ${extraCand.offering.name}" compite por "${currByCode.get(currCode)?.name}" (${currCode}), que ya tiene coincidencia prioritaria con ${best.offering.code}. Marcado como "No vinculado / Requiere revisión".`;
          unmatchedOfferings.push({
            offering: extraCand.offering,
            reason: 'review-required',
            detail,
          });
          incidents.push({
            type: 'review-required',
            curriculumCode: currCode,
            curriculumName: currByCode.get(currCode)?.name,
            offeringCode: extraCand.offering.code,
            offeringName: extraCand.offering.name,
            detail,
          });
        }
      } else {
        // Equal-priority ambiguity: do not guess! Mark all competing offerings for manual review.
        for (const ambCand of candidates) {
          const detail = `Oferta ambigua: múltiples códigos en el PDF (${candidates.map(c => c.offering.code).join(', ')}) coinciden con "${currByCode.get(currCode)?.name}" (${currCode}). Marcado como "No vinculado / Requiere revisión".`;
          unmatchedOfferings.push({
            offering: ambCand.offering,
            reason: 'review-required',
            detail,
          });
          incidents.push({
            type: 'review-required',
            curriculumCode: currCode,
            curriculumName: currByCode.get(currCode)?.name,
            offeringCode: ambCand.offering.code,
            offeringName: ambCand.offering.name,
            detail,
          });
        }
      }
    }
  }

  const curriculumItems: ReconciledCatalogItem[] = [];
  const byCurriculumCode = new Map<string, ReconciledCatalogItem>();
  const byOfferingCode = new Map<string, ReconciledCatalogItem>();

  for (const curr of curriculum) {
    const winner = winnersByCurr.get(curr.code);
    if (winner && winner.offering.groups.length > 0) {
      const item: ReconciledCatalogItem = {
        id: `curr:${curr.code}`,
        kind: 'curriculum',
        status: 'available',
        semester: curr.semester,
        romanSemester: curr.romanSemester,
        curriculumCode: curr.code,
        curriculumName: curr.name,
        credits: curr.credits,
        area: curr.area,
        offering: winner.offering,
        offeringCode: winner.offering.code,
        offeringName: winner.offering.name,
        choiceCode: winner.offering.code,
        matchOrigin: winner.origin,
        matchNote: winner.note,
      };
      curriculumItems.push(item);
      byCurriculumCode.set(curr.code, item);
      byOfferingCode.set(winner.offering.code, item);
    } else {
      // Unoffered in current schedule period
      const collidingPdfSubject = catalog.subjects.find(s => s.code.toUpperCase() === curr.code);
      const collisionWarning = collidingPdfSubject
        ? `Sin grupos publicados para ${curr.name} en este período. Nota: el código ${curr.code} en el PDF corresponde a "${collidingPdfSubject.name}".`
        : 'Sin grupos publicados / No disponible para este período';
      const item: ReconciledCatalogItem = {
        id: `curr:${curr.code}`,
        kind: 'curriculum',
        status: 'unoffered',
        semester: curr.semester,
        romanSemester: curr.romanSemester,
        curriculumCode: curr.code,
        curriculumName: curr.name,
        credits: curr.credits,
        area: curr.area,
        offering: null,
        offeringCode: null,
        offeringName: null,
        choiceCode: null,
        matchOrigin: 'unoffered',
        matchNote: collisionWarning,
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
      credits: null,
      area: null,
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

    // 3. Modality filter (when active)
    if (modality === 'campus') {
      if (!item.offering) return false;
      if (!item.offering.groups.some(g => !EXTERNAL_GROUP_RE.test(g.label))) return false;
    } else if (modality === 'external') {
      if (!item.offering) return false;
      if (!item.offering.groups.some(g => EXTERNAL_GROUP_RE.test(g.label))) return false;
    }

    // 4. Teacher filter (when active)
    if (normTeacher) {
      if (!item.offering) return false;
      const matchesTeacher = item.offering.groups.some(
        g =>
          (g.teacherId && normalizeText(g.teacherId) === normTeacher) ||
          (g.teacher && normalizeText(g.teacher).includes(normTeacher))
      );
      if (!matchesTeacher) return false;
    }

    // 5. Text search (code, name, area, offering code, teachers)
    if (normQuery) {
      const parts = [
        item.curriculumCode,
        item.curriculumName,
        item.area || '',
        item.romanSemester ? `SEMESTRE ${item.romanSemester}` : '',
        item.offeringCode ?? '',
        item.offeringName ?? '',
        ...(item.offering ? item.offering.groups.map(g => g.teacher || '') : []),
      ];
      const haystack = normalizeText(parts.join(' '));
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
};

export function computeSemesterCounts(
  items: readonly ReconciledCatalogItem[]
): Record<SemesterFilterValue, SemesterCountSummary> {
  const result: Record<SemesterFilterValue, SemesterCountSummary> = {
    all: { total: 0, available: 0, unoffered: 0, credits: 0 },
    '1': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '2': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '3': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '4': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '5': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '6': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '7': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '8': { total: 0, available: 0, unoffered: 0, credits: 0 },
    '9': { total: 0, available: 0, unoffered: 0, credits: 0 },
    other: { total: 0, available: 0, unoffered: 0, credits: 0 },
  };

  for (const item of items) {
    const isAvail = item.offering !== null && item.offering.groups.length > 0;
    result.all.total += 1;
    if (isAvail) result.all.available += 1;
    else result.all.unoffered += 1;
    result.all.credits += item.credits || 0;

    if (item.kind === 'curriculum' && item.semester) {
      const key = String(item.semester) as SemesterFilterValue;
      result[key].total += 1;
      if (isAvail) result[key].available += 1;
      else result[key].unoffered += 1;
      result[key].credits += item.credits || 0;
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
 * Supports both direct offering codes in catalog.subjects and canonical curriculum codes
 * that have a validated, non-colliding linked offering in the catalog.
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
  const direct = catalog.subjects.find(s => s.code === choice.code);
  if (direct) return direct;

  const rec = reconciled || reconcileCurriculumAndCatalog(catalog);
  const byCurr = rec.byCurriculumCode.get(choice.code.toUpperCase());
  if (byCurr && byCurr.offering) return byCurr.offering;
  return undefined;
}

/**
 * Normalizes/migrates persisted or imported choices so they remain compatible
 * with the active catalog without losing valid selections.
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
    let targetItem = rec.byOfferingCode.get(ch.code);
    if (!targetItem && ch.curriculumCode) {
      const currCandidate = rec.byCurriculumCode.get(ch.curriculumCode.toUpperCase());
      if (currCandidate?.offering) targetItem = currCandidate;
    }
    if (!targetItem) {
      const currCandidate = rec.byCurriculumCode.get(ch.code.toUpperCase());
      if (currCandidate?.offering) targetItem = currCandidate;
    }

    const effectiveCode = targetItem?.choiceCode || ch.code;
    if (seenCodes.has(effectiveCode)) continue;
    seenCodes.add(effectiveCode);

    migrated.push({
      ...ch,
      code: effectiveCode,
      curriculumCode: targetItem?.kind === 'curriculum' ? targetItem.curriculumCode : ch.curriculumCode,
    });
  }

  return migrated;
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

export function loadPersistedSemesterFilter(): SemesterFilterValue {
  if (typeof window === 'undefined') return 'all';
  try {
    // 1. Check URL search params (?semestre=III) or hash query (#planificador?semestre=III)
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

    // 2. Fallback to localStorage if present and valid
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
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
  try {
    const url = new URL(window.location.href);
    const paramValue = formatSemesterParamForUrl(semester);
    if (paramValue) {
      url.searchParams.set('semestre', paramValue);
    } else {
      url.searchParams.delete('semestre');
      url.searchParams.delete('semester');
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore history API errors in non-browser test environments
  }
}
