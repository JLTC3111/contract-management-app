import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { getI18nOrFallback, normalizeContractStatus } from '../utils/formatters';
import { DEFAULT_DASHBOARD_METRIC_FILTER } from '../utils/contractMetrics';
import { useUser } from '../hooks/useUser';
import { contractsApi, phasesApi } from '../api/contracts';
import PhaseManagement from '../components/PhaseManagement';
import PhaseStepper from '../components/phase-management/PhaseStepper';
import {
  contractPhaseState,
  stateLabel,
  stateTagClass,
} from '../components/phase-management/constants';
import '../components/dashboard/dashboard.css';
import '../components/phase-management/phases.css';

const pickDefaultContract = (contracts) => {
  if (!contracts?.length) return null;
  return contracts.find(
    (c) => normalizeContractStatus(c.status) === DEFAULT_DASHBOARD_METRIC_FILTER,
  ) || contracts[0];
};

/**
 * Page shell for Phase management: header row, the contract being worked on, the
 * six-step stepper, then the panels. `.ledger` is what carries the design tokens,
 * so it has to stay on the root.
 */
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

        if (!contractId) setLoading(false);
      } catch (error) {
        console.error('Error fetching contracts:', error);
        setLoading(false);
      }
    };

    loadContracts();
  }, [user, contractId, navigate]);

  const fetchContractDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contractsApi.getById(contractId);
      setContract(data);

      // Through phasesApi, not supabase directly: demo mode keeps its phases in
      // localStorage, and a raw query here would go looking for 'demo-contract-7'
      // in Postgres and throw.
      setPhasesForHeader(await phasesApi.getByContractId(contractId));
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error(t('lifecycle.failedToLoadContractDetails'));
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [contractId, t]);

  useEffect(() => {
    if (contractId) fetchContractDetails();
  }, [contractId, fetchContractDetails]);

  const header = (
    <header className="phase-head">
      <button
        type="button"
        className="btn-icon"
        onClick={() => navigate(-1)}
        aria-label={t('buttons.back', 'Back')}
        title={t('buttons.back', 'Back')}
      >
        <ArrowLeft size={19} />
      </button>
      <h1 className="phase-head__title">{t('phaseManagement.title', 'Phase management')}</h1>
    </header>
  );

  if (loading || (!contractId && allContracts.length > 0)) {
    return (
      <div className="ledger phase-page">
        {header}
        <p className="phase-empty">{t('phaseManagement.loading', 'Loading phases...')}</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="ledger phase-page">
        {header}
        <p className="phase-empty">
          {contractId
            ? t('phaseManagement.contractNotFound', 'That contract could not be found.')
            : t('phaseManagement.noContractsAvailable', 'No contracts available')}
        </p>
        {!contractId && (
          <div className="phase-contract__row">
            <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
              {t('phaseManagement.goToDashboard', 'Go to dashboard')}
            </button>
          </div>
        )}
      </div>
    );
  }

  const state = contractPhaseState(phasesForHeader);

  return (
    <div className="ledger phase-page">
      {header}

      <div className="phase-contract">
        <h2 className="phase-contract__name">
          {getI18nOrFallback(t, contract, 'title_i18n', 'title')}
        </h2>

        <div className="phase-contract__row">
          {/* Derived from the phases, not from contracts.status: this is how far the
              work has actually got. */}
          <span className={`tag ${stateTagClass(state)}`}>{stateLabel(t, state)}</span>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(`/contracts/${contract.id}`)}
          >
            <Eye size={15} aria-hidden="true" />
            {t('phaseManagement.viewDetails', 'View details & documents')}
          </button>

          {allContracts.length > 1 && (
            <select
              className="input phase-contract__picker"
              value={contract.id}
              onChange={(e) => navigate(`/phases/${e.target.value}`)}
              aria-label={t('lifecycle.selectContract', 'Select contract')}
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

      <PhaseStepper phases={phasesForHeader} />

      <PhaseManagement contractId={contract.id} onUpdate={fetchContractDetails} />
    </div>
  );
};

export default PhaseManagementPage;
