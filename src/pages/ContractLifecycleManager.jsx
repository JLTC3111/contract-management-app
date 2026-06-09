import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../hooks/useUser';
import { contractsApi } from '../api/contracts';
import ContractAnalytics from '../components/ContractAnalytics';
import toast from 'react-hot-toast';

const ContractLifecycleManager = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const [allContracts, setAllContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAllContracts();
  }, [user]);

  const fetchAllContracts = async () => {
    setLoading(true);
    try {
      if (!user) return;

      const data = await contractsApi.getAll({ orderBy: 'updated_at', ascending: false });
      setAllContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error(t('lifecycle.failedToLoadContractsForAnalytics'));
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => window.history.back()}
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
              {t('analytics.contractAnalyticsHistory', 'Contract Analytics & History')}
            </h1>
          </div>

          <button
            onClick={() => navigate('/phases')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={16} />
            {t('phaseManagement.title', 'Phase Management')}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
        <ContractAnalytics contracts={allContracts} loading={loading} onRefresh={fetchAllContracts} />
      </div>
    </div>
  );
};

export default ContractLifecycleManager;
