import { describe, expect, it } from 'vitest';
import { assessTermSequence, inferTermFromText, nextTerm, pickActiveCatalogId } from './term';

describe('inferTermFromText', () => {
  it('detects the first-half term from Academusoft validity dates', () => {
    const result = inferTermFromText(['14:00 - 15:59', '01-02-2027', '30-06-2027', '01-02-2027']);
    expect(result).toEqual({ term: '2027-1', period: '01-02-2027 al 30-06-2027' });
  });

  it('detects the second-half term', () => {
    expect(inferTermFromText(['03-08-2026', '15-12-2026'])?.term).toBe('2026-2');
  });

  it('uses the most frequent start date when a PDF mixes ranges', () => {
    const lines = ['01-02-2027', '30-06-2027', '01-02-2027', '30-06-2027', '15-03-2027', '30-04-2027'];
    expect(inferTermFromText(lines)).toEqual({ term: '2027-1', period: '01-02-2027 al 30-06-2027' });
  });

  it('returns null when no dates are present', () => {
    expect(inferTermFromText(['SS301 - ESTRUCTURA DE DATOS', '08:00 - 09:59'])).toBeNull();
  });
});

describe('nextTerm', () => {
  it('rolls the second half into the next year', () => {
    expect(nextTerm('2026-2')).toBe('2027-1');
  });
  it('moves the first half to the second half', () => {
    expect(nextTerm('2027-1')).toBe('2027-2');
  });
  it('returns null for unparseable terms', () => {
    expect(nextTerm('Por definir')).toBeNull();
  });
});

describe('assessTermSequence', () => {
  it('accepts the term right after the active one', () => {
    expect(assessTermSequence('2026-2', '2027-1').status).toBe('next');
  });
  it('flags a re-import of the same term', () => {
    const result = assessTermSequence('2026-2', '2026-2');
    expect(result.status).toBe('same');
    expect(result.message).toMatch(/mismo período/i);
  });
  it('flags an older term as outdated', () => {
    const result = assessTermSequence('2026-2', '2026-1');
    expect(result.status).toBe('older');
    expect(result.message).toMatch(/2027-1/);
  });
  it('flags a skipped term', () => {
    const result = assessTermSequence('2026-2', '2027-2');
    expect(result.status).toBe('gap');
    expect(result.message).toMatch(/2027-1/);
  });
  it('reports unknown when the incoming term cannot be read', () => {
    expect(assessTermSequence('2026-2', '').status).toBe('unknown');
  });
});

describe('pickActiveCatalogId', () => {
  const base = { id: 'base', importedAt: undefined };
  const older = { id: 'imp-1', importedAt: 100 };
  const newer = { id: 'imp-2', importedAt: 200 };

  it('restores the stored active catalog when it still exists', () => {
    expect(pickActiveCatalogId([base, older, newer], 'imp-1', 'base')).toBe('imp-1');
  });
  it('defaults to the most recently imported catalog instead of the base one', () => {
    expect(pickActiveCatalogId([base, older, newer], null, 'base')).toBe('imp-2');
  });
  it('ignores a stored id that no longer exists', () => {
    expect(pickActiveCatalogId([base, older], 'gone', 'base')).toBe('imp-1');
  });
  it('falls back to the base catalog when nothing was imported', () => {
    expect(pickActiveCatalogId([base], null, 'base')).toBe('base');
  });
});
