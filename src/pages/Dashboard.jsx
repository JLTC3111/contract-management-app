import DashboardMetrics from '../components/DashboardMetrics';
import ContractTable from '../components/ContractTable';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Search, FilePenLine } from 'lucide-react';


const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef();
  const debounceTimeout = useRef();
  

  const metrics = [
    { label: 'Active', count: contracts.filter(c => c.status === 'approved').length },
    { label: 'Pending', count: contracts.filter(c => c.status === 'pending').length },
    { label: 'Expiring Soon', count: contracts.filter(c => c.status === 'expiring').length },
    { label: 'Drafts', count: contracts.filter(c => c.status === 'draft').length },
    { label: 'Rejected', count: contracts.filter(c => c.status === 'rejected').length },
    { label: 'Expired', count: contracts.filter(c => c.status === 'expired').length },
  ];

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
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex' }}>
          <main style={{ padding: '2rem', flex: 1 }}>
            <h1>Dashboard</h1>
            {/* Search bars row below heading */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24, margin: '24px 0' }}>
              {/* File/Folder Search Bar */}
              <div style={{ position: 'relative', flex: 1 }} ref={searchRef}>
                <input
                  type="text"
                  placeholder="Search files or folders..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  style={{
                    width: 280,
                    padding: '0.5rem 1rem',
                    borderRadius: 8,
                    border: '1.5px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text, #fff)',
                    fontSize: '1rem',
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
                      <div style={{ padding: '0.5rem 1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="search-anim-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 28, height: 28 }}>
                          <span style={{ position: 'absolute', left: 2, top: 'calc(50% + 1px)', width: 22, height: 22, zIndex: 1, transform: 'translateY(-50%)' }}>
                            <Search size={18} style={{ animation: 'search-move 1s linear infinite' }} />
                          </span>
                          <span style={{ position: 'absolute', left: 4, top: '50%', width: 16, height: 16, zIndex: 0, transform: 'translateY(-50%)' }}>
                            <FilePenLine size={16} color="#cbd5e1" fill="#e5e7eb" />
                          </span>
                        </span>
                        Searching...
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
                        No results found.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Contract Search Bar */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  className="table-filter-input"
                  placeholder="Search contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '.5rem',
                    width: '100%',
                    maxWidth: '300px',
                    fontSize: '1rem',
                    marginLeft: 'auto',
                    borderRadius: 8,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                />
              </div>
            </div>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <DashboardMetrics data={metrics} />
                <ContractTable contracts={contracts} searchQuery={searchQuery} />
                <button
                  style={{
                    background: '#088eee',
                    color: '#fff',
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    fontSize: '1rem',
                  }}
                  onClick={() => navigate('/new')}
                >
                  + New Contract
                </button>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
  
};

export default Dashboard;
