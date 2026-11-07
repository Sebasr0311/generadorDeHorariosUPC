import { describe, expect, it } from 'vitest';
import sampleCatalog from '../data/catalogo-base.json';
import {
  CURRICULUM_SUBJECTS,
  EXPECTED_SEMESTER_TOTALS,
  SEMESTER_NUMBERS,
  computeSemesterCounts,
  filterReconciledItems,
  getCurriculumSummary,
  migrateChoicesForCatalog,
  parseSemesterFilterParam,
  reconcileCurriculumAndCatalog,
} from './curriculum';
import { generateSchedules } from './generator';
import type { Catalog } from './types';
import { DEFAULT_PREFERENCES } from './types';

const baseCatalog = sampleCatalog as Catalog;

describe('Malla curricular Ingeniería de Sistemas UPC (fuente de verdad)', () => {
  it('contiene exactamente 9 semestres, 62 materias y 155 créditos con la distribución oficial (Criterio A)', () => {
    const summary = getCurriculumSummary(CURRICULUM_SUBJECTS);
    expect(summary.totalSemesters).toBe(9);
    expect(summary.totalSubjects).toBe(62);
    expect(summary.totalCredits).toBe(155);

    for (const sem of SEMESTER_NUMBERS) {
      expect(summary.bySemester[sem].subjects).toBe(EXPECTED_SEMESTER_TOTALS[sem].subjects);
      expect(summary.bySemester[sem].credits).toBe(EXPECTED_SEMESTER_TOTALS[sem].credits);
    }
  });

  it('muestra para cada semestre exclusivamente sus materias canónicas antes de aplicar búsqueda (Criterio B)', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);
    const counts = computeSemesterCounts(reconciled.items);

    for (const sem of SEMESTER_NUMBERS) {
      const semKey = String(sem) as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
      const filtered = filterReconciledItems(reconciled.items, { semester: semKey, search: '' });
      const expectedCanonical = CURRICULUM_SUBJECTS.filter(c => c.semester === sem);

      expect(filtered).toHaveLength(expectedCanonical.length);
      expect(counts[semKey].total).toBe(expectedCanonical.length);
      expect(counts[semKey].credits).toBe(EXPECTED_SEMESTER_TOTALS[sem].credits);
      expect(filtered.map(item => item.curriculumCode)).toEqual(expectedCanonical.map(c => c.code));
      expect(filtered.map(item => item.curriculumName)).toEqual(expectedCanonical.map(c => c.name));
      expect(filtered.every(item => item.semester === sem)).toBe(true);
    }
  });
});

describe('Conciliación explícita entre malla curricular y PDF de horarios (Criterios E y F)', () => {
  it('resuelve correctamente las 53 materias ofertadas en 2026-2 y mantiene visibles las 9 sin oferta (Criterio E)', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);
    const available = reconciled.curriculumItems.filter(i => i.status === 'available');
    const unoffered = reconciled.curriculumItems.filter(i => i.status === 'unoffered');

    expect(reconciled.curriculumItems).toHaveLength(62);
    expect(available).toHaveLength(53);
    expect(unoffered).toHaveLength(9);
    expect(reconciled.extraItems).toHaveLength(0);

    for (const missing of unoffered) {
      expect(missing.offering).toBeNull();
      expect(missing.choiceCode).toBeNull();
      expect(missing.matchOrigin).toBe('unoffered');
    }
  });

  it('evita vinculaciones falsas ante colisiones de código malla vs PDF como SS802, SS706 y SS806 (Criterio F)', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);

    // SS503 en malla es Base de Datos Avanzadas (Sem. V), pero en el PDF tiene código SS802
    const bda = reconciled.byCurriculumCode.get('SS503')!;
    expect(bda.semester).toBe(5);
    expect(bda.curriculumName).toBe('Base de Datos Avanzadas');
    expect(bda.status).toBe('available');
    expect(bda.offeringCode).toBe('SS802');
    expect(bda.matchOrigin).toBe('validated-equivalence');

    // SS802 en malla es Gestión de Proyectos TI (Sem. VIII) y NO tiene grupos en el PDF 2026-2
    const gpti = reconciled.byCurriculumCode.get('SS802')!;
    expect(gpti.semester).toBe(8);
    expect(gpti.curriculumName).toBe('Gestión de Proyectos TI');
    expect(gpti.status).toBe('unoffered');
    expect(gpti.offering).toBeNull();
    expect(gpti.choiceCode).toBeNull();

    // SS706 en malla es Cátedra Ambiental (Sem. VI, PDF UPC25), mientras SS706 en PDF es Ing. Software III (malla SS704, Sem. VII)
    const ambiental = reconciled.byCurriculumCode.get('SS706')!;
    expect(ambiental.semester).toBe(6);
    expect(ambiental.offeringCode).toBe('UPC25');

    const sw3 = reconciled.byCurriculumCode.get('SS704')!;
    expect(sw3.semester).toBe(7);
    expect(sw3.offeringCode).toBe('SS706');

    // SS803 en malla es Seguridad de la Información (PDF SS806), mientras SS806 en malla es Ética Profesional (PDF SS811)
    const seguridad = reconciled.byCurriculumCode.get('SS803')!;
    expect(seguridad.semester).toBe(8);
    expect(seguridad.offeringCode).toBe('SS806');

    const etica = reconciled.byCurriculumCode.get('SS806')!;
    expect(etica.semester).toBe(8);
    expect(etica.offeringCode).toBe('SS811');
  });

  it('marca como "review-required" cualquier colisión ambigua de código y conserva materias extras en "Otras"', () => {
    const customCatalog: Catalog = {
      ...baseCatalog,
      subjects: [
        ...baseCatalog.subjects,
        {
          code: 'EC105',
          name: 'MATERIA DESCONOCIDA CON CODIGO DE ELECTIVA',
          groups: [
            {
              id: 'EC105::01',
              label: '01',
              teacher: null,
              teacherId: null,
              teacherSource: 'unassigned',
              sessions: [{ day: 0, start: 480, end: 600, room: '101' }],
            },
          ],
        },
        {
          code: 'EX999',
          name: 'SEMINARIO INTERNACIONAL EXTRA',
          groups: [
            {
              id: 'EX999::01',
              label: '01',
              teacher: null,
              teacherId: null,
              teacherSource: 'unassigned',
              sessions: [{ day: 1, start: 480, end: 600, room: '102' }],
            },
          ],
        },
      ],
    };

    const reconciled = reconcileCurriculumAndCatalog(customCatalog);
    // EC105 en la malla no debe vincularse falsamente porque el nombre no coincide
    expect(reconciled.byCurriculumCode.get('EC105')?.status).toBe('unoffered');

    const otherFiltered = filterReconciledItems(reconciled.items, { semester: 'other', search: '' });
    expect(otherFiltered).toHaveLength(2);
    expect(otherFiltered.find(x => x.offeringCode === 'EC105')?.status).toBe('review-required');
    expect(otherFiltered.find(x => x.offeringCode === 'EX999')?.status).toBe('extra-offering');
  });
});

