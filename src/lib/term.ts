/** Academic term helpers: detection from Academusoft text, sequencing, and active-catalog choice. */

const DATE = /\b(\d{2})-(\d{2})-(\d{4})\b/;
const TERM = /^(\d{4})\s*[-–]\s*([12])$/;

export type TermInfo = { term: string; period: string };

const toKey = (d: string) => {
  const [, dd, mm, yyyy] = DATE.exec(d)!;
  return Number(`${yyyy}${mm}${dd}`);
};

/**
 * Infers the term from the validity dates Academusoft prints on every session
 * (for example `01-02-2027` … `30-06-2027`). The most frequent start date wins.
 */
export function inferTermFromText(lines: string[]): TermInfo | null {
  const dates = lines.map(l => DATE.exec(l)?.[0]).filter((d): d is string => Boolean(d));
  if (!dates.length) return null;
  // Sessions print a start date followed by an end date; count those pairs.
  const pairs = new Map<string, number>();
  for (let i = 0; i < dates.length - 1; ) {
    if (toKey(dates[i + 1]) > toKey(dates[i])) {
      const key = `${dates[i]}|${dates[i + 1]}`;
      pairs.set(key, (pairs.get(key) || 0) + 1);
      i += 2;
    } else i += 1;
  }
  const best = [...pairs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const [start, end] = best ? best.split('|') : [dates[0], dates[0]];
  const [, , mm, yyyy] = DATE.exec(start)!;
  return { term: `${yyyy}-${Number(mm) <= 6 ? 1 : 2}`, period: `${start} al ${end}` };
}

export function parseTerm(term: string): { year: number; half: 1 | 2 } | null {
  const match = TERM.exec(term.trim());
  return match ? { year: Number(match[1]), half: Number(match[2]) as 1 | 2 } : null;
}

export function nextTerm(term: string): string | null {
  const t = parseTerm(term);
  if (!t) return null;
  return t.half === 1 ? `${t.year}-2` : `${t.year + 1}-1`;
}

const ordinal = (t: { year: number; half: number }) => t.year * 2 + (t.half - 1);

export type TermSequence = {
  status: 'next' | 'same' | 'older' | 'gap' | 'unknown';
  expected: string | null;
  message: string;
};

/** Compares the incoming term against the active one and explains the risk when it is not the next term. */
export function assessTermSequence(activeTerm: string, incomingTerm: string): TermSequence {
  const expected = nextTerm(activeTerm);
  const active = parseTerm(activeTerm);
  const incoming = parseTerm(incomingTerm);
  if (!active || !incoming || !expected) {
    return {
      status: 'unknown',
      expected,
      message: 'No se pudo identificar el período del archivo. Escríbelo para poder compararlo.',
    };
  }
  const diff = ordinal(incoming) - ordinal(active);
  if (diff === 1) {
    return { status: 'next', expected, message: `Es el período siguiente a ${activeTerm}.` };
  }
  if (diff === 0) {
    return {
      status: 'same',
      expected,
      message: `Es el mismo período que ya tienes cargado (${activeTerm}). Úsalo solo si la universidad publicó una actualización.`,
    };
  }
  if (diff < 0) {
    return {
      status: 'older',
      expected,
      message: `Este horario es de ${incomingTerm}, anterior al que tienes cargado (${activeTerm}). No está actualizado: el siguiente debería ser ${expected}.`,
    };
  }
  return {
    status: 'gap',
    expected,
    message: `Este horario es de ${incomingTerm}, pero el siguiente a ${activeTerm} es ${expected}. Las estimaciones de docentes pueden ser poco fiables al saltar semestres.`,
  };
}

/** Restores the stored active catalog, otherwise prefers the newest import over the bundled one. */
export function pickActiveCatalogId(
  catalogs: { id: string; importedAt?: number }[],
  storedId: string | null,
  fallbackId: string,
): string {
  if (storedId && catalogs.some(c => c.id === storedId)) return storedId;
  const imported = catalogs
    .filter(c => c.id !== fallbackId && c.importedAt)
    .sort((a, b) => (b.importedAt || 0) - (a.importedAt || 0));
  return imported[0]?.id || fallbackId;
}
