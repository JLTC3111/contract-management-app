// src/components/dashboard/EditContractModal.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { GripHorizontal, RotateCcw, Trash2, X } from 'lucide-react';
import { storageApi } from '../../api/contracts';
import { formatFileSize } from '../../utils/formatters';
import { ADVANCEABLE_STAGES, getContractStage, getStageLabel } from '../../utils/stages';
import { CONTRACT_CATEGORIES, getCategoryLabel } from '../../utils/constants';
import DatePicker from './DatePicker';
import AttachmentPicker from './AttachmentPicker';

const CATEGORY_OPTIONS = CONTRACT_CATEGORIES.filter((c) => c !== 'All');

const MIN_W = 360;
const MIN_H = 300;
/** How much of the title bar must stay on screen when dragged to an edge. */
const KEEP_VISIBLE = 90;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const initialBox = () => {
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight;
  const w = Math.min(520, vw - 32);
  const h = Math.min(560, vh - 64);
  return { x: Math.max(16, (vw - w) / 2), y: Math.max(16, (vh - h) / 2), w, h };
};

/**
 * Opens over the drawer, pre-filled. The panel can be dragged by its title bar
 * and resized from the bottom-right corner, so it can be moved aside to read the
 * drawer underneath.
 */
const EditContractModal = ({ contract, onCancel, onSave, busy }) => {
  const { t } = useTranslation();
  const [box, setBox] = useState(initialBox);
  const gesture = useRef(null);

  const currentStage = getContractStage(contract);
  const [form, setForm] = useState({
    title: contract.title || '',
    category: contract.category || CATEGORY_OPTIONS[0],
    stage: currentStage,
    author: contract.author || '',
    client_name: contract.client_name || '',
    contract_value: contract.contract_value ?? '',
    expiry_date: contract.expiry_date ? String(contract.expiry_date).slice(0, 10) : '',
  });
  const [attachments, setAttachments] = useState([]);
  // Already-uploaded files, and the ones ticked for deletion. Deletions are
  // staged like every other edit here: nothing leaves storage until Save.
  const [uploaded, setUploaded] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [removed, setRemoved] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    (async () => {
      const files = await storageApi.listFiles(`uploads/${contract.id}`).catch(() => []);
      if (!active) return;
      setUploaded((files || []).filter((f) => f.metadata?.mimetype && f.name !== '.keep'));
      setLoadingFiles(false);
    })();
    return () => { active = false; };
  }, [contract.id]);

  const toggleRemoved = (name) => setRemoved((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  // This modal owns Escape while it is open, so the drawer beneath keeps its own.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Keep the panel reachable if the window shrinks under it.
  useEffect(() => {
    const onResize = () => setBox((b) => ({
      ...b,
      w: Math.min(b.w, window.innerWidth - 32),
      h: Math.min(b.h, window.innerHeight - 32),
      x: clamp(b.x, KEEP_VISIBLE - b.w, window.innerWidth - KEEP_VISIBLE),
      y: clamp(b.y, 0, window.innerHeight - 40),
    }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startGesture = useCallback((mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    gesture.current = { mode, startX: e.clientX, startY: e.clientY, box };

    const onMove = (ev) => {
      const g = gesture.current;
      if (!g) return;
      const dx = ev.clientX - g.startX;
      const dy = ev.clientY - g.startY;

      if (g.mode === 'move') {
        setBox({
          ...g.box,
          x: clamp(g.box.x + dx, KEEP_VISIBLE - g.box.w, window.innerWidth - KEEP_VISIBLE),
          y: clamp(g.box.y + dy, 0, window.innerHeight - 40),
        });
      } else {
        setBox({
          ...g.box,
          w: clamp(g.box.w + dx, MIN_W, window.innerWidth - g.box.x - 8),
          h: clamp(g.box.h + dy, MIN_H, window.innerHeight - g.box.y - 8),
        });
      }
    };

    const onUp = () => {
      gesture.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [box]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(contract, {
      ...form,
      title: form.title.trim(),
      contract_value: form.contract_value === '' ? null : Number(form.contract_value),
      expiry_date: form.expiry_date || null,
    }, attachments, [...removed]);
  };

  // A legacy free-text category must stay selectable.
  const categories = CATEGORY_OPTIONS.includes(form.category)
    ? CATEGORY_OPTIONS
    : [form.category, ...CATEGORY_OPTIONS];

  // Expiring/expired are set by the status cron, not by hand - but if the contract
  // is already in one, it has to stay selectable or saving would silently
  // downgrade it to Draft and undo the cron.
  const stages = ADVANCEABLE_STAGES.includes(currentStage)
    ? ADVANCEABLE_STAGES
    : [...ADVANCEABLE_STAGES, currentStage];

  return (
    <>
      <motion.div
        className="ledger-scrim ledger-scrim--over-drawer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
      />
      <motion.form
        className="ledger-modal ledger-modal--floating"
        role="dialog"
        aria-label={t('dashboard.editContract', 'Edit contract')}
        onSubmit={submit}
        style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <div className="ledger-modal__bar" onPointerDown={startGesture('move')}>
          <GripHorizontal size={14} aria-hidden="true" />
          <h2 className="ledger-modal__title">{t('dashboard.editContract', 'Edit contract')}</h2>
          <button
            type="button"
            className="ledger-modal__close"
            onClick={onCancel}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={t('buttons.close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="ledger-modal__body">
          <label className="ledger-field ledger-field--wide">
            <span>{t('dashboard.col.name', 'Name')}</span>
            <input value={form.title} onChange={set('title')} required autoFocus />
          </label>

          <label className="ledger-field">
            <span>{t('dashboard.col.category', 'Category')}</span>
            <select value={form.category} onChange={set('category')}>
              {categories.map((c) => (
                <option key={c} value={c}>{getCategoryLabel(t, c)}</option>
              ))}
            </select>
          </label>

          <label className="ledger-field">
            <span>{t('dashboard.col.stage', 'Stage')}</span>
            <select value={form.stage} onChange={set('stage')}>
              {stages.map((s) => (
                <option key={s} value={s}>{getStageLabel(t, s)}</option>
              ))}
            </select>
          </label>

          <label className="ledger-field ledger-field--wide">
            <span>{t('dashboard.col.owner', 'Owner')}</span>
            <input value={form.author} onChange={set('author')} />
          </label>

          <label className="ledger-field ledger-field--wide">
            <span>{t('dashboard.counterparty', 'Counterparty')}</span>
            <input value={form.client_name} onChange={set('client_name')} />
          </label>

          <label className="ledger-field">
            <span>{t('dashboard.valueUsd', 'Value ($)')}</span>
            <input type="number" min="0" step="any" value={form.contract_value} onChange={set('contract_value')} />
          </label>

          <div className="ledger-field">
            <span>{t('dashboard.col.expires', 'Expires')}</span>
            <DatePicker
              value={form.expiry_date}
              onChange={(v) => setForm((f) => ({ ...f, expiry_date: v }))}
              ariaLabel={t('dashboard.col.expires', 'Expires')}
            />
          </div>

          <div className="ledger-field ledger-field--wide">
            <span>{t('dashboard.documents', 'Documents')}</span>

            {loadingFiles ? (
              <p className="ledger-attach__hint">{t('dashboard.loadingFiles', 'Loading files...')}</p>
            ) : uploaded.length === 0 ? (
              <p className="ledger-attach__hint">{t('dashboard.noDocuments', 'No documents yet.')}</p>
            ) : (
              <>
                <ul className="ledger-attach__list">
                  {uploaded.map((file) => {
                    const marked = removed.has(file.name);
                    return (
                      <li
                        key={file.name}
                        className={`ledger-attach__item${marked ? ' ledger-attach__item--removed' : ''}`}
                      >
                        <span className="ledger-attach__name">{file.name}</span>
                        <span className="ledger-attach__size">
                          {formatFileSize(file.metadata?.size ?? 0)}
                        </span>
                        <button
                          type="button"
                          className="ledger-attach__remove"
                          onClick={() => toggleRemoved(file.name)}
                          aria-label={marked
                            ? t('dashboard.keepFile', 'Keep {{name}}', { name: file.name })
                            : t('dashboard.deleteFile', 'Delete {{name}}', { name: file.name })}
                        >
                          {marked ? <RotateCcw size={13} /> : <Trash2 size={13} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {removed.size > 0 && (
                  <p className="ledger-attach__hint">
                    {t('dashboard.deleteOnSave', 'Marked files are deleted when you save.')}
                  </p>
                )}
              </>
            )}

            <AttachmentPicker files={attachments} onChange={setAttachments} />
          </div>
        </div>

        <div className="ledger-modal__actions">
          <button type="button" className="ledger-btn ledger-btn--ghost" onClick={onCancel}>
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button type="submit" className="ledger-btn ledger-btn--primary" disabled={busy || !form.title.trim()}>
            {t('dashboard.saveChanges', 'Save changes')}
          </button>
        </div>

        <div
          className="ledger-modal__resize"
          onPointerDown={startGesture('resize')}
          role="separator"
          aria-label={t('dashboard.resize', 'Resize')}
        />
      </motion.form>
    </>
  );
};

export default EditContractModal;
