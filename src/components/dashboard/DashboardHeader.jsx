// src/components/dashboard/DashboardHeader.jsx
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle, ChevronDown, Plus, Search } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import SunMoonIcon from '../common/SunMoonIcon';
import { formatDate } from '../../utils/formatters';
import { LANGUAGES, languageFor } from '../../i18n/languages';
import './dashboard.css';

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
  const { darkMode, toggleDarkMode } = useTheme();
  const bellRef = useRef(null);
  const langRef = useRef(null);
  const [langOpen, setLangOpen] = useState(false);
  const unread = expiring.length > 0 || pendingCount > 0;
  const currentLang = languageFor(i18n.language);

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) onBellToggle(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [bellOpen, onBellToggle]);

  // Same dismiss behaviour as the login page's picker: outside click or Escape.
  useEffect(() => {
    if (!langOpen) return undefined;
    const onDown = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setLangOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  return (
    <header className="ledger-header">
      <div className="ledger-header__brand">
        <div className="ledger-header__brand-row">
          <img src="/logoIcons/logo.png" alt="" style={{ width: 18, height: 18 }} />
          <span className="ledger-header__title">{t('navbar.title', 'Quản Lý Hợp Đồng')}</span>
        </div>
         <span className="ledger-header__kicker">
          {t('navbar.kicker', 'CONTRACT LEDGER')}
        </span>
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

        <div className="ledger-header__langtheme" ref={langRef}>
          <button
            type="button"
            className="ledger-header__lang"
            onClick={() => setLangOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            aria-label={t('navbar.languageSelector', 'Select language')}
            title={t('navbar.languageSelector', 'Select language')}
          >
            <img className="ledger-header__flag" src={currentLang.flag} alt="" />
            <span>{currentLang.label}</span>
            <ChevronDown size={13} aria-hidden="true" />
          </button>

          {langOpen && (
            <ul className="ledger-header__langmenu" role="listbox">
              {LANGUAGES.map((lang) => (
                <li key={lang.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i18n.language === lang.code}
                    className={`ledger-header__langitem${
                      i18n.language === lang.code ? ' ledger-header__langitem--on' : ''
                    }`}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      setLangOpen(false);
                    }}
                  >
                    <img className="ledger-header__flag" src={lang.flag} alt="" />
                    <span>{lang.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="ledger-header__theme"
            onClick={toggleDarkMode}
            aria-label={t('navbar.themeToggle', 'Toggle theme')}
            title={t('navbar.themeToggle', 'Toggle theme')}
          >
            <SunMoonIcon dark={darkMode} size={16} fill="currentColor" />
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
