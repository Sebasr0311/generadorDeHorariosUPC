import { X } from 'lucide-react';
import type { ReconciledCatalogItem, SemesterFilterValue } from '../lib/types';

type SelectedSubjectsSummaryProps = {
  selectedItems: ReconciledCatalogItem[];
  activeSemester: SemesterFilterValue;
  onRemove: (choiceCode: string) => void;
};

export function SelectedSubjectsSummary({
  selectedItems,
  activeSemester,
  onRemove,
}: SelectedSubjectsSummaryProps) {
  if (selectedItems.length === 0) return null;

  const totalCredits = selectedItems.reduce((sum, item) => sum + (item.credits || 0), 0);
  const semestersInSelection = new Set(
    selectedItems.map(i => (i.romanSemester ? `Sem. ${i.romanSemester}` : 'Otras'))
  );
  const hiddenByFilterCount =
    activeSemester === 'all'
      ? 0
      : selectedItems.filter(i => {
          if (activeSemester === 'other') return i.kind !== 'extra';
          return i.semester !== Number(activeSemester);
        }).length;

  return (
    <div
      className="selected-subjects-summary"
      role="region"
      aria-label="Resumen persistente de materias seleccionadas"
    >
      <div className="selected-summary-head">
        <span>
          <strong>
            {selectedItems.length} {selectedItems.length === 1 ? 'seleccionada' : 'seleccionadas'}
          </strong>
          {totalCredits > 0 ? ` · ${totalCredits} cr.` : ''}
          {semestersInSelection.size > 1 ? ` · ${semestersInSelection.size} semestres` : ''}
        </span>
        {hiddenByFilterCount > 0 && (
          <small className="selected-other-sem-note">
            +{hiddenByFilterCount} de otro semestre
          </small>
        )}
      </div>
      <div className="selected-summary-chips">
        {selectedItems.map(item => {
          const code = item.choiceCode || item.curriculumCode;
          return (
            <div key={item.id} className="selected-summary-chip">
              <span className="selected-chip-text">
                <b>{item.romanSemester ? `${item.romanSemester} · ` : ''}{item.curriculumCode}</b>{' '}
                {item.curriculumName}
              </span>
              <button
                type="button"
                className="selected-chip-remove"
                aria-label={`Quitar ${item.curriculumCode}`}
                onClick={() => onRemove(code)}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
