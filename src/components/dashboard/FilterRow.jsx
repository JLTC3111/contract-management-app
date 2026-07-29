// src/components/dashboard/FilterRow.jsx
import { useTranslation } from 'react-i18next';
import { Search, LayoutGrid, Rows3 } from 'lucide-react';
import { STAGES, getStageLabel } from '../../utils/stages';
import { CONTRACT_CATEGORIES, getCategoryLabel, getCategoryShortLabel } from '../../utils/constants';

/**
 * File/folder name search, category chips, stage dropdown, table/kanban toggle.
 */
const FilterRow = ({
  fileQuery,
  onFileQueryChange,
  category,
  onCategoryChange,
  stage,
  onStageChange,
  view,
  onViewChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ledger-filters">
      <div className="ledger-filters__search">
        <Search size={15} aria-hidden="true" />
        <input
          type="text"
          value={fileQuery}
          onChange={(e) => onFileQueryChange(e.target.value)}
          placeholder={t('dashboard.searchFiles', 'Search files/folders...')}
          aria-label={t('dashboard.searchFiles', 'Search files/folders...')}
        />
      </div>

      <div className="ledger-filters__chips" role="group" aria-label={t('dashboard.category', 'Category')}>
        {CONTRACT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`ledger-chip${category === c ? ' ledger-chip--active' : ''}`}
            aria-pressed={category === c}
            onClick={() => onCategoryChange(c)}
            title={c === 'All' ? undefined : getCategoryLabel(t, c)}
          >
            {c === 'All' ? t('dashboard.all', 'All') : getCategoryShortLabel(t, c)}
          </button>
        ))}
      </div>

      <select
        className="ledger-filters__stage"
        value={stage}
        onChange={(e) => onStageChange(e.target.value)}
        aria-label={t('dashboard.stage', 'Stage')}
      >
        <option value="all">{t('dashboard.allStages', 'All stages')}</option>
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>{getStageLabel(t, s.value)}</option>
        ))}
      </select>

      <div className="ledger-viewtoggle" role="group" aria-label={t('dashboard.view', 'View')}>
        <button
          type="button"
          className={`ledger-viewtoggle__btn${view === 'table' ? ' ledger-viewtoggle__btn--active' : ''}`}
          aria-pressed={view === 'table'}
          onClick={() => onViewChange('table')}
        >
          <Rows3 size={14} /> {t('dashboard.table', 'Table')}
        </button>
        <button
          type="button"
          className={`ledger-viewtoggle__btn${view === 'kanban' ? ' ledger-viewtoggle__btn--active' : ''}`}
          aria-pressed={view === 'kanban'}
          onClick={() => onViewChange('kanban')}
        >
          <LayoutGrid size={14} /> {t('dashboard.kanban', 'Kanban')}
        </button>
      </div>
    </div>
  );
};

export default FilterRow;
