// src/components/dashboard/KanbanBoard.jsx
import { formatMonthYear } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';
import { STAGES, getContractStage, getStageColor, getStageLabel } from '../../utils/stages';
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
        <section key={column.value} className="ledger-kanban__col">
          <header className="ledger-kanban__head" style={{ '--tag-color': getStageColor(column.value) }}>
            <span className="ledger-kanban__title">{getStageLabel(t, column.value)}</span>
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
                <span className="ledger-card__name">{c.title || '—'}</span>
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
