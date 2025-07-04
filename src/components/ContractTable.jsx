import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import './ContractTable.css';

const statusStyles = {
  approved: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    icon: '✅',
  },
  pending: {
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    icon: '⏳',
  },
  draft: {
    color: '#d97706',
    backgroundColor: '#fef3c7',
    icon: '📝',
  },
  rejected: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    icon: '❌',
  },
  expired: {
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    icon: '🛑',
  },
  expiring: {
    color: '#92400e',
    backgroundColor: '#ffedd5',
    icon: '⚠️',
  },
};

const isExpiringSoon = (dateStr) => {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 7; // within 7 days
};

const filterIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginLeft: 4, cursor: 'pointer' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
);

const getUnique = (arr, key) => Array.from(new Set(arr.map(c => c[key]).filter(Boolean)));

const highlight = (text, query) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ backgroundColor: '#fef08a' }}>{part}</mark>
      : part
  );
};

const ContractTable = ({ contracts, searchQuery = '' }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    title: '',
    status: '',
    version: '',
    author: '',
    updated: '',
    expiry: '',
  });
  const [openFilters, setOpenFilters] = useState({});
  const popoverRefs = useRef({});

  // Close popover on outside click
  document.onclick = (e) => {
    Object.keys(openFilters).forEach((key) => {
      if (openFilters[key] && popoverRefs.current[key] && !popoverRefs.current[key].contains(e.target)) {
        setOpenFilters((prev) => ({ ...prev, [key]: false }));
      }
    });
  };

  // Filtering logic
  const filtered = contracts.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.title?.toLowerCase().includes(query) ||
      c.status?.toLowerCase().includes(query) ||
      c.version?.toLowerCase().includes(query) ||
      c.author?.toLowerCase().includes(query) ||
      (c.expiry_date && new Date(c.expiry_date).toLocaleDateString().toLowerCase().includes(query));
    const matchesTitle = !filters.title || c.title?.toLowerCase().includes(filters.title.toLowerCase());
    const matchesStatus = !filters.status || c.status === filters.status;
    const matchesVersion = !filters.version || c.version === filters.version;
    const matchesAuthor = !filters.author || c.author === filters.author;
    const matchesUpdated = !filters.updated || (c.updated_at && c.updated_at.slice(0, 10) === filters.updated);
    const matchesExpiry = !filters.expiry || (c.expiry_date && c.expiry_date.slice(0, 10) === filters.expiry);
    return matchesSearch && matchesTitle && matchesStatus && matchesVersion && matchesAuthor && matchesUpdated && matchesExpiry;
  });

  // Unique values for dropdowns
  const uniqueVersions = getUnique(contracts, 'version');
  const uniqueAuthors = getUnique(contracts, 'author');
  const uniqueStatuses = getUnique(contracts, 'status');

  // Popover for each column
  const renderPopover = (key, content) => (
    openFilters[key] && (
      <div
        ref={el => (popoverRefs.current[key] = el)}
        style={{
          position: 'absolute',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: 12,
          zIndex: 10,
          marginTop: 4,
          color: 'var(--text)',
        }}
      >
        {content}
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <button
            className="clear-btn"
            onClick={() => setFilters(f => ({ ...f, [key]: '' }))}
          >
            Clear
          </button>
        </div>
      </div>
    )
  );

  return (
    <div className={`contract-table-wrapper${Object.values(openFilters).some(Boolean) ? ' filter-open' : ''}`}>
      <table className="contract-table">
        <thead>
          <tr>
            <th style={{ position: 'relative' }}>
              Title
              <span
                onClick={e => { e.stopPropagation(); setOpenFilters(f => ({ ...f, title: !f.title })); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  boxShadow: openFilters.title ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.boxShadow = openFilters.title ? '0 2px 8px rgba(0,0,0,0.10)' : 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', color: 'var(--text)' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
              </span>
              {renderPopover('title', (
                <input
                  type="text"
                  className="table-filter-input"
                  value={filters.title}
                  onChange={e => setFilters(f => ({ ...f, title: e.target.value }))}
                  placeholder="Filter by title"
                  style={{ width: 160 }}
                  autoFocus
                />
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              Status
              <span
                onClick={e => { e.stopPropagation(); setOpenFilters(f => ({ ...f, status: !f.status })); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  boxShadow: openFilters.status ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.boxShadow = openFilters.status ? '0 2px 8px rgba(0,0,0,0.10)' : 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', color: 'var(--text)' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
              </span>
              {renderPopover('status', (
                <select
                  className="table-filter-input"
                  value={filters.status}
                  onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                  style={{ width: 160 }}
                  autoFocus
                >
                  <option value="">All</option>
                  {uniqueStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              Version
              <span
                onClick={e => { e.stopPropagation(); setOpenFilters(f => ({ ...f, version: !f.version })); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  boxShadow: openFilters.version ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.boxShadow = openFilters.version ? '0 2px 8px rgba(0,0,0,0.10)' : 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', color: 'var(--text)' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
              </span>
              {renderPopover('version', (
                <select
                  className="table-filter-input"
                  value={filters.version}
                  onChange={e => setFilters(f => ({ ...f, version: e.target.value }))}
                  style={{ width: 160 }}
                  autoFocus
                >
                  <option value="">All</option>
                  {uniqueVersions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              Last Updated
              <span
                onClick={e => { e.stopPropagation(); setOpenFilters(f => ({ ...f, updated: !f.updated })); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  boxShadow: openFilters.updated ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.boxShadow = openFilters.updated ? '0 2px 8px rgba(0,0,0,0.10)' : 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', color: 'var(--text)' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
              </span>
              {renderPopover('updated', (
                <input
                  type="date"
                  className="table-filter-input"
                  value={filters.updated}
                  onChange={e => setFilters(f => ({ ...f, updated: e.target.value }))}
                  style={{ width: 160 }}
                  autoFocus
                />
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              Author
              <span
                onClick={e => { e.stopPropagation(); setOpenFilters(f => ({ ...f, author: !f.author })); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  boxShadow: openFilters.author ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.boxShadow = openFilters.author ? '0 2px 8px rgba(0,0,0,0.10)' : 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', color: 'var(--text)' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
              </span>
              {renderPopover('author', (
                <select
                  className="table-filter-input"
                  value={filters.author}
                  onChange={e => setFilters(f => ({ ...f, author: e.target.value }))}
                  style={{ width: 160 }}
                  autoFocus
                >
                  <option value="">All</option>
                  {uniqueAuthors.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              Expiry Date
              <span
                onClick={e => { e.stopPropagation(); setOpenFilters(f => ({ ...f, expiry: !f.expiry })); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  boxShadow: openFilters.expiry ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.boxShadow = openFilters.expiry ? '0 2px 8px rgba(0,0,0,0.10)' : 'none';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', color: 'var(--text)' }}><path fill="currentColor" d="M3 5h18v2H3zm3 7h12v2H6zm3 7h6v2H9z"/></svg>
              </span>
              {renderPopover('expiry', (
                <input
                  type="date"
                  className="table-filter-input"
                  value={filters.expiry}
                  onChange={e => setFilters(f => ({ ...f, expiry: e.target.value }))}
                  style={{ width: 160 }}
                  autoFocus
                />
              ))}
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>😢 No contracts found.</td></tr>
          ) : filtered.map(contract => (
            <tr
              key={contract.id}
              style={{
                cursor: 'pointer',
                transition: 'background 0.3s ease, box-shadow 0.3s, transform 0.3s',
              }}
              onClick={() => navigate(`/contracts/${contract.id}`)}
            >
              <td>{highlight(contract.title || 'Untitled Contract', searchQuery)}</td>
              <td>
                {(() => {
                  const rawStatus = contract.status?.toLowerCase();
                  const isNearExpiry = isExpiringSoon(contract.expiry_date);
                  const finalStatus = rawStatus === 'approved' && isNearExpiry ? 'expiring' : rawStatus;
                  const style = statusStyles[finalStatus] || {
                    color: '#374151',
                    backgroundColor: '#f3f4f6',
                    icon: '❔',
                  };
                  
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        ...style,
                      }}
                    >
                      <span>{style.icon}</span>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      {finalStatus === 'expiring' && <span style={{ fontStyle: 'italic', marginLeft: 4 }}>(soon)</span>}
                    </span>
                  );
                })()}
              </td>
              <td>{contract.version || '—'}</td>
              <td>{contract.updated_at ? new Date(contract.updated_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : '—'}</td>
              <td>{contract.author || '—'}</td>
              <td>{contract.expiry_date ? new Date(contract.expiry_date).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractTable;
