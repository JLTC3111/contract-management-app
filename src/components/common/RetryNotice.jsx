import { useTranslation } from 'react-i18next';

export default function RetryNotice({ children, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="recovery-notice" role="alert">
      <p>{children || t('recovery.loadFailed', 'Could not load this information. Please try again.')}</p>
      <button type="button" className="btn-secondary" onClick={onRetry}>{t('buttons.retry', 'Retry')}</button>
    </div>
  );
}
