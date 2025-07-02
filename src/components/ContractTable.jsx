import { useNavigate } from 'react-router-dom';

const statusStyles = {
  approved: { color: '#16a34a', backgroundColor: '#dcfce7' },   // Green
  pending: { color: '#2563eb', backgroundColor: '#dbeafe' },    // Blue
  draft: { color: '#d97706', backgroundColor: '#fef3c7' },      // Amber
  rejected: { color: '#dc2626', backgroundColor: '#fee2e2' },   // Red
};

const statusIcons = {
  approved: '✅',
  pending: '⏳',
  draft: '📝',
  rejected: '❌',
};

const ContractTable = ({ contracts }) => {
  const navigate = useNavigate();

  return (
    <table className="contract-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
          <th style={{ padding: '0.75rem' }}>Title</th>
          <th style={{ padding: '0.75rem' }}>Status</th>
          <th style={{ padding: '0.75rem' }}>Version</th>
          <th style={{ padding: '0.75rem' }}>Last Updated</th>
          <th style={{ padding: '0.75rem' }}>Author</th>
        </tr>
      </thead>
      <tbody>
        {contracts.map(contract => (
          <tr
            key={contract.id}
            style={{
              cursor: 'pointer',
              borderBottom: '1px solid #e2e8f0',
              transition: 'background 0.2s ease',
            }}
            onClick={() => navigate(`/contracts/${contract.id}`)}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
            onMouseOut={(e) => (e.currentTarget.style.background = '')}
          >
            <td style={{ padding: '0.75rem' }}>{contract.title || 'Untitled Contract'}</td>
            <td style={{ padding: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  ...statusStyles[contract.status] || {},
                }}
              >
                {statusIcons[contract.status] || '📄'}{' '}
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </span>
            </td>
            <td style={{ padding: '0.75rem' }}>{contract.version || '—'}</td>
            <td style={{ padding: '0.75rem' }}>
              {new Date(contract.updated_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </td>
            <td style={{ padding: '0.75rem' }}>{contract.author || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ContractTable;
