const DashboardMetrics = ({ data }) => {
    return (
      <div style={{ display: 'flex', gap: '1rem' }}>
        {data.map(({ label, count }) => (
          <div key={label} style={{
            padding: '1rem',
            background: '#e3e8f0',
            borderRadius: '8px',
            minWidth: '100px',
          }}>
            <strong>{label}</strong>
            <div>{count}</div>
          </div>
        ))}
      </div>
    );
  };
  
  export default DashboardMetrics;
  