import { useTranslation } from 'react-i18next';

export default function DocumentBreadcrumbs({ folder }) {
  const { t } = useTranslation();
  const segments = folder.path ? folder.path.split('/') : [];
  return (
    <nav className="ledger-document-path" aria-label={t('dashboard.documents', 'Documents')}>
      <button type="button" className="ledger-btn ledger-btn--ghost" onClick={() => folder.goTo('')}>
        {t('dashboard.documents', 'Documents')}
      </button>
      {segments.map((name, index) => (
        <span key={segments.slice(0, index + 1).join('/')}>
          <span aria-hidden="true"> / </span>
          <button type="button" className="ledger-btn ledger-btn--ghost"
            onClick={() => folder.goTo(segments.slice(0, index + 1).join('/'))}>
            {name}
          </button>
        </span>
      ))}
      {folder.loading && <p role="status">{t('common.loading')}</p>}
      {folder.error && <p role="alert">{folder.error.message}</p>}
    </nav>
  );
}
