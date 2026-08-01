// src/pages/ContractRecord.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, FolderPlus, Pencil, Trash2, Workflow } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  approvalsApi,
  commentsApi,
  contractsApi,
  storageApi,
} from '../api/contracts';
import { useUser } from '../hooks/useUser';
import {
  currencyForLocale,
  formatCurrency,
  formatDate,
  formatFileSize,
  getI18nOrFallback,
} from '../utils/formatters';
import {
  ADVANCEABLE_STAGES,
  getContractStage,
  getStageLabel,
  stageUpdatePayload,
} from '../utils/stages';
import { getCategoryLabel } from '../utils/constants';
import { deleteAttachments, sanitizeFileName, uploadAttachments } from '../utils/uploads';
import { StageTag } from '../components/dashboard/StageTag';
import EditContractModal from '../components/dashboard/EditContractModal';
import '../components/dashboard/dashboard.css';

/** The sidebar's "Full record" row reopens whatever was last read here. */
export const LAST_RECORD_KEY = 'ledger.lastRecordId';

/** Only a Draft can be sent for approval from this page. */
const APPROVAL_STAGE = 'draft';

const ContractRecord = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useUser() ?? {};

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const canEdit = !!user && ['admin', 'editor'].includes(user.role);

  const loadContract = useCallback(async () => {
    if (!contractId) return;
    try {
      const data = await contractsApi.getById(contractId);
      setContract(data || null);
    } catch (err) {
      console.error('Could not load contract:', err);
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  const loadDocuments = useCallback(async () => {
    const files = await storageApi.listFiles(`uploads/${contractId}`).catch(() => []);
    // `.keep` markers only exist to hold an empty folder open; a folder entry has
    // no mimetype at all.
    setDocuments((files || []).filter((f) => f.metadata?.mimetype && f.name !== '.keep'));
  }, [contractId]);

  const loadComments = useCallback(async () => {
    setComments(await commentsApi.getByContractId(contractId).catch(() => []) || []);
  }, [contractId]);

  useEffect(() => { loadContract(); }, [loadContract]);
  useEffect(() => { loadDocuments(); loadComments(); }, [loadDocuments, loadComments]);

  useEffect(() => {
    if (contractId) localStorage.setItem(LAST_RECORD_KEY, String(contractId));
  }, [contractId]);

  const stage = getContractStage(contract);
  const title = contract ? getI18nOrFallback(t, contract, 'title_i18n', 'title') : '';
  const canSendForApproval = stage === APPROVAL_STAGE;

  /**
   * Activity, derived from where the contract sits in the stage order: every
   * stage up to and including the current one has been passed through. Only the
   * latest move has a date the row actually knows, so earlier ones show none.
   */
  const activity = useMemo(() => {
    const reached = ADVANCEABLE_STAGES.indexOf(stage);
    const passed = reached === -1 ? [stage] : ADVANCEABLE_STAGES.slice(0, reached + 1);
    return passed
      .map((s, i) => ({
        stage: s,
        date: i === passed.length - 1
          ? contract?.updated_at
          : (i === 0 ? contract?.created_at : null),
      }))
      .reverse();
  }, [stage, contract?.updated_at, contract?.created_at]);

  const facts = useMemo(() => {
    if (!contract) return [];
    const money = contract.contract_value
      ? formatCurrency(contract.contract_value, currencyForLocale(i18n.language), i18n.language)
      : '—';
    return [
      { key: 'status', label: t('status_label', 'Status'), node: <StageTag stage={stage} /> },
      { key: 'version', label: t('approvalRequests.version', 'Version'), value: contract.version || '—' },
      { key: 'owner', label: t('dashboard.col.owner', 'Owner'), value: contract.author || '—' },
      {
        key: 'category',
        label: t('dashboard.col.category', 'Category'),
        value: contract.category ? getCategoryLabel(t, contract.category) : '—',
      },
      { key: 'counterparty', label: t('dashboard.counterparty', 'Counterparty'), value: contract.client_name || '—' },
      { key: 'value', label: t('record.contractValue', 'Contract value'), value: money },
      {
        key: 'expires',
        label: t('dashboard.col.expires', 'Expires'),
        value: contract.expiry_date ? formatDate(contract.expiry_date, {}, i18n.language) : '—',
      },
      {
        key: 'created',
        label: t('record.created', 'Created'),
        value: contract.created_at ? formatDate(contract.created_at, {}, i18n.language) : '—',
      },
      {
        key: 'updated',
        label: t('table.lastUpdated', 'Last Updated'),
        value: contract.updated_at ? formatDate(contract.updated_at, {}, i18n.language) : '—',
      },
    ];
  }, [contract, stage, t, i18n.language]);

  const openDocument = async (name) => {
    try {
      const url = await storageApi.getSignedUrl(`uploads/${contractId}/${name}`);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error('Could not open document:', err);
    }
  };

  const handleSave = async (target, updates, attachments = [], removedFiles = []) => {
    setBusy(true);
    try {
      const { stage: nextStage, ...rest } = updates;
      await contractsApi.update(target.id, { ...rest, ...stageUpdatePayload(nextStage) });
      if (removedFiles.length) {
        const { failed } = await deleteAttachments(target.id, removedFiles);
        if (failed.length) {
          toast.error(t('dashboard.deleteFileFailed', 'Some files could not be deleted: {{names}}', {
            names: failed.map((f) => f.name).join(', '),
          }));
        }
      }
      if (attachments.length) {
        const { failed } = await uploadAttachments(target.id, attachments);
        if (failed.length) {
          toast.error(t('dashboard.uploadFailed', 'Some files did not upload: {{names}}', {
            names: failed.map((f) => f.name).join(', '),
          }));
        }
      }
      setEditing(false);
      await Promise.all([loadContract(), loadDocuments()]);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(t('dashboard.saveFailed', 'Could not save changes: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t('dashboard.confirmDelete', 'Delete "{{name}}"? This cannot be undone.', { name: title })
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await contractsApi.delete(contract.id);
      localStorage.removeItem(LAST_RECORD_KEY);
      navigate('/');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(t('dashboard.deleteFailed', 'Could not delete contract: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  /** A folder exists in storage only as long as something is in it, so a new one
      is held open by a `.keep` marker - the same convention FileBrowser used. */
  const handleNewFolder = async () => {
    const raw = window.prompt(t('record.newFolderPrompt', 'Folder name'));
    if (raw === null) return;
    const name = sanitizeFileName(raw.trim());
    if (!name) {
      toast.error(t('record.folderNameInvalid', 'Folder name must contain letters or numbers.'));
      return;
    }

    setBusy(true);
    try {
      await storageApi.upload(
        `uploads/${contractId}/${name}/.keep`,
        new Blob(['keep'], { type: 'text/plain' })
      );
      toast.success(t('record.folderCreated', 'Folder "{{name}}" created.', { name }));
      await loadDocuments();
    } catch (err) {
      console.error('Could not create folder:', err);
      toast.error(t('record.folderFailed', 'Could not create folder: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Files an approval request and moves the Draft to In Review. The board would
   * otherwise show one card per click, so an existing request short-circuits.
   */
  const handleSendForApproval = async () => {
    setBusy(true);
    try {
      const pending = await approvalsApi.getPending().catch(() => []);
      if (pending.some((r) => String(r.contract_id) === String(contract.id))) {
        toast.error(t(
          'dashboard.approvalAlreadyPending',
          'This contract already has an approval request awaiting review.'
        ));
        return;
      }

      await approvalsApi.create({
        contract_id: contract.id,
        requester_id: user?.id,
        requester_email: user?.email,
        message: t('dashboard.approvalRequestMessage', 'Approval requested for "{{name}}".', {
          name: title || '',
        }),
        status: 'pending',
      });
      await contractsApi.update(contract.id, stageUpdatePayload('in_review'));
      toast.success(t('success.approvalRequestSent', 'Approval request sent successfully!'));
      await loadContract();
    } catch (err) {
      console.error('Send for approval failed:', err);
      toast.error(t('dashboard.approvalFailed', 'Could not send for approval: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  const postComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    setPosting(true);
    try {
      // contract_comments RLS is WITH CHECK (auth.uid() = user_id), so the row
      // must carry the author's id or the insert is rejected.
      await commentsApi.create({
        contract_id: contract.id,
        user_id: user?.id,
        user_email: user?.email,
        comment: body,
      });
      setCommentText('');
      await loadComments();
    } catch (err) {
      console.error('Could not post comment:', err);
      toast.error(t('dashboard.commentFailed', 'Could not post comment: {{msg}}', { msg: err.message }));
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="ledger ledger-record">
        <p className="ledger-state">{t('dashboard.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="ledger ledger-record">
        <header className="ledger-record__head">
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate('/')}
            aria-label={t('buttons.back', 'Back')}
          >
            <ArrowLeft size={19} />
          </button>
          <h1 className="ledger-record__brand">
            {t('lifecycle.contractNotFound', 'Contract not found')}
          </h1>
        </header>
        <p className="ledger-state">
          {t('lifecycle.contractNotFoundMessage',
            'The requested contract could not be found or you may not have access to it.')}
        </p>
      </div>
    );
  }

  return (
    <div className="ledger ledger-record">
      <header className="ledger-record__head">
        <button
          type="button"
          className="btn-icon"
          onClick={() => navigate('/')}
          aria-label={t('buttons.back', 'Back')}
          title={t('buttons.back', 'Back')}
        >
          <ArrowLeft size={19} />
        </button>
        <h1 className="ledger-record__brand" title={title}>{title || '—'}</h1>
        <StageTag stage={stage} />
      </header>

      <div className="ledger-record__body">
        <div>
          <p className="ledger-record__eyebrow">
            {contract.category
              ? getCategoryLabel(t, contract.category)
              : t('dashboard.uncategorized', 'Uncategorized')}
          </p>
          <h2 className="ledger-record__title">{title || '—'}</h2>
        </div>

        <div className="ledger-record__actions">
          <button
            type="button"
            className="btn-accent"
            onClick={() => navigate(`/phases/${contract.id}`)}
          >
            <Workflow size={15} aria-hidden="true" />
            {t('dashboard.manageStage', 'Manage stage')}
          </button>
          {canEdit && (
            <>
              <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                <Pencil size={15} aria-hidden="true" />
                {t('buttons.edit', 'Edit')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleNewFolder}
                disabled={busy}
              >
                <FolderPlus size={15} aria-hidden="true" />
                {t('buttons.newFolder', 'New Folder')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDelete}
                disabled={busy}
              >
                <Trash2 size={15} aria-hidden="true" />
                {t('buttons.deleteContract', 'Delete')}
              </button>
            </>
          )}
        </div>

        <section className="ledger-panel">
          <div className="ledger-panel__head">
            <span className="ledger-panel__label">{t('contractDetails', 'Contract Details')}</span>
          </div>
          <div className="ledger-panel__body">
            <dl className="ledger-record__facts">
              {facts.map((f) => (
                <div key={f.key} className="ledger-record__fact">
                  <dt>{f.label}</dt>
                  <dd>{f.node ?? f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="ledger-panel">
          <div className="ledger-panel__head">
            <span className="ledger-panel__label">{t('record.description', 'Description')}</span>
          </div>
          <div className="ledger-panel__body">
            <p className="ledger-record__text">
              {contract.description || contract.content
                || t('record.noDescription', 'No description provided.')}
            </p>
          </div>
        </section>

        <section className="ledger-panel">
          <div className="ledger-panel__head">
            <span className="ledger-panel__label">{t('dashboard.documents', 'Documents')}</span>
            <button
              type="button"
              className="ledger-panel__action"
              onClick={handleSendForApproval}
              disabled={!canSendForApproval || busy}
              title={canSendForApproval
                ? undefined
                : t('record.approvalDraftOnly', 'Only draft contracts can be sent for approval.')}
            >
              {t('dashboard.sendForApproval', 'Send for approval')}
            </button>
          </div>
          <div className="ledger-panel__body">
            {documents.length === 0 ? (
              <p className="ledger-record__empty">{t('dashboard.noDocuments', 'No documents yet.')}</p>
            ) : (
              documents.map((doc) => (
                <button
                  key={doc.name}
                  type="button"
                  className="ledger-record__row"
                  onClick={() => openDocument(doc.name)}
                >
                  <span aria-hidden="true">📄</span>
                  <span className="ledger-record__row-name">{doc.name}</span>
                  <span className="ledger-record__row-meta">
                    {formatFileSize(doc.metadata?.size ?? 0)}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="ledger-panel">
          <div className="ledger-panel__head">
            <span className="ledger-panel__label">{t('dashboard.activity', 'Activity')}</span>
          </div>
          <div className="ledger-panel__body">
            {activity.map((entry) => (
              <div key={entry.stage} className="ledger-record__row">
                <span className="ledger-record__row-name">
                  {t('dashboard.movedTo', 'Moved to {{stage}}', {
                    stage: getStageLabel(t, entry.stage),
                  })}
                </span>
                <span className="ledger-record__row-meta">
                  {entry.date ? formatDate(entry.date, {}, i18n.language) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="ledger-panel">
          <div className="ledger-panel__head">
            <span className="ledger-panel__label">{t('dashboard.comments', 'Comments')}</span>
          </div>
          <div className="ledger-panel__body">
            {comments.length === 0 ? (
              <p className="ledger-record__empty">{t('dashboard.noComments', 'No comments yet.')}</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="ledger-record__comment">
                  <span className="ledger-record__comment-author">
                    {c.user_name || c.user_email || t('dashboard.unknownAuthor', 'Unknown')}
                  </span>
                  <span className="ledger-record__comment-body">{c.comment || c.content || ''}</span>
                </div>
              ))
            )}

            <div className="ledger-record__compose">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('dashboard.addComment', 'Add a comment...')}
                aria-label={t('dashboard.addComment', 'Add a comment...')}
              />
              <button
                type="button"
                className="btn-accent"
                onClick={postComment}
                disabled={posting || !commentText.trim()}
              >
                {t('dashboard.postComment', 'Post comment')}
              </button>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {editing && (
          <EditContractModal
            key="edit"
            contract={contract}
            busy={busy}
            onCancel={() => setEditing(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractRecord;
