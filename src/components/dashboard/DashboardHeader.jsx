// src/components/dashboard/DashboardHeader.jsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle, Globe, Plus, Search, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/formatters';

// 8-spoke asterisk mark - the app's mark appears once, here, on the dashboard.
const AsteriskMark = () => (
  <svg
    className="ledger-header__mark"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M9 2v14M2 9h14M4.05 4.05l9.9 9.9M13.95 4.05l-9.9 9.9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
    />
  </svg>
);

/**
 * Brand, contract search, notification bell, language + theme, approval-requests
 * toggle, new contract - all in one bar. Sub-pages keep their own back + title
 * .nav pattern, so this is the only place the brand mark appears.
 */
const DashboardHeader = ({
  query,
  onQueryChange,
  expiring,
  pendingCount,
  bellOpen,
  onBellToggle,
  onNotificationClick,
  approvalsCount,
  onApprovals,
  onNew,
}) => {
  const { t, i18n } = useTranslation();
  const { toggleDarkMode } = useTheme();
  const bellRef = useRef(null);
  const unread = expiring.length > 0 || pendingCount > 0;
  const isVietnamese = i18n.language === 'vi';

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) onBellToggle(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [bellOpen, onBellToggle]);

  return (
    <header className="ledger-header">
      <div className="ledger-header__brand">
        <div className="ledger-header__brand-row">
          <AsteriskMark />
          <span className="ledger-header__title">{t('navbar.title', 'Quản Lý Hợp Đồng')}</span>
        </div>
        <span className="ledger-header__kicker">CONTRACT LEDGER</span>
      </div>

      <div className="ledger-header__controls">
        <div className="ledger-header__search">
          <Search size={15} className="ledger-header__search-icon" aria-hidden="true" />
          <input
            type="text"
            className="input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('dashboard.searchContracts', 'Search contracts, parties, owners…')}
            aria-label={t('dashboard.searchContracts', 'Search contracts, parties, owners…')}
          />
        </div>

        <div className="ledger-header__spacer" />

        <div className="ledger-header__bell" ref={bellRef}>
          <button
            type="button"
            className="ledger-iconbtn"
            onClick={() => onBellToggle(!bellOpen)}
            aria-label={t('dashboard.notifications', 'Notifications')}
            aria-expanded={bellOpen}
          >
            <Bell size={16} />
            {unread && <span className="ledger-iconbtn__dot" />}
          </button>

          {bellOpen && (
            <motion.div
              className="ledger-notifications"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              <span className="ledger-notifications__title">
                {t('dashboard.notifications', 'Notifications')}
              </span>
              {expiring.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="ledger-notifications__item"
                  onClick={() => onNotificationClick({ type: 'contract', contract: c })}
                >
                  {t('dashboard.expiringItem', '{{name}} expiring', { name: c.title })}
                  <span className="ledger-notifications__meta">
                    {c.expiry_date ? formatDate(c.expiry_date, {}, i18n.language) : ''}
                  </span>
                </button>
              ))}
              {pendingCount > 0 && (
                <button
                  type="button"
                  className="ledger-notifications__item"
                  onClick={() => onNotificationClick({ type: 'approvals' })}
                >
                  {t('dashboard.pendingApproval', '{{count}} pending approval', { count: pendingCount })}
                </button>
              )}
              {!unread && (
                <span className="ledger-notifications__empty">
                  {t('dashboard.allClear', 'Nothing needs attention.')}
                </span>
              )}
            </motion.div>
          )}
        </div>

        <div className="ledger-header__langtheme">
          <button
            type="button"
            className="ledger-header__lang"
            onClick={() => i18n.changeLanguage(isVietnamese ? 'en' : 'vi')}
            aria-label={t('navbar.languageSelector', 'Select language')}
            title={t('navbar.languageSelector', 'Select language')}
          >
            <Globe size={15} aria-hidden="true" />
            <span>{isVietnamese ? 'Tiếng Việt' : 'English'}</span>
          </button>
          <button
            type="button"
            className="ledger-header__theme"
            onClick={toggleDarkMode}
            aria-label={t('navbar.themeToggle', 'Toggle theme')}
            title={t('navbar.themeToggle', 'Toggle theme')}
          >
            <Sun size={16} />
          </button>
        </div>

        {/* Opens the approvals board - it never reads as "on", so no toggle state. */}
        <button type="button" className="ledger-btn ledger-btn--toggle" onClick={onApprovals}>
          <CheckCircle size={14} />
          {t('dashboard.approvalRequests', 'Approval requests')}
          <span className="ledger-btn__badge">{approvalsCount}</span>
        </button>

        <button type="button" className="ledger-btn ledger-btn--primary" onClick={onNew}>
          <Plus size={14} /> {t('dashboard.newContract', 'New contract')}
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
