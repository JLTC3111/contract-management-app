// src/components/dashboard/KanbanBoard.jsx
import { formatMonthYear, getI18nOrFallback } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { STAGES, getContractStage, getStageLabel } from '../../utils/stages';
import { CategoryTag } from './StageTag';

const shortDate = (value, locale) => (value ? formatMonthYear(value, locale) : '—');

/**
 * One column per stage, in lifecycle order. Card click opens the drawer.
 */
const KanbanBoard = ({ contracts, onOpen }) => {
  const { t, i18n } = useTranslation();
  const byStage = STAGES.map((stage) => ({
    ...stage,
    items: contracts.filter((c) => getContractStage(c) === stage.value),
  }));

  return (
    <div className="ledger-kanban">
      {byStage.map((column) => (
        // An empty stage keeps its header but stops competing for width.
        <section
          key={column.value}
          className={`ledger-kanban__col${column.items.length === 0 ? ' ledger-kanban__col--empty' : ''}`}
        >
          <header className="ledger-kanban__head">
            {/* The title truncates in a collapsed column, so keep the full name
                reachable. */}
            <span className="ledger-kanban__title" title={getStageLabel(t, column.value)}>
              {getStageLabel(t, column.value)}
            </span>
            <span className="ledger-kanban__count">{column.items.length}</span>
          </header>
          <div className="ledger-kanban__cards">
            {column.items.map((c) => (
              <article
                key={c.id}
                className="ledger-card"
                role="button"
                tabIndex={0}
                onClick={() => onOpen(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(c);
                  }
                }}
              >
                <span className="ledger-card__name">
                  {getI18nOrFallback(t, c, 'title_i18n', 'title') || '—'}
                </span>
                <span className="ledger-card__sub">{c.client_name || '—'}</span>
                <div className="ledger-card__foot">
                  <CategoryTag category={c.category} />
                  <span className="ledger-card__expiry">{shortDate(c.expiry_date, i18n.language)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default KanbanBoard;
