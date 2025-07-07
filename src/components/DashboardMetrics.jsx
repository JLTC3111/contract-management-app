const metricClassMap = {
  'Active': 'metric-approved',
  'Pending': 'metric-pending',
  'Expiring Soon': 'metric-expiring',
  'Drafts': 'metric-draft',
  'Rejected': 'metric-rejected',
  'Expired': 'metric-expired',
};

const DashboardMetrics = ({ data, onMetricClick, activeFilter }) => {
  if (!data || data.length === 0) return <p>No metrics available.</p>;

  const handleMetricClick = (label) => {
    if (onMetricClick) {
      onMetricClick(label);
    }
  };

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
            <h4 style={{ color: 'var(--text)' }}>{label}</h4>
            <p style={{ color: 'var(--text)' }}>{count}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;