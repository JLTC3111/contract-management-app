// src/components/dashboard/ContractsTable.jsx
import { useTranslation } from 'react-i18next';
import { currencyForLocale, formatCompactCurrency, formatMonthYear } from '../../utils/formatters';
import { getContractStage } from '../../utils/stages';
import { StageTag, CategoryTag } from './StageTag';

const shortDate = (value, locale) => (value ? formatMonthYear(value, locale) : '—');

/**
 * Row click opens the drawer; the checkbox cell stops propagation so selecting
 * never opens anything.
 */
const ContractsTable = ({ contracts, selected, onToggle, onToggleAll, onOpen }) => {
  const { t, i18n } = useTranslation();
  const allSelected = contracts.length > 0 && contracts.every((c) => selected.has(c.id));

  if (contracts.length === 0) {
    return <p className="ledger-empty">{t('dashboard.noContracts', 'No contracts match these filters.')}</p>;
  }

  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            <th className="ledger-table__check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={t('dashboard.selectAll', 'Select all')}
              />
            </th>
            <th>{t('dashboard.col.name', 'Name')}</th>
            <th className="col-category">{t('dashboard.col.category', 'Category')}</th>
            <th className="col-stage">{t('dashboard.col.stage', 'Stage')}</th>
            <th className="col-owner">{t('dashboard.col.owner', 'Owner')}</th>
            <th className="col-value ledger-table__num">{t('dashboard.col.value', 'Value')}</th>
            <th className="col-expires">{t('dashboard.col.expires', 'Expires')}</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr
              key={c.id}
              className={selected.has(c.id) ? 'ledger-table__row--selected' : undefined}
              onClick={() => onOpen(c)}
            >
              <td className="ledger-table__check" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => onToggle(c.id)}
                  aria-label={t('dashboard.selectRow', 'Select {{name}}', { name: c.title })}
                />
              </td>
              <td>
                <span className="ledger-table__name">{c.title || '—'}</span>
                <span className="ledger-table__sub">{c.client_name || '—'}</span>
                {/* Each chip appears only at the width where its column drops out,
                    so nothing is ever shown twice or lost. */}
                <span className="ledger-table__meta">
                  <span className="meta-category"><CategoryTag category={c.category} /></span>
                  <span className="meta-owner">{c.author || '—'}</span>
                  <span className="meta-value">
                    {c.contract_value
                      ? formatCompactCurrency(c.contract_value, currencyForLocale(i18n.language), i18n.language)
                      : '—'}
                  </span>
                  <span className="meta-expires">{shortDate(c.expiry_date, i18n.language)}</span>
                </span>
              </td>
              <td className="col-category"><CategoryTag category={c.category} /></td>
              <td className="col-stage"><StageTag stage={getContractStage(c)} /></td>
              <td className="col-owner">{c.author || '—'}</td>
              <td className="col-value ledger-table__num">
                {c.contract_value
                  ? formatCompactCurrency(c.contract_value, currencyForLocale(i18n.language), i18n.language)
                  : '—'}
              </td>
              <td className="col-expires">{shortDate(c.expiry_date, i18n.language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractsTable;
