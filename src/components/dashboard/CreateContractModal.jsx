// src/components/dashboard/CreateContractModal.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ADVANCEABLE_STAGES, getStageLabel } from '../../utils/stages';
import { CONTRACT_CATEGORIES, getCategoryLabel } from '../../utils/constants';
import DatePicker from './DatePicker';
import AttachmentPicker from './AttachmentPicker';

const CATEGORY_OPTIONS = CONTRACT_CATEGORIES.filter((c) => c !== 'All');

const CreateContractModal = ({ onCancel, onCreate, busy }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    category: CATEGORY_OPTIONS[0],
    stage: 'draft',
    author: '',
    client_name: '',
    contract_value: '',
    expiry_date: '',
  });
  const [attachments, setAttachments] = useState([]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreate({
      ...form,
      title: form.title.trim(),
      contract_value: form.contract_value === '' ? null : Number(form.contract_value),
      expiry_date: form.expiry_date || null,
    }, attachments);
  };

  return (
    <>
      <motion.div
        className="ledger-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
      />
      <motion.form
        className="ledger-modal"
        role="dialog"
        aria-label={t('dashboard.newContract', 'New contract')}
        onSubmit={submit}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <h2 className="ledger-modal__title">{t('dashboard.newContract', 'New contract')}</h2>

        <label className="ledger-field ledger-field--wide">
          <span>{t('dashboard.col.name', 'Name')}</span>
          <input value={form.title} onChange={set('title')} required autoFocus />
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.col.category', 'Category')}</span>
          <select value={form.category} onChange={set('category')}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{getCategoryLabel(t, c)}</option>
            ))}
          </select>
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.col.stage', 'Stage')}</span>
          <select value={form.stage} onChange={set('stage')}>
            {ADVANCEABLE_STAGES.map((s) => (
              <option key={s} value={s}>{getStageLabel(t, s)}</option>
            ))}
          </select>
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.col.owner', 'Owner')}</span>
          <input value={form.author} onChange={set('author')} />
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.counterparty', 'Counterparty')}</span>
          <input value={form.client_name} onChange={set('client_name')} />
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.col.value', 'Value')}</span>
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
          <AttachmentPicker files={attachments} onChange={setAttachments} />
        </div>

        <div className="ledger-modal__actions">
          <button type="button" className="ledger-btn ledger-btn--ghost" onClick={onCancel}>
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button type="submit" className="ledger-btn ledger-btn--primary" disabled={busy || !form.title.trim()}>
            {t('buttons.create', 'Create')}
          </button>
        </div>
      </motion.form>
    </>
  );
};

export default CreateContractModal;
