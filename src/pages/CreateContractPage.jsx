import { useUser } from '../hooks/useUser';
import { canEditContracts } from '../utils/permissions';
// src/pages/CreateContractPage.jsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { contractsApi } from '../api/contracts';
import { uploadAttachments } from '../utils/uploads';
import { ADVANCEABLE_STAGES, getStageLabel, stageUpdatePayload } from '../utils/stages';
import { CONTRACT_CATEGORIES, getCategoryLabel } from '../utils/constants';
import DatePicker from '../components/dashboard/DatePicker';
import HeaderAppSwitcher from '../components/layout/HeaderAppSwitcher';
import AttachmentPicker from '../components/dashboard/AttachmentPicker';
import Select from '../components/common/Select';
import DraftNotice from '../components/common/DraftNotice';
import { draftFiles, draftKey, useDraftRecovery } from '../hooks/useDraftRecovery';
import '../components/dashboard/dashboard.css';

const CATEGORY_OPTIONS = CONTRACT_CATEGORIES.filter((c) => c !== 'All');

/** Full page version of the create form; replaces the old dashboard modal. */
const CreateContractPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const canEdit = canEditContracts(user);

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
  const [attempt, setAttempt] = useState(null);
  const [created, setCreated] = useState(null);
  const [missingFiles, setMissingFiles] = useState([]);
  const [saveError, setSaveError] = useState('');
  const inFlight = useRef(false);
  const filesKey = draftKey(user?.id, 'new');
  const fileNames = [...missingFiles, ...attachments.map((file) => file.name)];
  const recovery = useDraftRecovery({
    accountId: user?.id, scope: 'new', value: { form, attempt, created, fileNames },
    dirty: !!attempt || Object.entries(form).some(([key, value]) => key !== 'category' && key !== 'stage' && String(value).trim()) || fileNames.length > 0,
    onRestore: (saved) => {
      if (!saved?.form || typeof saved.form.title !== 'string') return;
      setForm(saved.form); setAttempt(saved.attempt || null); setCreated(saved.created || null);
      const files = draftFiles.get(filesKey);
      setAttachments(files);
      setMissingFiles((saved.fileNames || []).filter((name) => !files.some((file) => file.name === name)));
    },
  });

  const changeAttachments = (files) => {
    setAttachments(files); draftFiles.set(filesKey, files);
    setMissingFiles((names) => names.filter((name) => !files.some((file) => file.name === name)));
  };
  const leave = () => { if (!busy && recovery.confirmLeave()) navigate('/'); };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!canEdit || !form.title.trim() || inFlight.current || recovery.pending || missingFiles.length) return;

    inFlight.current = true;
    setBusy(true);
    setSaveError('');
    try {
      const { stage, ...rest } = form;
      const operation = attempt || { requestId: crypto.randomUUID(), payload: {
        ...rest,
        title: form.title.trim(),
        contract_value: form.contract_value === '' ? null : Number(form.contract_value),
        expiry_date: form.expiry_date || null,
        ...stageUpdatePayload(stage),
      } };
      setAttempt(operation);
      recovery.checkpoint({ form, attempt: operation, created, fileNames });
      const record = created || await contractsApi.create(operation.payload, { requestId: operation.requestId });
      setCreated(record);
      recovery.checkpoint({ form, attempt: operation, created: record, fileNames });

      if (record?.id && attachments.length) {
        const { failed } = await uploadAttachments(record.id, attachments);
        changeAttachments(failed.map((entry) => entry.file));
        if (failed.length) {
          setSaveError(t('dashboard.uploadFailed', 'Some files did not upload: {{names}}', {
            names: failed.map((f) => f.name).join(', '),
          }));
          return;
        }
      }
      recovery.clear();
      navigate('/');
    } catch (err) {
      console.error('Create failed:', err);
      setSaveError(t('dashboard.createFailed', 'Could not create contract: {{msg}}', { msg: err.message }));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (!canEdit && !user?.recoveryPending) return <p className="ledger-state">{t('access_denied')}</p>;

  return (
    <div className="ledger">
      <header className="ledger-header">
        <button type="button" className="ledger-btn ledger-btn--ghost" onClick={leave} disabled={busy}>
          <ArrowLeft size={14} /> {t('buttons.back', 'Back')}
        </button>
        <h1 className="ledger-page__title">{t('dashboard.newContract', 'New contract')}</h1>
        <HeaderAppSwitcher />
      </header>

      <form className="ledger-page__form" onSubmit={submit}>
        <DraftNotice recovery={recovery} />
        {attempt && <p role="status">{t('recovery.creationPending', 'Retry continues the same save. Contract details are held until this save is complete.')}</p>}
        <fieldset disabled={busy || recovery.pending || !!attempt} style={{ display: 'contents' }}>
        <label className="ledger-field ledger-field--wide">
          <span>{t('dashboard.col.name', 'Name')}</span>
          <input value={form.title} onChange={set('title')} required autoFocus />
        </label>

        <div className="ledger-field">
          <span>{t('dashboard.col.category', 'Category')}</span>
          <Select
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            ariaLabel={t('dashboard.col.category', 'Category')}
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: getCategoryLabel(t, c) }))}
          />
        </div>

        <div className="ledger-field">
          <span>{t('dashboard.col.stage', 'Stage')}</span>
          <Select
            value={form.stage}
            onChange={(v) => setForm((f) => ({ ...f, stage: v }))}
            ariaLabel={t('dashboard.col.stage', 'Stage')}
            options={ADVANCEABLE_STAGES.map((s) => ({ value: s, label: getStageLabel(t, s) }))}
          />
        </div>

        <label className="ledger-field">
          <span>{t('dashboard.col.owner', 'Owner')}</span>
          <input value={form.author} onChange={set('author')} />
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.counterparty', 'Counterparty')}</span>
          <input value={form.client_name} onChange={set('client_name')} />
        </label>

        <label className="ledger-field">
          <span>{t('dashboard.valueUsd', 'Value (VND)')}</span>
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

        </fieldset>
        <div className="ledger-field ledger-field--wide">
          <span>{t('dashboard.documents', 'Documents')}</span>
          <AttachmentPicker files={attachments} onChange={changeAttachments} disabled={busy || recovery.pending} />
          {missingFiles.length > 0 && <div className="recovery-notice" role="alert">
            <p>{t('recovery.reselectFiles', 'Select these files again to continue: {{names}}', { names: missingFiles.join(', ') })}</p>
            <button type="button" className="btn-secondary" onClick={() => setMissingFiles([])}>{t('recovery.skipFiles', 'Continue without these files')}</button>
          </div>}
        </div>

        {saveError && <p role="alert">{saveError}</p>}
        {created && <button type="button" className="btn-secondary" disabled={busy} onClick={() => {
          if (recovery.confirmLeave()) navigate(`/contracts/${created.id}`);
        }}>{t('recovery.finishLater', 'Finish uploading later')}</button>}
        <div className="ledger-page__actions">
          <button type="button" className="ledger-btn ledger-btn--ghost" onClick={leave} disabled={busy}>
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button type="submit" className="ledger-btn ledger-btn--primary" disabled={busy || !canEdit || recovery.pending || missingFiles.length > 0 || !form.title.trim()}>
            {attempt ? t('buttons.retry', 'Retry') : t('buttons.create', 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateContractPage;
