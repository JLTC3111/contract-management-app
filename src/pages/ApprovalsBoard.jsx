// src/pages/ApprovalsBoard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '../hooks/useUser';
import { approvalsApi, contractsApi } from '../api/contracts';
import { getContractStage } from '../utils/stages';
import { formatDate, getI18nOrFallback } from '../utils/formatters';
import { canDecideApproval } from '../utils/permissions';
import { StageTag } from '../components/dashboard/StageTag';
import RetryNotice from '../components/common/RetryNotice';
import DraftNotice from '../components/common/DraftNotice';
import { draftKey, readDraft, useDraftRecovery } from '../hooks/useDraftRecovery';
import { useRevalidate } from '../hooks/useRevalidate';
import '../components/dashboard/dashboard.css';

const CAN_VIEW = ['admin', 'approver', 'editor'];

function ApprovalResponseDraft({ accountId, requestId, value, onChange, recoveryRef, disabled }) {
  const { t } = useTranslation();
  const recovery = useDraftRecovery({ accountId, scope: `approval:${requestId}`, value,
    dirty: !!value.trim(), onRestore: (text) => { if (typeof text === 'string') onChange(text); },
  });
  recoveryRef.current = recovery;
  return <>
    <DraftNotice recovery={recovery} />
    <textarea className="ledger-approvals__textarea" value={value}
      onChange={(event) => onChange(event.target.value)} disabled={disabled || recovery.pending}
      placeholder={t('approval_board_placeholder')} aria-label={t('defaultApprovalResponse')} autoFocus />
  </>;
}
/**
 * Approval request page: one request read top to bottom in a single measured
 * column. `/approvals/:id` shows that request; `/approvals` shows the pending
 * queue in the same layout.
 *
 * `.ledger` is what carries the design tokens, so it has to stay on the root.
 */
