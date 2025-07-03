const metricClassMap = {
  'Active': 'metric-approved',
  'Pending': 'metric-pending',
  'Expiring Soon': 'metric-expiring',
  'Drafts': 'metric-draft',
  'Rejected': 'metric-rejected',
  'Expired': 'metric-expired',
};

const DashboardMetrics = ({ data }) => {
  if (!data || data.length === 0) return <p>No metrics available.</p>;

  return (
    <div className="dashboard-metrics">
      {data.map(({ label, count }) => (
        <div
          key={label}
          className={`metric-card ${metricClassMap[label] || ''}`.trim()}
        >
          <h4>{label}</h4>
          <p>{count}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardMetrics;