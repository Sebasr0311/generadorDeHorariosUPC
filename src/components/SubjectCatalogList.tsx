import { Check } from 'lucide-react';
import { ROMAN_SEMESTERS, describeCourseRequirements } from '../lib/curriculum';
import {
  normalizeName,
  type ReconciledCatalogItem,
  type SemesterFilterValue,
  type SemesterNumber,
} from '../lib/types';

type SubjectCatalogListProps = {
  items: ReconciledCatalogItem[];
  selectedChoiceCodes: Set<string>;
  semester: SemesterFilterValue;
  hasActiveFilters: boolean;
  onToggle: (item: ReconciledCatalogItem) => void;
  onSelectAllSemesters: () => void;
  onClearFilters: () => void;
};

export function SubjectCatalogList({
  items,
  selectedChoiceCodes,
  semester,
  hasActiveFilters,
  onToggle,
  onSelectAllSemesters,
  onClearFilters,
}: SubjectCatalogListProps) {
  const headingText =
    semester === 'all'
      ? 'TODAS LAS MATERIAS'
      : semester === 'other'
        ? 'OTRAS / SIN CLASIFICACIÓN CURRICULAR'
        : `SEMESTRE ${ROMAN_SEMESTERS[Number(semester) as SemesterNumber]}`;

  return (
    <div className="subject-list" role="region" aria-label={headingText}>
      <div className="list-label">
        <span>{headingText}</span>
        <span>{items.length}</span>
      </div>

      {items.map(item => {
        if (item.offering && item.choiceCode) {
          const checked = selectedChoiceCodes.has(item.choiceCode);
          const normCurr = normalizeName(item.curriculumName);
          const ariaLabel = [
            item.curriculumCode,
            item.curriculumName,
            normCurr !== item.curriculumName.toUpperCase() ? normCurr : '',
            item.offeringCode && item.offeringCode !== item.curriculumCode ? item.offeringCode : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={item.id}
              type="button"
              className={'subject-row' + (checked ? ' selected' : '')}
              onClick={() => onToggle(item)}
              aria-pressed={checked}
              aria-label={ariaLabel}
            >
              <span className={'checkbox-square' + (checked ? ' checked' : '')}>
                {checked && <Check size={13} />}
              </span>
              <span className="subject-text">
                <strong>{item.curriculumName}</strong>
                <small>
                  {item.kind === 'curriculum' ? (
                    <>
                      Sem. {item.romanSemester} · {item.curriculumCode}
                      {item.offeringCode && item.offeringCode !== item.curriculumCode
                        ? ` (PDF: ${item.offeringCode})`
                        : ''}{' '}
                      · {item.credits} cr. · {item.offering.groups.length}{' '}
                      {item.offering.groups.length === 1 ? 'grupo' : 'grupos'}
                    </>
                  ) : item.status === 'review-required' ? (
                    <>
                      No vinculado / Requiere revisión · {item.offeringCode} ·{' '}
                      {item.offering.groups.length} grupos
                    </>
                  ) : (
                    <>
                      Otras / sin clasificación curricular · {item.offeringCode} ·{' '}
                      {item.offering.groups.length} grupos
                    </>
                  )}
                </small>
              </span>
            </button>
          );
        }

        // Unoffered curriculum subject (MissingOfferingState)
        const reqInfo = describeCourseRequirements(item);
        return (
          <button
            key={item.id}
            type="button"
            disabled
            className="subject-row-unoffered"
            aria-disabled="true"
            aria-label={`${item.curriculumCode} ${item.curriculumName} · Sin grupos publicados / No disponible para este período`}
          >
            <span className="checkbox-square unoffered" aria-hidden="true">
              —
            </span>
            <span className="subject-text">
              <strong>{item.curriculumName}</strong>
              <small>
                Sem. {item.romanSemester} · {item.curriculumCode} · {item.credits} cr. ·{' '}
                {reqInfo.primaryMessage}
              </small>
              <small className="missing-offering-note">
                Sin grupos publicados / No disponible para este período
              </small>
            </span>
          </button>
        );
      })}

      {items.length === 0 && (
        <div className="empty-list" role="status">
          <p>No se encontraron materias con los filtros actuales.</p>
          <div className="empty-list-actions">
            {semester !== 'all' && (
              <button
                type="button"
                className="btn-outline small"
                onClick={onSelectAllSemesters}
              >
                Volver a Todos
              </button>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-primary small"
                onClick={onClearFilters}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
