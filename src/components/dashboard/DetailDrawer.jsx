// src/components/dashboard/DetailDrawer.jsx
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronsRight, FileText, Pencil, Trash2, X } from 'lucide-react';
import { commentsApi, phasesApi, storageApi } from '../../api/contracts';
import { useUser } from '../../hooks/useUser';
import {
  currencyForLocale,
  formatCurrency,
  formatDate,
  formatFileSize,
  getI18nOrFallback,
} from '../../utils/formatters';
import {
  APPROVAL_REQUESTABLE_STAGES,
  getContractStage,
  getNextStage,
  getStageColor,
  getStageLabel,
} from '../../utils/stages';
import { getCategoryLabel } from '../../utils/constants';
import { StageTag } from './StageTag';

/**
 * Right-side overlay. The activity feed is derived from `contract_phases`, which
 * is where this app already records a contract's movement.
 */
const DetailDrawer = ({
  contract,
  onClose,
  onAdvance,
  onEdit,
  onDelete,
  onSendForApproval,
  onOpenRecord,
  busy,
  // True while the edit modal is stacked on top: Escape and backdrop clicks
  // belong to that layer, so the drawer must ignore them.
  suppressDismiss = false,
}) => {
  const { t, i18n } = useTranslation();
  // Tolerate being rendered outside UserProvider (tests, storybook-style use).
  const { user } = useUser() ?? {};
  const [tab, setTab] = useState('overview');
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [sending, setSending] = useState(false);

  const stage = getContractStage(contract);
  const next = getNextStage(stage);
  const title = getI18nOrFallback(t, contract, 'title_i18n', 'title');
  const canSendForApproval = APPROVAL_REQUESTABLE_STAGES.includes(stage);

  useEffect(() => {
    let active = true;
    (async () => {
      const [phases, files, notes] = await Promise.all([
        phasesApi.getByContractId(contract.id).catch(() => []),
        storageApi.listFiles(`uploads/${contract.id}`).catch(() => []),
        commentsApi.getByContractId(contract.id).catch(() => []),
      ]);
      if (!active) return;
      setTimeline((phases || []).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        date: p.end_date || p.start_date || p.created_at || null,
      })));
      setDocuments((files || []).filter((f) => f.metadata?.mimetype && f.name !== '.keep'));
      setComments(notes || []);
    })();
    return () => { active = false; };
  }, [contract.id]);

  useEffect(() => {
    if (suppressDismiss) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, suppressDismiss]);

  const openDocument = async (name) => {
    try {
      const url = await storageApi.getSignedUrl(`uploads/${contract.id}/${name}`);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error('Could not open document:', err);
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
      setComments(await commentsApi.getByContractId(contract.id));
    } catch (err) {
      console.error('Could not post comment:', err);
      window.alert(t('dashboard.commentFailed', 'Could not post comment: {{msg}}', { msg: err.message }));
    } finally {
      setPosting(false);
    }
  };

  const sendForApproval = useCallback(async () => {
    setSending(true);
    try {
      await onSendForApproval(contract);
    } finally {
      setSending(false);
    }
  }, [contract, onSendForApproval]);

  const facts = [
    { label: t('dashboard.col.owner', 'Owner'), value: contract.author || '—' },
    { label: t('dashboard.counterparty', 'Counterparty'), value: contract.client_name || '—' },
    {
      label: t('dashboard.col.value', 'Value'),
      value: contract.contract_value
        ? formatCurrency(contract.contract_value, currencyForLocale(i18n.language), i18n.language)
        : '—',
    },
    {
      label: t('dashboard.col.expires', 'Expires'),
      value: contract.expiry_date ? formatDate(contract.expiry_date, {}, i18n.language) : '—',
    },
  ];

  return (
    <>
      <motion.div
        className="ledger-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={suppressDismiss ? undefined : onClose}
      />
      <motion.aside
        className="ledger-drawer"
        role="dialog"
        aria-label={title || t('dashboard.contract', 'Contract')}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <header className="ledger-drawer__head">
          {/* Same passive outline tag the table and kanban use. */}
          <span className="tag tag-outline">
            {contract.category
              ? getCategoryLabel(t, contract.category)
              : t('dashboard.uncategorized', 'Uncategorized')}
          </span>
          <button
            type="button"
            className="ledger-drawer__close"
            onClick={onClose}
            aria-label={t('buttons.close', 'Close')}
          >
            <X size={18} />
          </button>
          <h2 className="ledger-drawer__title">{title || '—'}</h2>
          <StageTag stage={stage} />
        </header>

        {/* The drawer is a summary; everything it leaves out is one click away. */}
        <button
          type="button"
          className="ledger-drawer__record"
          onClick={() => onOpenRecord(contract)}
        >
          <span>{t('record.openFull', 'Open full record view')}</span>
          <span aria-hidden="true">→</span>
        </button>

        <div className="ledger-drawer__actions">
          <button
            type="button"
            className="ledger-btn ledger-btn--primary"
            onClick={() => onAdvance(contract)}
            disabled={!next || busy}
            title={next
              ? t('dashboard.advanceTo', 'Advance to {{stage}}', { stage: getStageLabel(t, next) })
              : t('dashboard.noNextStage', 'No further stage')}
          >
            <ChevronsRight size={14} /> {t('dashboard.manageStage', 'Manage stage')}
          </button>
          <button type="button" className="ledger-btn ledger-btn--ghost" onClick={() => onEdit(contract)}>
            <Pencil size={14} /> {t('buttons.edit', 'Edit')}
          </button>
          <button
            type="button"
            className="ledger-btn ledger-btn--danger"
            onClick={() => onDelete(contract)}
            disabled={busy}
          >
            <Trash2 size={14} /> {t('buttons.deleteContract', 'Delete')}
          </button>
        </div>

        <div className="ledger-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={`ledger-tabs__tab${tab === 'overview' ? ' ledger-tabs__tab--active' : ''}`}
            onClick={() => setTab('overview')}
          >
            {t('dashboard.overview', 'Overview')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'docs'}
            className={`ledger-tabs__tab${tab === 'docs' ? ' ledger-tabs__tab--active' : ''}`}
            onClick={() => setTab('docs')}
          >
            {t('dashboard.docsAndComments', 'Documents & comments')}
          </button>
        </div>

        {tab === 'overview' ? (
          <>
            <dl className="ledger-drawer__facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>

            <h3 className="ledger-drawer__section">{t('dashboard.activity', 'Activity')}</h3>
            {timeline.length === 0 ? (
              <p className="ledger-drawer__empty">
                {t('dashboard.noActivity', 'No recorded stage moves yet.')}
              </p>
            ) : (
              <ol className="ledger-timeline">
                {timeline.map((entry) => (
                  <li key={entry.id} className="ledger-timeline__item">
                    <span
                      className="ledger-timeline__dot"
                      style={{ '--tag-color': entry.status === 'completed'
                        ? getStageColor('executed')
                        : getStageColor('draft') }}
                    />
                    <span className="ledger-timeline__name">
                      {t('dashboard.movedTo', 'Moved to {{stage}}', { stage: entry.name })}
                    </span>
                    <span className="ledger-timeline__date">
                      {entry.date ? formatDate(entry.date, {}, i18n.language) : '—'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <>
            <h3 className="ledger-drawer__section">{t('dashboard.documents', 'Documents')}</h3>
            <div className="ledger-docs">
              {documents.length === 0 ? (
                <p className="ledger-drawer__empty">{t('dashboard.noDocuments', 'No documents yet.')}</p>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.name}
                    type="button"
                    className="ledger-docs__row"
                    onClick={() => openDocument(doc.name)}
                  >
                    <FileText size={15} aria-hidden="true" />
                    <span className="ledger-docs__name">{doc.name}</span>
                    <span className="ledger-docs__size">{formatFileSize(doc.metadata?.size ?? 0)}</span>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              className="ledger-btn ledger-btn--primary ledger-btn--block"
              onClick={sendForApproval}
              disabled={!canSendForApproval || sending || busy}
              title={canSendForApproval
                ? undefined
                : t('dashboard.approvalNotAllowed', 'Executed and expired contracts cannot be sent for approval.')}
            >
              {t('dashboard.sendForApproval', 'Send for approval')}
            </button>

            <h3 className="ledger-drawer__section">{t('dashboard.comments', 'Comments')}</h3>
            {comments.length === 0 ? (
              <p className="ledger-drawer__empty">{t('dashboard.noComments', 'No comments yet.')}</p>
            ) : (
              <ul className="ledger-comments">
                {comments.map((c) => (
                  <li key={c.id} className="ledger-comments__item">
                    <span className="ledger-comments__author">
                      {c.user_name || c.user_email || t('dashboard.unknownAuthor', 'Unknown')}
                    </span>
                    <span className="ledger-comments__body">{c.comment || c.content || ''}</span>
                  </li>
                ))}
              </ul>
            )}

            <textarea
              className="ledger-textarea"
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('dashboard.addComment', 'Add a comment...')}
              aria-label={t('dashboard.addComment', 'Add a comment...')}
            />
            <button
              type="button"
              className="ledger-btn ledger-btn--primary ledger-btn--block"
              onClick={postComment}
              disabled={posting || !commentText.trim()}
            >
              {t('dashboard.postComment', 'Post comment')}
            </button>
          </>
        )}

        <button
          type="button"
          className="ledger-btn ledger-btn--ghost ledger-btn--block"
          onClick={() => onOpenRecord(contract)}
        >
          {t('record.viewFull', 'View full details')} →
        </button>
      </motion.aside>
    </>
  );
};

export default DetailDrawer;