const ApprovalsBoard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useUser();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  /** Decisions made in this session. The request stays on screen with its
      confirmation banner instead of vanishing out of the pending queue. */
  const [decisions, setDecisions] = useState({});

  // Response editing
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const canView = !!user && CAN_VIEW.includes(user.role);
  const [deciding, setDeciding] = useState(null);
  const decisionInFlight = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const loadGeneration = useRef(0);
  const responseRecovery = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!canView) return;
    const generation = ++loadGeneration.current;
    if (!silent) setLoading(true);
    try {
      if (id) {
        const request = await approvalsApi.getById(id);
        if (generation !== loadGeneration.current) return;
        if (!request) {
          setRequests([]);
          setLoadError(null);
          return;
        }
        const contract = await contractsApi.getById(request.contract_id);
        if (generation !== loadGeneration.current) return;
        setRequests([{ ...request, contracts: contract || null }]);
        setLoadError(null);
        return;
      }

      const pending = await approvalsApi.getPending();
      if (generation !== loadGeneration.current) return;
      if (!pending?.length) {
        setRequests([]);
        setLoadError(null);
        return;
      }

      const contracts = await contractsApi.getAll();
      if (generation !== loadGeneration.current) return;
      setRequests(pending.map((request) => ({
        ...request,
        // No title on the placeholder: an English literal here would win over
        // the translated t('unknown_contract') the heading falls back to.
        contracts: contracts?.find((c) => c.id === request.contract_id)
          || { id: request.contract_id, title: null, status: null, updated_at: null },
      })));
      setLoadError(null);
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      console.error('Error fetching approval requests:', err);
      setLoadError(err);
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [canView, id]);

  useEffect(() => { load(); return () => { loadGeneration.current += 1; }; }, [load]);
  useRevalidate(() => {
    if (editingId === null && !saving && deciding === null) return load({ silent: true });
  });

  /** What the request reads as now - a decision made here outranks the fetched
      status, which is still 'pending' in the row we already have. */
  const statusOf = useCallback(
    (request) => decisions[request.id] || request.status || 'pending',
    [decisions]
  );

  const titleOf = useCallback(
    (request) => getI18nOrFallback(t, request.contracts, 'title_i18n', 'title')
      || t('unknown_contract'),
    [t]
  );

  /** The header tag speaks for the request when there is exactly one on screen;
      a queue is pending by definition, since that is all getPending returns. */
  const headerStatus = requests.length === 1 ? statusOf(requests[0]) : 'pending';

  const statusLabel = useMemo(() => ({
    pending: t('pending'),
    approved: t('status.approved', 'Approved'),
    rejected: t('approvals.rejected', 'Rejected'),
    superseded: t('approvals.superseded', 'Superseded'),
  }), [t]);

  const handleDecision = async (request, action) => {
    if (!canDecideApproval(user, request) || statusOf(request) !== 'pending' || decisionInFlight.current) return;
    decisionInFlight.current = true;
    setDeciding(request.id);
    try {
      const decided = await approvalsApi.decide(request.id, action === 'approve' ? 'approved' : 'rejected');
      setDecisions((prev) => ({ ...prev, [request.id]: decided.status }));
      setRequests((prev) => prev.map((row) => row.id === request.id ? { ...row, ...decided } : row));
      toast.success(t('contract_approval_action_completed_successfully'));
      // Refresh the displayed contract after the transaction has committed.
      contractsApi.getById(request.contract_id).then((contract) => {
        setRequests((prev) => prev.map((row) => row.id === request.id ? { ...row, contracts: contract } : row));
      }).catch((error) => console.error('Could not refresh contract:', error));
    } catch (err) {
      console.error('Error handling approval action:', err);
      toast.error(err.message || t('failed_to_process_approval_action'));
      if (err.code === '55000') await load();
    } finally {
      decisionInFlight.current = false;
      setDeciding(null);
    }
  };

  const startEdit = (request) => {
    if (!canDecideApproval(user, request)) return;
    if (editingId !== null && !responseRecovery.current?.confirmLeave()) return;
    setEditingId(request.id);
    setDraft(request.approval_response || t('defaultApprovalResponseText'));
  };

  const cancelEdit = useCallback(() => {
    if (!responseRecovery.current?.confirmLeave()) return;
    setEditingId(null);
    setDraft('');
  }, []);

  const saveEdit = useCallback(async (requestId, text) => {
    const request = requests.find((row) => row.id === requestId);
    if (!request || !canDecideApproval(user, request) || saving || responseRecovery.current?.pending) return;
    const message = text.trim();
    if (!message) {
      toast.error(t('response_message_cannot_be_empty', 'Response message cannot be empty'));
      return;
    }

    setSaving(true);
    try {
      await approvalsApi.update(requestId, { approval_response: message });
      // Keep the saved text on screen rather than refetching: a decided request
      // is no longer pending and a refetch would drop it from the queue.
      setRequests((prev) => prev.map((r) => (
        r.id === requestId ? { ...r, approval_response: message } : r
      )));
      toast.success(t('approval_response_updated_successfully'));
      responseRecovery.current?.clear();
      setEditingId(null);
      setDraft('');
    } catch (err) {
      console.error('Error saving approval response:', err);
      toast.error(t('failed_to_save_approval_response'));
    } finally {
      setSaving(false);
    }
  }, [t, requests, user, saving]);

  // Cmd/Ctrl+Enter commits the response, Escape abandons it.
  useEffect(() => {
    if (editingId === null) return undefined;
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!saving) saveEdit(editingId, draft);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (!saving) cancelEdit();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editingId, draft, saving, saveEdit, cancelEdit]);

  // An open response keeps its entered text when the UI language changes.

  if (!canView) {
    return (
      <div className="ledger ledger-approvals">
        <header className="ledger-approvals__head">
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate(-1)}
            aria-label={t('buttons.back', 'Back')}
            title={t('buttons.back', 'Back')}
          >
            <ArrowLeft size={19} />
          </button>
          <h1 className="ledger-approvals__title">{t('access_denied')}</h1>
        </header>
        <p className="ledger-state">{t('no_permission_to_view_approval_requests')}</p>
      </div>
    );
  }

  return (
    <div className="ledger ledger-approvals">
      <header className="ledger-approvals__head">
        <button
          type="button"
          className="btn-icon"
          onClick={() => navigate(-1)}
          aria-label={t('buttons.back', 'Back')}
          title={t('buttons.back', 'Back')}
        >
          <ArrowLeft size={19} />
        </button>
        <h1 className="ledger-approvals__title">
          {requests.length > 1
            ? t('approvals.pageTitlePlural', 'Approval requests')
            : t('approvals.pageTitle', 'Approval request')}
        </h1>
        {!loading && requests.length > 0 && (
          <span className={`tag ${headerStatus === 'pending' ? 'tag-accent' : 'tag-quiet'}`}>
            {statusLabel[headerStatus] || statusLabel.pending}
          </span>
        )}
      </header>

      {loadError && <RetryNotice onRetry={() => load({ silent: true })} />}
      {loading ? (
        <p className="ledger-state">{t('loading_approval_requests')}</p>
      ) : requests.length === 0 && !loadError ? (
        <p className="ledger-state">
          {t('currentlyNoApprovalRequestsWaitingForYourReview')}
        </p>
      ) : (
        <div className="ledger-approvals__body">
          {requests.map((request) => {
            const decision = statusOf(request) === 'pending' ? null : statusOf(request);
            const canAct = canDecideApproval(user, request);
            const editing = editingId === request.id;
            const lockedClass = canAct ? '' : ' ledger-approvals__locked';

            return (
              <article className="ledger-approvals__request" key={request.id}>
                <div>
                  <p className="ledger-approvals__requester">
                    {t('requestedBy')}{' '}
                    {request.requester_email || request.requested_by_name || '—'}
                  </p>
                  <h2 className="ledger-approvals__contract">{titleOf(request)}</h2>
                </div>

                <section className="ledger-panel">
                  <div className="ledger-panel__head">
                    <span className="ledger-panel__label">{t('requestMessage')}</span>
                  </div>
                  <div className="ledger-panel__body">
                    {/* Seeded demo requests carry a message_i18n key; requests filed
                        in the app only have the message text that was stored. */}
                    <p className="ledger-approvals__message">
                      {getI18nOrFallback(t, request, 'message_i18n', 'message') || '—'}
                    </p>
                  </div>
                </section>

                <section className="ledger-panel">
                  <div className="ledger-panel__head">
                    <span className="ledger-panel__label">{t('contractDetails')}</span>
                  </div>
                  <div className="ledger-panel__body">
                    <dl className="ledger-approvals__facts">
                      <div className="ledger-approvals__fact">
                        <dt>{t('status_label')}</dt>
                        <dd><StageTag stage={getContractStage(request.contracts)} /></dd>
                      </div>
                      <div className="ledger-approvals__fact">
                        <dt>{t('table.lastUpdated', 'Last Updated')}</dt>
                        <dd>{formatDate(request.contracts?.updated_at, {}, i18n.language)}</dd>
                      </div>
                      <div className="ledger-approvals__fact">
                        <dt>{t('approvals.requestedOn', 'Requested on')}</dt>
                        <dd>{formatDate(request.created_at, {}, i18n.language)}</dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="ledger-panel">
                  <div className="ledger-panel__head">
                    <span className="ledger-panel__label">
                      {t('defaultApprovalResponse')}
                    </span>
                    <button
                      type="button"
                      className={`ledger-panel__action${lockedClass}`}
                      onClick={() => (editing ? saveEdit(request.id, draft) : startEdit(request))}
                      disabled={!canAct || saving || deciding !== null}
                    >
                      {editing
                        ? (saving ? t('approval_board_saving') : t('approvals.done', 'Done'))
                        : t('approval_board_edit')}
                    </button>
                  </div>
                  <div className="ledger-panel__body">
                    {editing ? (
                      <ApprovalResponseDraft key={request.id} accountId={user?.id} requestId={request.id}
                        value={draft} onChange={setDraft} recoveryRef={responseRecovery} disabled={saving} />
                    ) : (
                      <><p className="ledger-approvals__response">
                        “{request.approval_response || t('defaultApprovalResponseText')}”
                      </p>
                        {canAct && readDraft(draftKey(user?.id, `approval:${request.id}`)) !== null &&
                          <button type="button" className="btn-secondary" onClick={() => startEdit(request)}>{t('recovery.restore', 'Restore draft')}</button>}
                      </>
                    )}
                  </div>
                </section>

                {decision ? (
                  <p className="ledger-approvals__decision" role="status">
                    {decision === 'superseded'
                      ? t('approvals.supersededConfirmation', 'The contract changed. Submit a new approval request.')
                      : decision === 'approved'
                      ? t('approvals.approvedConfirmation', 'You approved this request.')
                      : t('approvals.rejectedConfirmation', 'You rejected this request.')}
                  </p>
                ) : (
                  <div className={`ledger-approvals__actions${lockedClass}`}>
                    <button
                      type="button"
                      className="btn-accent"
                      disabled={!canAct || deciding !== null}
                      onClick={() => handleDecision(request, 'approve')}
                    >
                      {t('approval_board_approve')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={!canAct || deciding !== null}
                      onClick={() => handleDecision(request, 'reject')}
                    >
                      {t('approval_board_reject')}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsBoard;
