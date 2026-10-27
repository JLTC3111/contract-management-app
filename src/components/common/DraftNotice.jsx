import { useTranslation } from 'react-i18next';

export default function DraftNotice({ recovery }) {
  const { t } = useTranslation();
  if (!recovery.pending && !recovery.storageFailed) return null;
  return (
    <div className="recovery-notice" role="status">
      <p>{recovery.pending
        ? t('recovery.draftFound', 'An unfinished draft is available on this device.')
        : t('recovery.storageFailed', 'This browser could not save a recovery copy. Keep this page open until your work is saved.')}</p>
      {recovery.pending && <>
        <button type="button" className="btn-secondary" onClick={recovery.restore}>{t('recovery.restore', 'Restore draft')}</button>
        <button type="button" className="btn-secondary" onClick={recovery.discard}>{t('recovery.discard', 'Discard draft')}</button>
      </>}
    </div>
  );
}
