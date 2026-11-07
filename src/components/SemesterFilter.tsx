import { useRef } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { RomanSemester, SemesterFilterValue, SemesterNumber } from '../lib/types';
import { ROMAN_SEMESTERS, SEMESTER_NUMBERS, type SemesterCountSummary } from '../lib/curriculum';

type SemesterOption = {
  value: SemesterFilterValue;
  label: string;
  ariaLabel: string;
};

type SemesterFilterProps = {
  value: SemesterFilterValue;
  onChange: (next: SemesterFilterValue) => void;
  counts: Record<SemesterFilterValue, SemesterCountSummary>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  catalogTerm: string;
};

export function SemesterFilter({
  value,
  onChange,
  counts,
  hasActiveFilters,
  onClearFilters,
  catalogTerm,
}: SemesterFilterProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const options: SemesterOption[] = [
    {
      value: 'all',
      label: 'Todos',
      ariaLabel: `Todos los semestres (${counts.all.total} materias)`,
    },
    ...SEMESTER_NUMBERS.map((num: SemesterNumber) => {
      const roman: RomanSemester = ROMAN_SEMESTERS[num];
      const key = String(num) as SemesterFilterValue;
      const c = counts[key];
      return {
        value: key,
        label: roman,
        ariaLabel: `Semestre ${roman} (${c.total} materias, ${c.credits} créditos)`,
      };
    }),
    ...(counts.other.total > 0 || value === 'other'
      ? [
          {
            value: 'other' as SemesterFilterValue,
            label: 'Otras',
            ariaLabel: `Otras / sin clasificación curricular (${counts.other.total} materias)`,
          },
        ]
      : []),
  ];

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = options.length - 1;
    }
    if (nextIndex >= 0) {
      e.preventDefault();
      const target = options[nextIndex];
      onChange(target.value);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  const activeSummary = counts[value] || counts.all;
  const activeRoman =
    value !== 'all' && value !== 'other' ? ROMAN_SEMESTERS[Number(value) as SemesterNumber] : null;

  return (
    <div className="semester-filter" role="region" aria-label="Filtro por semestre curricular">
      <div className="semester-filter-head">
        <span className="semester-filter-label">SEMESTRE DEL PENSUM</span>
        {hasActiveFilters && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={onClearFilters}
            aria-label="Limpiar filtros de catálogo"
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      <div
        className="semester-chips"
        role="toolbar"
        aria-label="Filtrar materias por semestre del pensum"
      >
        {options.map((opt, idx) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={el => {
                tabRefs.current[idx] = el;
              }}
              type="button"
              aria-pressed={active}
              aria-label={opt.ariaLabel}
              className={'semester-chip' + (active ? ' active' : '')}
              onClick={() => onChange(opt.value)}
              onKeyDown={e => handleKeyDown(e, idx)}
            >
              {active && <Check size={12} strokeWidth={3} aria-hidden="true" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="semester-summary-bar" aria-live="polite">
        {activeRoman ? (
          <span>
            <strong>Semestre {activeRoman}:</strong> {activeSummary.total} materias ·{' '}
            {activeSummary.credits} créditos · {activeSummary.available} con grupos en {catalogTerm}
          </span>
        ) : value === 'other' ? (
          <span>
            <strong>Otras / sin clasificación:</strong> {activeSummary.total} materias fuera de la malla
          </span>
        ) : (
          <span>
            <strong>Malla oficial (I–IX):</strong> 62 materias · 155 créditos ·{' '}
            {counts.all.available} con grupos en {catalogTerm}
          </span>
        )}
      </div>
    </div>
  );
}
