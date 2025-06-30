const DashboardMetrics = ({ data }) => {
  if (!data || data.length === 0) return <p>No metrics available.</p>;

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {data.map(({ label, count }) => (
        <div
          key={label}
          style={{
            padding: '1rem',
            background: '#e3e8f0',
            borderRadius: '8px',
            minWidth: '100px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <strong>{label}</strong>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{count}</div>
        </div>
      ))}
    </div>
  );
};

export default DashboardMetrics;