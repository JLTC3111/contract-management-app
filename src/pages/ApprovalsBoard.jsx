// src/pages/ApprovalsBoard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '../hooks/useUser';
import { approvalsApi, contractsApi } from '../api/contracts';
import { getContractStage, getNextStage, stageUpdatePayload } from '../utils/stages';
import { formatDate, getI18nOrFallback } from '../utils/formatters';
import { StageTag } from '../components/dashboard/StageTag';
import '../components/dashboard/dashboard.css';

const CAN_VIEW = ['admin', 'approver', 'editor'];
/** Editors see the queue but cannot act on it, so their controls are locked. */
const CAN_ACT = ['admin', 'approver'];

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
  const canAct = !!user && CAN_ACT.includes(user.role);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      if (id) {
        const request = await approvalsApi.getById(id);
        if (!request) {
          setRequests([]);
          return;
        }
        const contract = await contractsApi.getById(request.contract_id);
        setRequests([{ ...request, contracts: contract || null }]);
        return;
      }

      const pending = await approvalsApi.getPending();
      if (!pending?.length) {
        setRequests([]);
        return;
      }

      const contracts = await contractsApi.getAll();
      setRequests(pending.map((request) => ({
        ...request,
        // No title on the placeholder: an English literal here would win over
        // the translated t('unknown_contract') the heading falls back to.
        contracts: contracts?.find((c) => c.id === request.contract_id)
          || { id: request.contract_id, title: null, status: null, updated_at: null },
      })));
    } catch (err) {
      console.error('Error fetching approval requests:', err);
      toast.error(t('errors.approvalActionFailed', 'Approval action failed.'));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [canView, id, t]);

  useEffect(() => { load(); }, [load]);

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
  }), [t]);

  const handleDecision = async (request, action) => {
    const approved = action === 'approve';
    try {
      await approvalsApi.update(request.id, { status: approved ? 'approved' : 'rejected' });

      // Approving moves the contract on to the next stage; rejecting only
      // stamps the status and leaves the stage where it is.
      try {
        let updates = { status: 'rejected' };
        if (approved) {
          const current = getContractStage(request.contracts);
          // Sign-off on a Draft or In Review contract lands it in Negotiation.
          const next = ['draft', 'in_review'].includes(current)
            ? 'negotiation'
            : getNextStage(current) ?? current;
          updates = stageUpdatePayload(next);
        }
        await contractsApi.update(request.contract_id, updates);
        toast.success(t('contract_approval_action_completed_successfully'));
      } catch (contractError) {
        console.error('Error updating contract status:', contractError);
        toast.error(t('approval_action_completed_but_failed_to_update_contract_status'));
      }

      setDecisions((prev) => ({ ...prev, [request.id]: approved ? 'approved' : 'rejected' }));
    } catch (err) {
      console.error('Error handling approval action:', err);
      toast.error(t('failed_to_process_approval_action'));
    }
  };

  const startEdit = (request) => {
    setEditingId(request.id);
    setDraft(request.approval_response || t('defaultApprovalResponseText'));
  };

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft('');
  }, []);

  const saveEdit = useCallback(async (requestId, text) => {
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
      setEditingId(null);
      setDraft('');
    } catch (err) {
      console.error('Error saving approval response:', err);
      toast.error(t('failed_to_save_approval_response'));
    } finally {
      setSaving(false);
    }
  }, [t]);

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

  // The stored response wins; only the untouched default follows the language.
  useEffect(() => {
    if (editingId === null) return;
    const request = requests.find((r) => r.id === editingId);
    if (request && !request.approval_response) setDraft(t('defaultApprovalResponseText'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

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

      {loading ? (
        <p className="ledger-state">{t('loading_approval_requests')}</p>
      ) : requests.length === 0 ? (
        <p className="ledger-state">
          {t('currentlyNoApprovalRequestsWaitingForYourReview')}
        </p>
      ) : (
        <div className="ledger-approvals__body">
          {requests.map((request) => {
            const decision = decisions[request.id];
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
                      disabled={saving}
                    >
                      {editing
                        ? (saving ? t('approval_board_saving') : t('approvals.done', 'Done'))
                        : t('approval_board_edit')}
                    </button>
                  </div>
                  <div className="ledger-panel__body">
                    {editing ? (
                      <textarea
                        className="ledger-approvals__textarea"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={t('approval_board_placeholder')}
                        aria-label={t('defaultApprovalResponse')}
                        autoFocus
                      />
                    ) : (
                      <p className="ledger-approvals__response">
                        “{request.approval_response || t('defaultApprovalResponseText')}”
                      </p>
                    )}
                  </div>
                </section>

                {decision ? (
                  <p className="ledger-approvals__decision" role="status">
                    {decision === 'approved'
                      ? t('approvals.approvedConfirmation', 'You approved this request.')
                      : t('approvals.rejectedConfirmation', 'You rejected this request.')}
                  </p>
                ) : (
                  <div className={`ledger-approvals__actions${lockedClass}`}>
                    <button
                      type="button"
                      className="btn-accent"
                      onClick={() => handleDecision(request, 'approve')}
                    >
                      {t('approval_board_approve')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
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
