// src/pages/CreateContractPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { contractsApi } from '../api/contracts';
import { uploadAttachments } from '../utils/uploads';
import { ADVANCEABLE_STAGES, getStageLabel, stageUpdatePayload } from '../utils/stages';
import { CONTRACT_CATEGORIES, getCategoryLabel } from '../utils/constants';
import DatePicker from '../components/dashboard/DatePicker';
import AttachmentPicker from '../components/dashboard/AttachmentPicker';
import '../components/dashboard/dashboard.css';

const CATEGORY_OPTIONS = CONTRACT_CATEGORIES.filter((c) => c !== 'All');

/** Full page version of the create form; replaces the old dashboard modal. */
const CreateContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || busy) return;

    setBusy(true);
    try {
      const { stage, ...rest } = form;
      const created = await contractsApi.create({
        ...rest,
        title: form.title.trim(),
        contract_value: form.contract_value === '' ? null : Number(form.contract_value),
        expiry_date: form.expiry_date || null,
        ...stageUpdatePayload(stage),
      });

      if (created?.id && attachments.length) {
        const { failed } = await uploadAttachments(created.id, attachments);
        if (failed.length) {
          window.alert(t('dashboard.uploadFailed', 'Some files did not upload: {{names}}', {
            names: failed.map((f) => f.name).join(', '),
          }));
        }
      }
      navigate('/');
    } catch (err) {
      console.error('Create failed:', err);
      window.alert(t('dashboard.createFailed', 'Could not create contract: {{msg}}', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ledger">
      <header className="ledger-header">
        <button type="button" className="ledger-btn ledger-btn--ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> {t('buttons.back', 'Back')}
        </button>
        <h1 className="ledger-page__title">{t('dashboard.newContract', 'New contract')}</h1>
      </header>

      <form className="ledger-page__form" onSubmit={submit}>
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
          <AttachmentPicker files={attachments} onChange={setAttachments} />
        </div>

        <div className="ledger-page__actions">
          <button type="button" className="ledger-btn ledger-btn--ghost" onClick={() => navigate('/')}>
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button type="submit" className="ledger-btn ledger-btn--primary" disabled={busy || !form.title.trim()}>
            {t('buttons.create', 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateContractPage;
