import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useUser } from '../hooks/useUser';
import { contractsApi } from '../api/contracts';
import ContractAnalytics from '../components/ContractAnalytics';
import '../components/dashboard/dashboard.css';

/**
 * Page shell for Analytics & History: header row, then the analytics blocks.
 * `.ledger` is what carries the design tokens, so it has to stay on the root.
 */
const ContractLifecycleManager = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const [allContracts, setAllContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllContracts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await contractsApi.getAll({ orderBy: 'updated_at', ascending: false });
      setAllContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error(t('lifecycle.failedToLoadContractsForAnalytics'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => { fetchAllContracts(); }, [fetchAllContracts]);

  return (
    <div className="ledger ledger-analytics">
      <header className="ledger-analytics__head">
        <button
          type="button"
          className="btn-icon"
          onClick={() => navigate(-1)}
          aria-label={t('buttons.back', 'Back')}
          title={t('buttons.back', 'Back')}
        >
          <ArrowLeft size={19} />
        </button>
        <h1 className="ledger-analytics__title">
          {t('analytics.contractAnalyticsHistory', 'Contract Analytics & History')}
        </h1>
        <button type="button" className="btn-secondary" onClick={() => navigate('/phases')}>
          <Clock size={15} aria-hidden="true" />
          {t('phaseManagement.title', 'Phase Management')}
        </button>
      </header>

      <ContractAnalytics
        contracts={allContracts}
        loading={loading}
        onRefresh={fetchAllContracts}
      />
    </div>
  );
};

export default ContractLifecycleManager;