describe('Búsqueda combinada y selección multi-semestre (Criterios C y D)', () => {
  it('busca por código y nombre con o sin tildes y mayúsculas en intersección con el semestre (Criterio C)', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);

    // En semestre III: buscar "calculo multivariable" sin tilde
    const sem3Calc = filterReconciledItems(reconciled.items, {
      semester: '3',
      search: 'calculo multivariable',
    });
    expect(sem3Calc).toHaveLength(1);
    expect(sem3Calc[0].curriculumCode).toBe('MT331');

    // En semestre III: buscar una materia de semestre I ("Calculo Diferencial") debe dar vacío
    const sem3Diff = filterReconciledItems(reconciled.items, {
      semester: '3',
      search: 'Calculo Diferencial',
    });
    expect(sem3Diff).toHaveLength(0);

    // En semestre V: buscar por código de malla SS503 o por código de PDF SS802 encuentra Base de Datos Avanzadas
    expect(
      filterReconciledItems(reconciled.items, { semester: '5', search: 'ss503' }).map(x => x.curriculumCode)
    ).toEqual(['SS503']);
    expect(
      filterReconciledItems(reconciled.items, { semester: '5', search: 'SS802' }).map(x => x.curriculumCode)
    ).toEqual(['SS503']);

    // En semestre VIII: buscar SS802 encuentra Gestión de Proyectos TI (y nunca trae Base de Datos Avanzadas de V)
    const sem8Code = filterReconciledItems(reconciled.items, { semester: '8', search: 'SS802' });
    expect(sem8Code).toHaveLength(1);
    expect(sem8Code[0].curriculumCode).toBe('SS802');
    expect(sem8Code[0].curriculumName).toBe('Gestión de Proyectos TI');
    expect(sem8Code[0].status).toBe('unoffered');
  });

  it('permite combinar materias de distintos semestres (ej. III y V) en el generador sin restricciones artificiales (Criterio D)', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);
    const estDatos = reconciled.byCurriculumCode.get('SS301')!; // Semestre III
    const bdAvanzadas = reconciled.byCurriculumCode.get('SS503')!; // Semestre V (offering SS802)

    expect(estDatos.semester).toBe(3);
    expect(bdAvanzadas.semester).toBe(5);

    const choices = migrateChoicesForCatalog(
      [
        { code: estDatos.choiceCode!, curriculumCode: estDatos.curriculumCode },
        { code: bdAvanzadas.choiceCode!, curriculumCode: bdAvanzadas.curriculumCode },
      ],
      baseCatalog,
      reconciled
    );

    const generated = generateSchedules(baseCatalog, choices, DEFAULT_PREFERENCES);
    expect(generated.infeasible).toBe(false);
    expect(generated.schedules.length).toBeGreaterThan(0);
    expect(generated.schedules[0].groups).toHaveLength(2);
  });

  it('valida y normaliza parámetros de semestre desde URL o almacenamiento (Criterio H)', () => {
    expect(parseSemesterFilterParam('III')).toBe('3');
    expect(parseSemesterFilterParam('ix')).toBe('9');
    expect(parseSemesterFilterParam('5')).toBe('5');
    expect(parseSemesterFilterParam('todos')).toBe('all');
    expect(parseSemesterFilterParam('otras')).toBe('other');
    expect(parseSemesterFilterParam('invalido')).toBe('all');
    expect(parseSemesterFilterParam(null)).toBe('all');
  });
});
