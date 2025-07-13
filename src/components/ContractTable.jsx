import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import './Table.css';

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
    icon: '',
  },
};

const isExpiringSoon = (dateStr) => {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 7; // within 7 days
};

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
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    title: '',
    status: '',
    version: '',
    author: '',
    updated: '',
    expiry: '',
  });
  const [openFilters, setOpenFilters] = useState({});
  const [closingFilter, setClosingFilter] = useState(null);
  const popoverRefs = useRef({});
  const tbodyRef = useRef();

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

  // GSAP Animation for table rows
  useEffect(() => {
    if (tbodyRef.current && filtered.length > 0) {
      // Set initial state for all rows
      gsap.set(tbodyRef.current.children, {
        opacity: 0,
        x: -50
      });

      // Animate rows with stagger effect
      gsap.fromTo(
        tbodyRef.current.children,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out"
        }
      );
    }
  }, [filtered]); // Re-run animation when filtered data changes

  // Popover for each column
  const handleFilterToggle = (key) => {
    if (openFilters[key]) {
      setClosingFilter(key);
      setTimeout(() => {
        setOpenFilters(f => ({ ...f, [key]: false }));
        setClosingFilter(null);
      }, 500); // Match the CSS animation duration (0.5s)
    } else {
      setOpenFilters(f => ({ ...f, [key]: true }));
    }
  };

  const renderPopover = (key, content) => (
    (openFilters[key] || closingFilter === key) && (
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
          animation: `${closingFilter === key ? 'slideUp' : 'slideDown'} .5s ease`,
          transformOrigin: 'top center',
        }}
      >
        {content}
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <button
            className="clear-btn"
            onClick={() => setFilters(f => ({ ...f, [key]: '' }))}
          >
            {t('contractTable.clear')}
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
              {t('contractTable.title')}
              <span
                onClick={e => { e.stopPropagation(); handleFilterToggle('title'); }}
                style={{
                  fontSize: 'clamp(0.6rem, 1.25vw, 0.75rem)',
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
                  placeholder={t('filterByTitle')}
                  style={{ width: 160 }}
                  autoFocus
                />
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              {t('contractTable.headerStatus')}
              <span
                onClick={e => { e.stopPropagation(); handleFilterToggle('status'); }}
                style={{
                  fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)',
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
                  <option value="">{t('contractTable.all')}</option>
                  {uniqueStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              {t('contractTable.version')}
              <span
                onClick={e => { e.stopPropagation(); handleFilterToggle('version'); }}
                style={{
                  fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)',
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
                  <option value="">{t('contractTable.all')}</option>
                  {uniqueVersions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              {t('contractTable.lastUpdated')}
              <span
                onClick={e => { e.stopPropagation(); handleFilterToggle('updated'); }}
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
              {t('contractTable.author')}
              <span
                onClick={e => { e.stopPropagation(); handleFilterToggle('author'); }}
                style={{
                  fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)',
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
                  <option value="">{t('contractTable.all')}</option>
                  {uniqueAuthors.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              ))}
            </th>
            <th style={{ position: 'relative' }}>
              {t('contractTable.expiryDate')}
              <span
                onClick={e => { e.stopPropagation(); handleFilterToggle('expiry'); }}
                style={{
                  fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)',
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
        <tbody ref={tbodyRef}>
          {filtered.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>😢 {t('contractTable.noContractsFound')}</td></tr>
          ) : filtered.map(contract => (
            <tr
              key={contract.id}
              style={{
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/contracts/${contract.id}`)}
            >
              <td>{highlight(contract.title || t('contractTable.untitledContract'), searchQuery)}</td>
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
                        fontSize: 'clamp(0.7rem, 1.25vw, 0.85rem)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        ...style,
                      }}
                    >
                      <span>{style.icon}</span>
                      {t(`contractTable.status.${finalStatus}`)}
                      {finalStatus === 'expiring'}
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
