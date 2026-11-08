import { describe, expect, it } from 'vitest';
import sampleCatalog from '../data/catalogo-base.json';
import { generateSchedules } from './generator';
import {
  CURRICULUM_COURSES,
  CURRICULUM_INDEX,
  EXPECTED_SEMESTER_TOTALS,
  SEMESTER_NUMBERS,
  computeSemesterCounts,
  describeCourseRequirements,
  filterReconciledItems,
  formatHoursValue,
  formatSemesterParamForUrl,
  getCurriculumSummary,
  parseSemesterFilterParam,
  reconcileCurriculumAndCatalog,
  reconcileSelectionWithNewCatalog,
} from './curriculum';
import type { Catalog, Choice, SemesterFilterValue } from './types';

const baseCatalog = sampleCatalog as Catalog;

describe('Pénsum oficial UPC (PENSUM_UPC_DATOS.json) y módulo Mi pensum', () => {
  it('verifica integridad de datos: 62 materias únicas, 9 períodos detallados, distribución [7,8,8,7,7,7,7,7,4], suma 155, período 10 sin información y 11 requisitos numéricos', () => {
    const summary = getCurriculumSummary();
    expect(summary.totalSemesters).toBe(9);
    expect(summary.declaredPeriods).toBe(10);
    expect(summary.period10Status).toBe('sin información suministrada');
    expect(summary.period10Note).toContain('El período 10 no tiene información en la fuente suministrada');
    expect(summary.totalSubjects).toBe(62);
    expect(summary.totalAcademicWeight).toBe(155);
    expect(summary.totalCredits).toBe(155);

    // Códigos únicos
    const uniqueCodes = new Set(CURRICULUM_COURSES.map(c => c.code));
    expect(uniqueCodes.size).toBe(62);

    // Distribución por período [7,8,8,7,7,7,7,7,4] y ponderación [16,18,19,19,18,18,17,17,13]
    const distCounts = SEMESTER_NUMBERS.map(s => summary.bySemester[s].subjects);
    const distWeights = SEMESTER_NUMBERS.map(s => summary.bySemester[s].academicWeight);
    expect(distCounts).toEqual([7, 8, 8, 7, 7, 7, 7, 7, 4]);
    expect(distWeights).toEqual([16, 18, 19, 19, 18, 18, 17, 17, 13]);

    for (const sem of SEMESTER_NUMBERS) {
      expect(summary.bySemester[sem].subjects).toBe(EXPECTED_SEMESTER_TOTALS[sem].subjects);
      expect(summary.bySemester[sem].academicWeight).toBe(EXPECTED_SEMESTER_TOTALS[sem].academicWeight);
    }

    // 11 asignaturas con requisitos numéricos de créditos
    const expectedNumericCredits: Record<string, number> = {
      SS802: 70,
      AI700: 80,
      SS810: 80,
      SS811: 115,
      SS807: 115,
      SS808: 115,
      SS812: 115,
      SS806: 115,
      SS906: 132,
      SS907: 132,
      SS908: 132,
    };
    const actualNumeric = Object.fromEntries(
      summary.numericCreditCourses.map(c => [c.code, c.requiredCredits])
    );
    expect(summary.numericCreditCourses).toHaveLength(11);
    expect(actualNumeric).toEqual(expectedNumericCredits);

    // Conservación de HT, HP, HTP diferenciados con null -> '—' y nombre original abreviado
    const upc08 = CURRICULUM_INDEX.byCode.get('UPC08')!;
    expect(upc08.ht).toBeNull();
    expect(upc08.hp).toBeNull();
    expect(upc08.htp).toBe(2);
    expect(formatHoursValue(upc08.ht)).toBe('—');
    expect(formatHoursValue(upc08.htp)).toBe('2');

    const fc407 = CURRICULUM_INDEX.byCode.get('FC407')!;
    expect(fc407.name).toBe('FORMULACION Y EVALU DE PROYEC EN INGENIERIA');
    expect(fc407.displayName).toBe('FORMULACION Y EVALUACION DE PROYECTOS EN INGENIERIA');
  });

  it('verifica las 37 relaciones de prerrequisitos por asignatura y su descripción por nombre completo', () => {
    const summary = getCurriculumSummary();
    expect(summary.totalPrerequisiteRelations).toBe(37);

    // Cada código de prerrequisito existe en el índice del pensum
    for (const course of CURRICULUM_COURSES) {
      for (const prereqCode of course.prerequisiteCodes) {
        expect(CURRICULUM_INDEX.byCode.has(prereqCode)).toBe(true);
      }
    }

    // Verificaciones explícitas requeridas: SS301, SS463, SS909
    const ss301 = CURRICULUM_INDEX.byCode.get('SS301')!;
    const req301 = describeCourseRequirements(ss301);
    expect(ss301.prerequisiteNames).toEqual(['PROGRAMACION DE COMPUTADORES I']);
    expect(req301.primaryMessage).toContain('Debes haber aprobado PROGRAMACION DE COMPUTADORES I');
    expect(req301.subjectPrerequisites[0].rawCodeLabel).toBe('R - SS200');

    const ss463 = CURRICULUM_INDEX.byCode.get('SS463')!;
    const req463 = describeCourseRequirements(ss463);
    expect(ss463.prerequisiteNames).toEqual(['ESTRUCTURA DE DATOS']);
    expect(req463.primaryMessage).toContain('Debes haber aprobado ESTRUCTURA DE DATOS');

    const ss909 = CURRICULUM_INDEX.byCode.get('SS909')!;
    const req909 = describeCourseRequirements(ss909);
    expect(ss909.prerequisiteNames).toEqual(['PROYECTO DE GRADO I']);
    expect(req909.primaryMessage).toContain('Debes haber aprobado PROYECTO DE GRADO I');

    // No confundir Ponderación Académica con Créditos Requisitos
    const ss802 = CURRICULUM_INDEX.byCode.get('SS802')!;
    const req802 = describeCourseRequirements(ss802);
    expect(ss802.academicWeight).toBe(3);
    expect(ss802.requiredCredits).toBe(70);
    expect(req802.creditRequirement?.message).toBe('Requiere 70 créditos');
    expect(req802.subjectPrerequisites).toHaveLength(0);
  });

  it('encuentra el mismo elemento buscando por "electromagnetismo", "ELECTROMAGNETISMO", variantes con tilde y código "FS400"', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);

    const byLower = filterReconciledItems(reconciled.curriculumItems, {
      semester: 'all',
      search: 'electromagnetismo',
    });
    const byUpper = filterReconciledItems(reconciled.curriculumItems, {
      semester: 'all',
      search: 'ELECTROMAGNETISMO',
    });
    const byAccented = filterReconciledItems(reconciled.curriculumItems, {
      semester: 'all',
      search: 'electromagnétismo',
    });
    const byCode = filterReconciledItems(reconciled.curriculumItems, {
      semester: 'all',
      search: 'FS400',
    });

    expect(byLower.map(i => i.curriculumCode)).toEqual(['FS400']);
    expect(byUpper.map(i => i.curriculumCode)).toEqual(['FS400']);
    expect(byAccented.map(i => i.curriculumCode)).toEqual(['FS400']);
    expect(byCode.map(i => i.curriculumCode)).toEqual(['FS400']);
  });

  it('filtra cada semestre I–IX devolviendo exclusivamente sus asignaturas canónicas y identifica las 9 sin grupos en 2026-2', () => {
    const reconciled = reconcileCurriculumAndCatalog(baseCatalog);
    const counts = computeSemesterCounts(reconciled.items);

    expect(counts.all.total).toBe(62);
    expect(counts.all.available).toBe(53);
    expect(counts.all.unoffered).toBe(9);
    expect(counts.other.total).toBe(0);

    for (const sem of SEMESTER_NUMBERS) {
      const filtered = filterReconciledItems(reconciled.items, {
        semester: String(sem) as SemesterFilterValue,
        search: '',
      });
      expect(filtered).toHaveLength(EXPECTED_SEMESTER_TOTALS[sem].subjects);
      expect(filtered.every(i => i.semester === sem)).toBe(true);
    }

    const unofferedCodes = reconciled.curriculumItems
      .filter(i => i.status === 'unoffered')
      .map(i => i.curriculumCode);
    expect(unofferedCodes).toEqual([
      'SS705',
      'SS810',
      'SS809',
      'SS807',
      'SS808',
      'SS906',
      'SS907',
      'SS908',
      'SS909',
    ]);
  });

  it('detecta divergencias de código o nombre sin fusionar automáticamente', () => {
    const divergentCatalog: Catalog = {
      ...baseCatalog,
      id: 'divergent-test',
      subjects: [
        ...baseCatalog.subjects,
        {
          // Código que existe en pensum (SS809 = GESTION DE PROYECTOS TI) pero con otro nombre
          code: 'SS809',
          name: 'MATERIA DISTINTA CON CODIGO EN COLISION',
          groups: [
            {
              id: 'SS809::01',
              label: '01',
              teacherId: null,
              teacher: null,
              teacherSource: 'unassigned',
              sessions: [{ day: 0, start: 360, end: 480, room: 'A1' }],
            },
          ],
        },
        {
          // Otro código (BROCHURE99) pero nombre idéntico a una materia del pensum
          code: 'BROCHURE99',
          name: 'TRABAJO DE GRADO II',
          groups: [
            {
              id: 'BROCHURE99::01',
              label: '01',
              teacherId: null,
              teacher: null,
              teacherSource: 'unassigned',
              sessions: [{ day: 1, start: 360, end: 480, room: 'A2' }],
            },
          ],
        },
      ],
    };

    const rec = reconcileCurriculumAndCatalog(divergentCatalog);
    // ni SS809 ni SS909 deben fusionarse automáticamente con los códigos divergentes
    expect(rec.byCurriculumCode.get('SS809')?.offering).toBeNull();
    expect(rec.byCurriculumCode.get('SS909')?.offering).toBeNull();
    expect(rec.incidents.some(i => i.type === 'code-divergence' && i.offeringCode === 'SS809')).toBe(
      true
    );
    expect(
      rec.incidents.some(
        i => i.type === 'name-similarity-divergence' && i.offeringCode === 'BROCHURE99'
      )
    ).toBe(true);
  });

  it('permite selección multisemestre (I, III, V) y genera horarios conjuntos sin cruces', () => {
    const choices: Choice[] = [
      { code: 'SS407', curriculumCode: 'SS407', teacherMode: 'any' }, // Sem I
      { code: 'SS301', curriculumCode: 'SS301', teacherMode: 'any' }, // Sem III
      { code: 'SS802', curriculumCode: 'SS802', teacherMode: 'any' }, // Sem V (Base de Datos Avanzadas)
    ];

    const result = generateSchedules(baseCatalog, choices, {
      earliest: 360,
      latest: 1320,
      freeDays: [],
      mode: 'compact',
      campusOnly: true,
      allowUnknown: true,
    });

    expect(result.infeasible).toBe(false);
    expect(result.schedules.length).toBeGreaterThan(0);
    expect(result.schedules[0].groups.map(g => g.code).sort()).toEqual(['SS301', 'SS407', 'SS802']);
  });

  it('conserva la selección al importar/cambiar catálogo y avisa si una materia o grupo fijado deja de estar disponible', () => {
    const initialChoices: Choice[] = [
      {
        code: 'SS301',
        curriculumCode: 'SS301',
        pinnedGroup: 'SS301::01-CAMPUS',
        teacherMode: 'any',
      },
      {
        code: 'SS802',
        curriculumCode: 'SS802',
        teacherMode: 'any',
      },
    ];

    // Nuevo catálogo donde SS802 ya no tiene grupos y el grupo 01-CAMPUS de SS301 desapareció
    const reducedCatalog: Catalog = {
      ...baseCatalog,
      id: '2027-1',
      term: '2027-1',
      subjects: baseCatalog.subjects
        .filter(s => s.code !== 'SS802')
        .map(s =>
          s.code === 'SS301'
            ? { ...s, groups: s.groups.filter(g => g.id !== 'SS301::01-CAMPUS') }
            : s
        ),
    };

    const { choices: reconciledChoices, warnings } = reconcileSelectionWithNewCatalog(
      initialChoices,
      reducedCatalog,
      baseCatalog
    );

    // Ambas materias siguen en la selección centralizada
    expect(reconciledChoices.map(c => c.code)).toEqual(['SS301', 'SS802']);
    // El grupo fijado desaparecido se limpió y generó aviso
    expect(reconciledChoices.find(c => c.code === 'SS301')?.pinnedGroup).toBeUndefined();
    expect(warnings.some(w => w.includes('SS802') && w.includes('no tiene grupos publicados'))).toBe(
      true
    );
    expect(warnings.some(w => w.includes('SS301') && w.includes('grupo fijado'))).toBe(true);
  });

  it('parsea y formatea el parámetro de semestre para URL y localStorage', () => {
    expect(parseSemesterFilterParam('III')).toBe('3');
    expect(parseSemesterFilterParam('5')).toBe('5');
    expect(parseSemesterFilterParam('todos')).toBe('all');
    expect(parseSemesterFilterParam('otras')).toBe('other');
    expect(formatSemesterParamForUrl('3')).toBe('III');
    expect(formatSemesterParamForUrl('all')).toBeNull();
  });
});
