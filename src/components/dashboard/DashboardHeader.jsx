// src/components/dashboard/DashboardHeader.jsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle, Plus, Search } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

/**
 * Brand, contract search, notification bell, approval-requests toggle, new contract.
 */
const DashboardHeader = ({
  query,
  onQueryChange,
  expiring,
  pendingCount,
  bellOpen,
  onBellToggle,
  onNotificationClick,
  approvalsActive,
  approvalsCount,
  onApprovals,
  onNew,
}) => {
  const { t, i18n } = useTranslation();
  const bellRef = useRef(null);
  const unread = expiring.length > 0 || pendingCount > 0;

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
      <div className="ledger-header__search">
        <Search size={15} aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('dashboard.searchContracts', 'Search contracts...')}
          aria-label={t('dashboard.searchContracts', 'Search contracts...')}
        />
      </div>

      <div className="ledger-header__bell" ref={bellRef}>
        <button
          type="button"
          className="ledger-iconbtn"
          onClick={() => onBellToggle(!bellOpen)}
          aria-label={t('dashboard.notifications', 'Notifications')}
          aria-expanded={bellOpen}
        >
          <Bell size={18} />
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

      <button
        type="button"
        className={`ledger-btn ledger-btn--toggle${approvalsActive ? ' ledger-btn--toggle-on' : ''}`}
        onClick={onApprovals}
      >
        <CheckCircle size={14} />
        {t('dashboard.approvalRequests', 'Approval requests')}
        <span className="ledger-btn__badge">{approvalsCount}</span>
      </button>

      <button type="button" className="ledger-btn ledger-btn--primary" onClick={onNew}>
        <Plus size={14} /> {t('dashboard.newContract', 'New contract')}
      </button>
    </header>
  );
};

export default DashboardHeader;
