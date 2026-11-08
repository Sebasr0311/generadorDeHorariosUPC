import { useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, CheckCircle2, Search, X } from 'lucide-react';
import type { Catalog, ReconciledCatalogItem, SemesterFilterValue } from '../lib/types';
import type { SemesterCountSummary } from '../lib/curriculum';
import { SemesterFilter } from './SemesterFilter';
import { SelectedSubjectsSummary } from './SelectedSubjectsSummary';
import { SubjectCatalogList } from './SubjectCatalogList';

type CourseSelectorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: Catalog;
  catalogs: Catalog[];
  onSelectCatalog: (id: string) => void;
  items: ReconciledCatalogItem[];
  selectedChoiceCodes: Set<string>;
  selectedReconciledItems: ReconciledCatalogItem[];
  semester: SemesterFilterValue;
  onSemesterChange: (next: SemesterFilterValue) => void;
  semesterCounts: Record<SemesterFilterValue, SemesterCountSummary>;
  search: string;
  onSearchChange: (search: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onToggleItem: (item: ReconciledCatalogItem) => void;
  onRemoveChoice: (code: string) => void;
  choicesCount: number;
};

export function CourseSelectorModal({
  open,
  onOpenChange,
  catalog,
  catalogs,
  onSelectCatalog,
  items,
  selectedChoiceCodes,
  selectedReconciledItems,
  semester,
  onSemesterChange,
  semesterCounts,
  search,
  onSearchChange,
  hasActiveFilters,
  onClearFilters,
  onToggleItem,
  onRemoveChoice,
  choicesCount,
}: CourseSelectorModalProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const totalCredits = selectedReconciledItems.reduce(
    (sum, item) => sum + (item.academicWeight || item.credits || 0),
    0
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content course-selector-modal"
          aria-describedby="course-selector-desc"
        >
          <div className="course-modal-head">
            <div className="modal-title-row">
              <div>
                <div className="eyebrow">PASO 01 · CATÁLOGO ACADÉMICO</div>
                <Dialog.Title className="modal-title">Seleccionar materias</Dialog.Title>
              </div>
              <Dialog.Close className="icon-btn" aria-label="Cerrar catálogo">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description id="course-selector-desc" className="muted">
              Elige las asignaturas que deseas cursar en el período {catalog.term} para generar tus
              combinaciones de horario.
            </Dialog.Description>
          </div>

          <div className="course-modal-scrollable">
            <div className="course-modal-controls">
              <div className="course-modal-top-row">
              <label className="sidebar-search course-modal-search">
                <Search size={17} />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Buscar materia, código o docente..."
                  aria-label="Buscar materia o docente"
                />
                {search ? (
                  <button
                    type="button"
                    className="sidebar-search-clear"
                    onClick={() => onSearchChange('')}
                    aria-label="Borrar búsqueda"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <span>⌘ K</span>
                )}
              </label>

              <div className="course-modal-catalog-select">
                <select
                  aria-label="Elegir catálogo"
                  value={catalog.id}
                  onChange={e => onSelectCatalog(e.target.value)}
                >
                  {catalogs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SemesterFilter
              value={semester}
              onChange={onSemesterChange}
              counts={semesterCounts}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={onClearFilters}
              catalogTerm={catalog.term}
            />

            <SelectedSubjectsSummary
              selectedItems={selectedReconciledItems}
              activeSemester={semester}
              onRemove={onRemoveChoice}
            />
          </div>

          <div className="course-modal-list-wrap">
            <SubjectCatalogList
              items={items}
              selectedChoiceCodes={selectedChoiceCodes}
              semester={semester}
              hasActiveFilters={hasActiveFilters}
              onToggle={onToggleItem}
              onSelectAllSemesters={() => onSemesterChange('all')}
              onClearFilters={onClearFilters}
            />
          </div>
        </div>

        <div className="course-modal-footer">
            <div className="course-modal-status">
              <CheckCircle2 size={16} />
              <span>
                <strong>
                  {choicesCount} {choicesCount === 1 ? 'materia elegida' : 'materias elegidas'}
                </strong>{' '}
                {totalCredits > 0 ? `· ${totalCredits} créditos` : ''}
              </span>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onOpenChange(false)}
            >
              <Check size={16} /> Listo, ver horario{choicesCount > 0 ? ` (${choicesCount})` : ''}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
