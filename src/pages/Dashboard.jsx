import DashboardMetrics from '../components/DashboardMetrics';
import ContractTable from '../components/ContractTable';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useUser } from '../hooks/useUser';
import { Search, FilePenLine, CheckCircle } from 'lucide-react';
import NotificationDropdown from '../components/NotificationDropdown';
import { useTranslation } from 'react-i18next';


const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const searchRef = useRef();
  const metricsRef = useRef();
  const debounceTimeout = useRef();
  const { t } = useTranslation();

  const metrics = [
    { label: t('dashboard.active', 'Active'), count: contracts.filter(c => c.status === 'approved').length },
    { label: t('dashboard.pending', 'Pending'), count: contracts.filter(c => c.status === 'pending').length },
    { label: t('dashboard.expiring', 'Expiring'), count: contracts.filter(c => c.status === 'expiring').length },
    { label: t('dashboard.drafts', 'Drafts'), count: contracts.filter(c => c.status === 'draft').length },
    { label: t('dashboard.rejected', 'Rejected'), count: contracts.filter(c => c.status === 'rejected').length },
    { label: t('dashboard.expired', 'Expired'), count: contracts.filter(c => c.status === 'expired').length },
  ];

  // Handle metric card clicks
  const handleMetricClick = (label) => {
    if (activeFilter === label) {
      // If clicking the same filter, clear it
      setActiveFilter(null);
      setFilteredContracts(contracts);
    } else {
      // Apply new filter
      setActiveFilter(label);
      
      let filtered;
      if (label === 'Expiring') {
        // For expiring, filter approved contracts that are expiring soon
        filtered = contracts.filter(c => {
          if (c.status !== 'approved') return false;
          if (!c.expiry_date) return false;
          const expiry = new Date(c.expiry_date);
          const now = new Date();
          const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
          return diffDays > 0 && diffDays <= 7; // within 7 days
        });
      } else {
        // For other statuses, use direct status matching
        const statusMap = {
          'Active': 'approved',
          'Pending': 'pending',
          'Drafts': 'draft',
          'Rejected': 'rejected',
          'Expired': 'expired',
        };
        const status = statusMap[label];
        filtered = contracts.filter(c => c.status === status);
      }
      
      setFilteredContracts(filtered);
    }
  };

  // Update filtered contracts when contracts change
  useEffect(() => {
    if (activeFilter) {
      let filtered;
      if (activeFilter === 'Expiring') {
        // For expiring, filter approved contracts that are expiring soon
        filtered = contracts.filter(c => {
          if (c.status !== 'approved') return false;
          if (!c.expiry_date) return false;
          const expiry = new Date(c.expiry_date);
          const now = new Date();
          const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
          return diffDays > 0 && diffDays <= 7; // within 7 days
        });
      } else {
        // For other statuses, use direct status matching
        const statusMap = {
          'Active': 'approved',
          'Pending': 'pending',
          'Drafts': 'draft',
          'Rejected': 'rejected',
          'Expired': 'expired',
        };
        const status = statusMap[activeFilter];
        filtered = contracts.filter(c => c.status === status);
      }
      setFilteredContracts(filtered);
    } else {
      setFilteredContracts(contracts);
    }
  }, [contracts, activeFilter]);

  // Helper: recursively list all files/folders under a base path
  async function listAllFilesRecursive(basePath) {
    let results = [];
    const { data: items, error } = await supabase.storage.from('contracts').list(basePath, { limit: 100 });
    if (error || !items) return results;
    for (const item of items) {
      if (item.name === '.keep') continue;
      const isFolder = !item.metadata?.mimetype;
      const fullPath = basePath + '/' + item.name;
      results.push({ ...item, isFolder, basePath, fullPath });
      if (isFolder) {
        // Recursively list subfolders
        const subResults = await listAllFilesRecursive(fullPath);
        results = results.concat(subResults);
      }
    }
    return results;
  }

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true); // move this up for safety
  
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('updated_at', { ascending: false });
  
      if (error) {
        console.error('Supabase error:', error.message);
        setLoading(false);
        return;
      }
  
      if (!data || !Array.isArray(data)) {
        console.error('Unexpected data format:', data);
        setLoading(false);
        return;
      }
  
      setContracts(prevContracts => {
        if (prevContracts.length === 0) {
          // First load
          return data;
        }
  
        // Update only modified contracts, keep order
        return prevContracts.map(existing => {
          const updated = data.find(d => d.id === existing.id);
          return updated ? updated : existing;
        });
      });
  
      setLoading(false);
    };
  
    fetchContracts();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      let active = true;
      (async () => {
        // Get all contracts
        const { data: contracts, error } = await supabase.from('contracts').select('id, title');
        if (error || !contracts) {
          setSearchLoading(false);
          return;
        }
        let results = [];
        for (const contract of contracts) {
          const basePath = `uploads/${contract.id}`;
          const allItems = await listAllFilesRecursive(basePath);
          for (const item of allItems) {
            if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
              results.push({
                contractId: contract.id,
                contractTitle: contract.title,
                name: item.name,
                isFolder: item.isFolder,
                path: item.basePath,
                fullPath: item.fullPath,
              });
            }
          }
        }
        if (active) setSearchResults(results);
        setSearchLoading(false);
      })();
      return () => { active = false; };
    }, 100);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      
      // Clear filter if clicking outside metrics, but not on contract table
      if (activeFilter && metricsRef.current && !metricsRef.current.contains(e.target)) {
        // Check if the click is on the contract table or its children
        const isClickOnTable = e.target.closest('.contract-table-wrapper') || 
                              e.target.closest('.contract-table') ||
                              e.target.closest('table') ||
                              e.target.closest('tbody') ||
                              e.target.closest('tr') ||
                              e.target.closest('td') ||
                              e.target.closest('th');
        
        if (!isClickOnTable) {
          setActiveFilter(null);
          setFilteredContracts(contracts);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeFilter, contracts]);

  return (
    <>
      <style>
        {`
          @keyframes ziggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-15deg); }
            50% { transform: rotate(15deg); }
            75% { transform: rotate(-8deg); }
          }
          
          .bell-ziggle:hover svg {
            animation: ziggle 0.4s ease-in-out;
          }
        `}
      </style>


      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex' }}>
          <main style={{ padding: '2rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{
                fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                fontWeight: 'bold',
                color: 'var(--text)',
                letterSpacing: '2px',
                margin: 0,
                padding: 'clamp(0.25rem, 2vw, 0.5rem) 0',
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
              >{t('dashboard.title', 'Dashboard')}</h1>
              <NotificationDropdown />
            </div>
            
            {/* Action buttons row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px' }}>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Approval Requests Button - only for admin and approver */}
                {(user?.role === 'admin' || user?.role === 'approver') && (
                  <button
                    onClick={() => navigate('/approvals')}
                    className="btn-hover-effect"
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}
                  >
                    <CheckCircle size={16} />
                    {t('dashboard.approvalRequests', 'Approval Requests')}
                  </button>
                )}
                
                {/* New Contract Button */}
                <button
                  className="btn-hover-effect"
                  style={{
                    background: '#088eee',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    fontSize: '1rem',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/new')}
                >
                  + {t('buttons.newContract')}
                </button>
              </div>
            </div>
            
            {loading ? (
              <p>{t('dashboard.loading')}</p>
            ) : (
              <>
                <div ref={metricsRef}>
                  <DashboardMetrics data={metrics} onMetricClick={handleMetricClick} activeFilter={activeFilter} />
                </div>
                
                {/* Search bars row - positioned above contract table */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                  {/* File/Folder Search Bar - far left */}
                  <div style={{ position: 'relative', width: 'fit-content' }} ref={searchRef}>
                    <input
                      type="text"
                      className="file-folder-search-input"
                      placeholder={t('dashboard.searchFiles', 'Search files or folders...')}
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      style={{
                        width: 'clamp(180px, 40vw, 280px)',
                        padding: 'clamp(0.3rem, 2vw, 0.5rem) clamp(0.7rem, 2vw, 1rem)',
                        borderRadius: 8,
                        border: '1.5px solid var(--card-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text, #fff)',
                        fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                        outline: 'none',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'border 0.2s, background 0.2s, color 0.2s',
                      }}
                    />
                    {showDropdown && searchTerm && (
                      <div style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        width: '100%',
                        background: 'var(--card-bg)',
                        border: '1.5px solid var(--card-border)',
                        borderRadius: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        zIndex: 1000,
                        maxHeight: 320,
                        overflowY: 'auto',
                      }}>
                        {searchLoading && (
                          <div style={{ padding: '0.5rem 1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span className="search-anim-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 28, height: 28 }}>
                              <span style={{ position: 'absolute', left: '12.5px', top: 'calc(50% + 5px)', width: 22, height: 22, zIndex: 1, transform: 'translateY(-50%)' }}>
                                <Search size={18} style={{ animation: 'search-move 1s linear infinite' }} />
                              </span>
                              <span style={{ position: 'absolute', left: 0, top: '50%', width: 20, height: 20, zIndex: 0, transform: 'translateY(-50%)' }}>
                                <FilePenLine size={16} color="#cbd5e1" fill="#e5e7eb" />
                              </span>
                            </span>
                            {t('dashboard.searching')}
                          </div>
                        )}
                        {!searchLoading && searchResults.length > 0 && searchResults.map((result, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '0.5rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              borderBottom: idx !== searchResults.length - 1 ? '1px solid var(--card-border)' : 'none',
                              color: 'var(--text, #fff)',
                              background: 'var(--card-bg)',
                            }}
                            onClick={() => {
                              setShowDropdown(false);
                              setSearchTerm('');
                              navigate(`/contracts/${result.contractId}`);
                            }}
                          >
                            <span style={{ fontSize: 18 }}>{result.isFolder ? '📁' : '📄'}</span>
                            <span style={{ fontWeight: 500 }}>{result.name}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 13, marginLeft: 'auto' }}>{result.contractTitle}</span>
                          </div>
                        ))}
                        {!searchLoading && searchResults.length === 0 && (
                          <div style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>
                            {t('dashboard.noResultsFound')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Contract Search Bar - far right */}
                  <div style={{ width: 'fit-content' }}>
                    <input
                      type="text"
                      className="table-filter-input"
                      placeholder={t('dashboard.searchContracts', 'Search contracts...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: 'clamp(0.3rem, 2vw, 0.5rem) clamp(0.7rem, 2vw, 1rem)',
                        width: 'clamp(180px, 40vw, 280px)',
                        fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                        borderRadius: 8,
                        border: '1.5px solid var(--card-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text, #fff)',
                        outline: 'none',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'border 0.2s, background 0.2s, color 0.2s',
                      }}
                    />
                  </div>
                </div>
                
                <ContractTable contracts={filteredContracts} searchQuery={searchQuery} />
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
  
};

export default Dashboard;
