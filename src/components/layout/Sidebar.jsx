// src/components/layout/Sidebar.jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Settings,
  UserRound,
  Workflow,
} from 'lucide-react';
import RssPulse from './RssPulse';
import { useUser } from '../../hooks/useUser';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import PasswordChangeModal from './PasswordChangeModal';
import SidebarMobile from './SidebarMobile';
import './sidebar.css';

const EXPANDED = 240;
const COLLAPSED = 64;
/** Matches the breakpoint the original mobile bar was built against. */
const MOBILE_BREAKPOINT = 1024;

/**
 * Full-height flat navigation rail. Modernist styling: square corners, no
 * floating cards, one accent for the active row.
 */
const Sidebar = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );

  const wasMobile = useRef(isMobile);

  useEffect(() => {
    const onResize = () => {
      const nowMobile = window.innerWidth < MOBILE_BREAKPOINT;
      // Coming back up to a desktop width, expand again. The mobile bar stores
      // collapsed=true for its own layout, which would otherwise leave the rail
      // collapsed the moment it takes over.
      if (wasMobile.current && !nowMobile) localStorage.setItem('collapsed', 'false');
      wasMobile.current = nowMobile;
      setIsMobile(nowMobile);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Below the breakpoint the original horizontal bar is used unchanged.
  if (isMobile) return <SidebarMobile />;
  return <SidebarRail />;
};

const SidebarRail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isDemoMode, disableDemoMode } = useUser() ?? {};
  const { t } = useTranslation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('collapsed') === 'true');
  const [personalOpen, setPersonalOpen] = useState(
    () => localStorage.getItem('profileOpen') !== 'false'
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('collapsed', collapsed);
    localStorage.setItem('profileOpen', personalOpen);
  }, [collapsed, personalOpen]);

  const handleLogout = async () => {
    if (isDemoMode) {
      await disableDemoMode?.();
      navigate('/login');
      return;
    }
    try {
      await logout?.();
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/login');
  };

  const handleStatusUpdate = async () => {
    if (statusLoading) return;
    setStatusLoading(true);
    try {
      const response = await fetch(
        'https://idkfmgdfzcsydrqnjcla.functions.supabase.co/contract-status-cron',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET}`,
          },
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast.error(`${t('sidebar.cronFailed')} ${result.error || result.message || 'Unknown error'}`);
      } else {
        const { updated_count, expired_count, expiring_count, notifications_sent } = result;
        let message = t('sidebar.statusUpdated');
        if (updated_count > 0) {
          const details = [];
          if (expired_count > 0) details.push(`${expired_count} expired`);
          if (expiring_count > 0) details.push(`${expiring_count} expiring`);
          if (notifications_sent > 0) details.push(`${notifications_sent} notifications sent`);
          message += ` (${updated_count} contracts updated: ${details.join(', ')})`;
        }
        toast.success(message);
      }
    } catch (error) {
      console.error('Error triggering cron:', error);
      toast.error(t('sidebar.cronTriggerFailed'));
    } finally {
      setStatusLoading(false);
    }
  };

  const items = [
    {
      key: 'home',
      icon: Home,
      label: t('sidebar.home', 'Home'),
      onClick: () => { window.location.href = 'https://icue.vn'; },
    },
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      label: t('sidebar.dashboard', 'Dashboard'),
      active: location.pathname === '/',
      onClick: () => navigate('/'),
    },
    {
      key: 'approvals',
      icon: Check,
      label: t('sidebar.approvals', 'Approvals'),
      active: location.pathname.startsWith('/approvals'),
      onClick: () => navigate('/approvals'),
    },
    {
      key: 'phases',
      icon: Workflow,
      label: t('sidebar.phaseManagement', 'Stage management'),
      active: location.pathname.startsWith('/phases'),
      onClick: () => navigate('/phases'),
    },
    {
      key: 'analytics',
      icon: BarChart3,
      label: t('sidebar.analytics', 'Analytics & history'),
      active: location.pathname.startsWith('/lifecycle'),
      onClick: () => navigate('/lifecycle'),
    },
    {
      key: 'status',
      // Pulses its bars while the edge function is in flight.
      icon: (props) => <RssPulse {...props} active={statusLoading} />,
      label: statusLoading
        ? t('sidebar.updatingStatus', 'Updating...')
        : t('sidebar.updateStatus', 'Status updates'),
      onClick: handleStatusUpdate,
    },
  ];

  const personalItems = [
    {
      key: 'password',
      icon: Settings,
      label: t('sidebar.changePassword', 'Change password'),
      onClick: () => setShowPasswordModal(true),
    },
    {
      key: 'guide',
      icon: BookOpen,
      label: t('sidebar.manual', 'Guide'),
      onClick: () => navigate('/manual'),
    },
    {
      key: 'feedback',
      icon: Lightbulb,
      label: t('sidebar.sendFeedback', 'Send feedback'),
      onClick: () => window.open('mailto:support@icue.vn?subject=Contract Management App Feedback', '_blank'),
    },
  ];

  const Row = ({ item, sub = false }) => {
    const Icon = item.icon;
    return (
      <button
        type="button"
        className={[
          'rail__item',
          sub ? 'rail__item--sub' : '',
          item.active ? 'rail__item--active' : '',
        ].filter(Boolean).join(' ')}
        onClick={item.onClick}
        title={collapsed ? item.label : undefined}
        aria-current={item.active ? 'page' : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        {!collapsed && <span className="rail__label">{item.label}</span>}
      </button>
    );
  };

  return (
    <>
      <nav
        className={`rail${collapsed ? ' rail--collapsed' : ''}`}
        style={{ width: collapsed ? COLLAPSED : EXPANDED }}
        aria-label={t('sidebar.navigation', 'Navigation')}
      >
        <div className="rail__top">
          <button
            type="button"
            className="rail__toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed
              ? t('sidebar.expand', 'Expand sidebar')
              : t('sidebar.collapse', 'Collapse sidebar')}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>

        <div className="rail__nav">
          {items.map((item) => <Row key={item.key} item={item} />)}

          <button
            type="button"
            className="rail__item rail__item--group"
            onClick={() => (collapsed ? setCollapsed(false) : setPersonalOpen((v) => !v))}
            title={collapsed ? t('sidebar.personal', 'Personal') : undefined}
            aria-expanded={personalOpen}
          >
            <UserRound size={18} aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="rail__label">{t('sidebar.personal', 'Personal')}</span>
                <ChevronDown
                  size={14}
                  className={`rail__chevron${personalOpen ? ' rail__chevron--open' : ''}`}
                  aria-hidden="true"
                />
              </>
            )}
          </button>

          {!collapsed && personalOpen &&
            personalItems.map((item) => <Row key={item.key} item={item} sub />)}

          <Row item={{
            key: 'logout',
            icon: LogOut,
            label: t('sidebar.signOut', 'Log out'),
            onClick: handleLogout,
          }} />
        </div>

        {!collapsed && (
          <footer className="rail__footer">
            <span className="rail__signedin">{t('sidebar.signedInAs', 'Signed in as')}</span>
            <span className="rail__email" title={user?.email}>{user?.email || '—'}</span>
            {user?.role && (
              <span className="rail__role">
                {t(`sidebar.role_label.${user.role}`, user.role)}
              </span>
            )}
          </footer>
        )}
      </nav>

      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userEmail={user?.email}
      />
    </>
  );
};

export default Sidebar;
