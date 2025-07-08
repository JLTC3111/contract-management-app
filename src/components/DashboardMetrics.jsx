import { useTranslation } from 'react-i18next';

const metricClassMap = {
  'Active': 'metric-approved',
  'Pending': 'metric-pending',
  'Expiring': 'metric-expiring',
  'Drafts': 'metric-draft',
  'Rejected': 'metric-rejected',
  'Expired': 'metric-expired',
};

const DashboardMetrics = ({ data, onMetricClick, activeFilter }) => {
  const { t } = useTranslation();

  if (!data || data.length === 0) return <p>{t('no_metrics_available')}</p>;

  const handleMetricClick = (label) => {
    if (onMetricClick) {
      onMetricClick(label);
    }
  };
  console.log('Metrics data:', data);
  return (
    <div className="dashboard-metrics">
      {data.map(({ label, count }) => {
        const isActive = activeFilter === label;
        return (
          <div
            key={label}
            className={`metric-card ${metricClassMap[label] || ''}`.trim()}
            style={{
              cursor: 'pointer',
            }}
            onClick={() => handleMetricClick(label)}
          >
            <h4 style={{ color: 'var(--text)', fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)' }}>{t(`metrics.${label.toLowerCase()}`)}</h4>
            <p style={{ color: 'var(--text)', fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)' }}>{count}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;