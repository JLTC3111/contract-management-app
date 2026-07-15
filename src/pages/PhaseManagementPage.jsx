import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getI18nOrFallback,
  humanizeContractStatus,
  normalizeContractStatus,
} from '../utils/formatters';
import { DEFAULT_DASHBOARD_METRIC_FILTER } from '../utils/contractMetrics';
import { useUser } from '../hooks/useUser';
import { contractsApi } from '../api/contracts';
import { supabase } from '../utils/supaBaseClient';
import PhaseManagement from '../components/PhaseManagement';
import PhaseTimeline from '../components/PhaseTimeline';
import toast from 'react-hot-toast';

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return '#10b981';
    case 'rejected': return '#ef4444';
    case 'pending': return '#f59e0b';
    case 'expiring': return '#f97316';
    case 'expired': return '#dc2626';
    case 'completed': return '#8b5cf6';
    case 'in_progress': return '#3b82f6';
    default: return '#6b7280';
  }
};

const pickDefaultContract = (contracts) => {
  if (!contracts?.length) return null;
  return contracts.find(
    (c) => normalizeContractStatus(c.status) === DEFAULT_DASHBOARD_METRIC_FILTER,
  ) || contracts[0];
};

const PhaseManagementPage = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const [contract, setContract] = useState(null);
  const [phasesForHeader, setPhasesForHeader] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allContracts, setAllContracts] = useState([]);

  useEffect(() => {
    if (!user) return;

    const loadContracts = async () => {
      try {
        const data = await contractsApi.getAll({ orderBy: 'updated_at', ascending: false });
        setAllContracts(data || []);

        if (!contractId && data?.length) {
          const defaultContract = pickDefaultContract(data);
          if (defaultContract) {
            navigate(`/phases/${defaultContract.id}`, { replace: true });
            return;
          }
        }

        if (!contractId) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching contracts:', error);
        setLoading(false);
      }
    };

    loadContracts();
  }, [user, contractId, navigate]);

  useEffect(() => {
    if (contractId) {
      fetchContractDetails();
    }
  }, [contractId]);

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      const data = await contractsApi.getById(contractId);
      setContract(data);

      const { data: phaseData, error: phaseError } = await supabase
        .from('contract_phases')
        .select('*')
        .eq('contract_id', contractId)
        .order('phase_number');

      if (phaseError) throw phaseError;
      setPhasesForHeader(phaseData || []);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error(t('lifecycle.failedToLoadContractDetails'));
      setContract(null);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPhaseNumber = () => {
    if (!phasesForHeader || phasesForHeader.length === 0) return 1;
    const active = phasesForHeader.find((p) => p.status === 'active');
    const pending = phasesForHeader.find((p) => p.status === 'pending');
    return active?.phase_number || pending?.phase_number || (phasesForHeader[0]?.phase_number ?? 1);
  };

  if (loading || (!contractId && allContracts.length > 0)) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Clock size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text)', fontSize: '1.1rem' }}>
            {t('phaseManagement.loading', 'Loading phases...')}
          </p>
        </div>
      </div>
    );
  }

  if (!contract && contractId) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div>
          <FileText size={48} style={{ color: 'var(--text)', opacity: 0.6, marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>
            {t('Contract Not Found')}
          </h2>
          <p style={{ color: 'var(--text)', opacity: 0.8 }}>
            {t('The requested contract could not be found or you may not have access to it.')}
          </p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{
        padding: '4rem 2rem',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        <Clock size={64} style={{ color: 'var(--text)', opacity: 0.3, marginBottom: '1.5rem' }} />
        <h2 style={{ color: 'var(--text)', marginBottom: '1rem' }}>
          {t('phaseManagement.noContractsAvailable', 'No contracts available')}
        </h2>
        <p style={{ color: 'var(--text)', opacity: 0.7, marginBottom: '2rem', maxWidth: '400px' }}>
          {t('phaseManagement.createContractFirst', 'Create a contract on the dashboard to manage phases.')}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--primary)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FileText size={18} />
          {t('phaseManagement.goToDashboard', 'Go to Dashboard')}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background-color)',
      paddingBottom: '2rem',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--card-border)',
        padding: '2rem',
        marginBottom: '2rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                border: 'none',
                cursor: 'pointer',
                marginRight: '1rem',
                padding: '0.5rem',
                borderRadius: '6px',
                background: 'var(--hover-bg)',
              }}
            >
              <ArrowLeft size={20} color="var(--text)" />
            </button>
            <h1 style={{ color: 'var(--text)', margin: 0, fontSize: '1.8rem' }}>
              {t('phaseManagement.title', 'Phase Management')}
            </h1>
          </div>

          <div>
            <h2 style={{
              color: 'var(--text)',
              margin: '0 0 0.5rem 0',
              fontSize: '1.3rem',
              fontWeight: '600',
            }}>
              {getI18nOrFallback(t, contract, 'title_i18n', 'title')}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <span style={{
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                backgroundColor: `${getStatusColor(normalizeContractStatus(contract.status))}20`,
                color: getStatusColor(normalizeContractStatus(contract.status)),
                border: `1px solid ${getStatusColor(normalizeContractStatus(contract.status))}40`,
              }}>
                {t(
                  `contractTable.status.${normalizeContractStatus(contract.status)}`,
                  humanizeContractStatus(normalizeContractStatus(contract.status)) || String(contract.status || ''),
                )}
              </span>
              {contract.expiry_date && (
                <span style={{
                  color: 'var(--text)',
                  opacity: 0.8,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <Calendar size={16} />
                  {t('lifecycle.expires', 'Expires')}: {new Date(contract.expiry_date).toLocaleDateString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => navigate(`/contracts/${contract.id}`)}
                className="btn-hover-effect"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <Eye size={16} />
                {t('phaseManagement.viewDetails', 'View Details & Documents')}
              </button>
              {allContracts.length > 1 && (
                <select
                  value={contract.id}
                  onChange={(e) => navigate(`/phases/${e.target.value}`)}
                  aria-label={t('lifecycle.selectContract', 'Select Contract')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    marginLeft: 'auto',
                  }}
                >
                  {allContracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getI18nOrFallback(t, c, 'title_i18n', 'title') || c.title || `Contract #${c.id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <PhaseTimeline
            phases={phasesForHeader}
            currentPhaseNumber={getCurrentPhaseNumber()}
            compact
          />
        </div>

        <PhaseManagement
          contractId={contract.id}
          contract={contract}
          onUpdate={fetchContractDetails}
        />
      </div>
    </div>
  );
};

export default PhaseManagementPage;
