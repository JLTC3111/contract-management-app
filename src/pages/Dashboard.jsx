import DashboardMetrics from '../components/DashboardMetrics';
import ContractTable from '../components/ContractTable';
import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { contractsApi } from '../api/contracts';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Search, FilePenLine, CheckCircle } from 'lucide-react';
import NotificationDropdown from '../components/NotificationDropdown';
import { useTranslation } from 'react-i18next';
import { getI18nOrFallback, normalizeContractStatus } from '../utils/formatters';
import {
  buildDashboardMetrics,
  DEFAULT_DASHBOARD_METRIC_FILTER,
  filterContractsByMetric,
} from '../utils/contractMetrics';


const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(DEFAULT_DASHBOARD_METRIC_FILTER);
  const searchRef = useRef();
  const metricsRef = useRef();
  const debounceTimeout = useRef();
  const { t } = useTranslation();

  const metrics = useMemo(() => buildDashboardMetrics(contracts), [contracts]);

  const filteredContracts = useMemo(() => {
    if (!activeFilter) return contracts;
    return filterContractsByMetric(contracts, activeFilter);
  }, [contracts, activeFilter]);

  const handleMetricClick = (metricKey) => {
    setActiveFilter((current) => (
      current === metricKey ? DEFAULT_DASHBOARD_METRIC_FILTER : metricKey
    ));
  };

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
      setLoading(true);
  
      try {
        // Use contractsApi which handles demo mode
        const data = await contractsApi.getAll({ orderBy: 'updated_at', ascending: false });
  
        if (!data || !Array.isArray(data)) {
          console.error('Unexpected data format:', data);
          setLoading(false);
          return;
        }

        const normalizedData = data.map((contract) => ({
          ...contract,
          status: normalizeContractStatus(contract.status) || contract.status || 'draft',
        }));
  
        setContracts(normalizedData);
      } catch (error) {
        console.error('Error fetching contracts:', error.message);
      }
  
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
        // Get all contracts using API (handles demo mode)
        try {
          const contracts = await contractsApi.getAll();
          if (!contracts) {
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
                        contractTitle: getI18nOrFallback(t, contract, 'title_i18n', 'title'),
                  name: item.name,
                  isFolder: item.isFolder,
                  path: item.basePath,
                  fullPath: item.fullPath,
                });
              }
            }
          }
          if (active) setSearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
        }
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

      if (!activeFilter) return;

      if (metricsRef.current?.contains(e.target)) return;

      const isClickOnTable = e.target.closest('.contract-table-wrapper')
        || e.target.closest('.contract-table')
        || e.target.closest('table');

      if (isClickOnTable) return;

      setActiveFilter(DEFAULT_DASHBOARD_METRIC_FILTER);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeFilter]);

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


      <div className="dashboard-page">
          <div className="dashboard-page__header">
            <h1 className="dashboard-page__title">{t('dashboard.title', 'Dashboard')}</h1>
            <NotificationDropdown />
          </div>

          <div className="dashboard-page__actions">
            <div className="dashboard-page__action-buttons">
              {(user?.role === 'admin' || user?.role === 'approver') && (
                <button
                  onClick={() => navigate('/approvals')}
                  className="btn-hover-effect dashboard-page__btn dashboard-page__btn--approvals"
                >
                  <CheckCircle size={16} />
                  {t('dashboard.approvalRequests', 'Approval Requests')}
                </button>
              )}
              <button
                className="btn-hover-effect dashboard-page__btn dashboard-page__btn--new"
                onClick={() => navigate('/new')}
              >
                + {t('buttons.newContract')}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="dashboard-page__loading">{t('dashboard.loading')}</p>
          ) : (
            <>
              <div ref={metricsRef} className="dashboard-page__metrics">
                <DashboardMetrics data={metrics} onMetricClick={handleMetricClick} activeFilter={activeFilter} />
              </div>

              <div className="dashboard-page__search-row">
                <div className="dashboard-page__search dashboard-page__search--files" ref={searchRef}>
                  <input
                    type="text"
                    className="file-folder-search-input dashboard-page__search-input"
                    placeholder={t('dashboard.searchFiles', 'Search files or folders...')}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {showDropdown && searchTerm && (
                    <div className="dashboard-page__search-dropdown">
                      {searchLoading && (
                        <div className="dashboard-page__search-status">
                          <span className="search-anim-icon dashboard-page__search-icon">
                            <span className="dashboard-page__search-icon-search">
                              <Search size={18} style={{ animation: 'search-move 1s linear infinite' }} />
                            </span>
                            <span className="dashboard-page__search-icon-file">
                              <FilePenLine size={16} color="#cbd5e1" fill="#e5e7eb" />
                            </span>
                          </span>
                          {t('dashboard.searching')}
                        </div>
                      )}
                      {!searchLoading && searchResults.length > 0 && searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="dashboard-page__search-result"
                          onClick={() => {
                            setShowDropdown(false);
                            setSearchTerm('');
                            navigate(`/contracts/${result.contractId}`);
                          }}
                        >
                          <span>{result.isFolder ? '📁' : '📄'}</span>
                          <span className="dashboard-page__search-result-name">{result.name}</span>
                          <span className="dashboard-page__search-result-contract">{result.contractTitle}</span>
                        </div>
                      ))}
                      {!searchLoading && searchResults.length === 0 && (
                        <div className="dashboard-page__search-empty">
                          {t('dashboard.noResultsFound')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="dashboard-page__search dashboard-page__search--contracts">
                  <input
                    type="text"
                    className="table-filter-input dashboard-page__search-input"
                    placeholder={t('dashboard.searchContracts', 'Search contracts...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="dashboard-page__table">
                <ContractTable
                  contracts={filteredContracts}
                  searchQuery={searchQuery}
                  statusFilter={activeFilter}
                />
              </div>
            </>
          )}
      </div>
    </>
  );
  
};

export default Dashboard;
