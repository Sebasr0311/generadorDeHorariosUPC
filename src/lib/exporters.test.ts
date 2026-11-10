import { describe, expect, it } from 'vitest';
import { buildSubjectDetailRows, planGridSlots } from './exporters';
import type { Group, Schedule } from './types';

const group = (overrides: Partial<Group> = {}): Group => ({
  id: 'SS301::01-CAMPUS',
  label: '01 - CAMPUS',
  teacherId: 't1',
  teacher: 'ANA PEREZ',
  teacherSource: 'confirmed',
  sessions: [
    { day: 0, start: 480, end: 600, room: 'Aula 101' },
    { day: 2, start: 480, end: 600, room: 'Aula 101' },
  ],
  ...overrides,
});

const schedule = (groups: Schedule['groups']): Schedule => ({
  groups,
  score: 0,
  key: 'k',
  days: 2,
  gaps: 0,
  earliest: 480,
  latest: 600,
});

describe('buildSubjectDetailRows', () => {
  it('lists a subject that meets twice a week only once, with its sessions combined', () => {
    const rows = buildSubjectDetailRows(
      schedule([{ code: 'SS301', name: 'ESTRUCTURA DE DATOS', group: group() }])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: 'SS301',
      subject: 'ESTRUCTURA DE DATOS',
      group: '01 - CAMPUS',
      sessions: 'Lun 08:00–10:00, Mié 08:00–10:00',
      rooms: 'Aula 101',
      teacher: 'ANA PEREZ',
      teacherSource: 'confirmed',
    });
  });

  it('orders sessions by day and time and keeps distinct rooms', () => {
    const rows = buildSubjectDetailRows(
      schedule([
        {
          code: 'FS202',
          name: 'MECANICA',
          group: group({
            id: 'FS202::06',
            label: '06',
            teacher: null,
            teacherSource: 'unassigned',
            sessions: [
              { day: 3, start: 840, end: 960, room: 'Lab 2' },
              { day: 1, start: 600, end: 720, room: 'Aula 5' },
              { day: 1, start: 420, end: 480, room: '' },
            ],
          }),
        },
      ])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].sessions).toBe('Mar 07:00–08:00, Mar 10:00–12:00, Jue 14:00–16:00');
    expect(rows[0].rooms).toBe('Aula 5, Lab 2');
    expect(rows[0].teacher).toBeNull();
  });

  it('collapses repeated entries of the same subject and group', () => {
    const entry = { code: 'SS301', name: 'ESTRUCTURA DE DATOS', group: group() };
    const rows = buildSubjectDetailRows(
      schedule([entry, { ...entry }, { code: 'SS802', name: 'BD AVANZADAS', group: group({ id: 'SS802::02', label: '02' }) }])
    );
    expect(rows.map(r => `${r.code}/${r.group}`)).toEqual(['SS301/01 - CAMPUS', 'SS802/02']);
  });
});

describe('planGridSlots', () => {
  it('maps sessions to whole 30-minute rows even when they do not start on a slot boundary', () => {
    const slots = planGridSlots([{ day: 0, start: 1095, end: 1180 }], 360);
    expect(slots).toEqual([{ index: 0, column: 0, firstSlot: 24, lastSlot: 27 }]);
  });

  it('never assigns the same cell to two sessions after rounding', () => {
    // 18:00–19:40 rounds up into the 19:30 slot; 19:45–21:00 rounds down into it too.
    const slots = planGridSlots(
      [
        { day: 2, start: 1080, end: 1180 },
        { day: 2, start: 1185, end: 1260 },
        { day: 3, start: 1185, end: 1260 },
      ],
      360
    );
    expect(slots[0]).toMatchObject({ firstSlot: 24, lastSlot: 27 });
    expect(slots[1]).toMatchObject({ firstSlot: 28, lastSlot: 29 });
    expect(slots[2]).toMatchObject({ firstSlot: 27, lastSlot: 29 });
  });

  it('keeps a session fully swallowed by a previous one as a single shared slot instead of overlapping', () => {
    const slots = planGridSlots(
      [
        { day: 0, start: 480, end: 600 },
        { day: 0, start: 500, end: 590 },
      ],
      360
    );
    expect(slots[1]).toEqual({ index: 1, column: 0, firstSlot: null, lastSlot: null, sharedWith: 0 });
  });
});
