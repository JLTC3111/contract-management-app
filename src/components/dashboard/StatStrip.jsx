// src/components/dashboard/StatStrip.jsx
import { useTranslation } from 'react-i18next';
import { currencyForLocale, formatCompactCurrency } from '../../utils/formatters';

/**
 * Four equal cells, plain numbers, no charts.
 */
const StatStrip = ({ totals }) => {
  const { t, i18n } = useTranslation();

  const cells = [
    { key: 'total', label: t('dashboard.stats.total', 'Total contracts'), value: totals.total },
    {
      key: 'value',
      label: t('dashboard.stats.activeValue', 'Active value'),
      value: formatCompactCurrency(totals.activeValue, currencyForLocale(i18n.language), i18n.language),
    },
    { key: 'expiring', label: t('dashboard.stats.expiring', 'Expiring soon'), value: totals.expiring },
    { key: 'pending', label: t('dashboard.stats.pending', 'Pending approval'), value: totals.pending },
  ];

  return (
    <div className="ledger-stats">
      {cells.map((cell) => (
        <div key={cell.key} className="ledger-stats__cell">
          <span className="ledger-stats__label">{cell.label}</span>
          <span className="ledger-stats__value">{cell.value}</span>
        </div>
      ))}
    </div>
  );
};

export default StatStrip;
