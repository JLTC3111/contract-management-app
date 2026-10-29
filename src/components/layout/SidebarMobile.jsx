import { browserStorage } from '../../utils/browserStorage';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Newspaper,
  LayoutDashboardIcon,
  LogOutIcon,
  Check,
  ChevronsLeft,
  FileText,
  UserLock,
  Users,
  BookOpen,
  Settings,
  Lightbulb,
  Workflow,
  BarChart3,
  Gamepad2,
} from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useUser } from '../../hooks/useUser';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../../utils/supaBaseClient';
import { canEditContracts } from '../../utils/permissions';

// Extracted components
import { SidebarButton, SubMenu } from './SidebarNav';
import PasswordChangeModal from './PasswordChangeModal';
import RssPulse from './RssPulse';
import UserProfileSection from './UserProfileSection';
import { LAST_RECORD_KEY } from '../../pages/ContractRecord';

import '../Table.css';
import AppSwitcher from '../app-switcher/AppSwitcher.jsx';
import { withNavigationPreferences } from '../../lib/navigationPreferences.js';

/**
 * The original sidebar, kept verbatim for the mobile horizontal bar.
 * Desktop now uses the flat rail in Sidebar.jsx; this component is rendered
 * only below the mobile breakpoint, where its layout was hand-tuned.
 */
const SidebarMobile = ({ onFeedback }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isDemoMode, disableDemoMode } = useUser() ?? {};
  const { darkMode } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;
  const appearance = darkMode ? 'dark' : 'light';
  const sidebarRef = useRef();
  
  // State
  const [collapsed, setCollapsed] = useState(() => browserStorage.getItem('collapsed') === 'true');
  // Expanded by default; only a stored 'false' collapses it.
  const [profileOpen, setProfileOpen] = useState(
    () => browserStorage.getItem('profileOpen') !== 'false'
  );
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = browserStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [isResizeHandleHovered, setIsResizeHandleHovered] = useState(false);

  // Persist state to localStorage
  useEffect(() => {
    browserStorage.setItem('collapsed', collapsed);
    browserStorage.setItem('profileOpen', profileOpen);
    browserStorage.setItem('sidebarWidth', sidebarWidth);
  }, [collapsed, profileOpen, sidebarWidth]);

  // Handle logout
  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result?.error) toast(t('recovery.localLogout', 'Signed out on this device. Other devices could not be signed out while the service was unavailable.'));
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (statusUpdateLoading || !canEditContracts(user) || isDemoMode) return;
    
    setStatusUpdateLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('contract-status-cron');
      if (error) throw error;
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
    } catch (error) {
      console.error('Error triggering cron:', error);
      toast.error(t('sidebar.cronTriggerFailed'));
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Navigation handlers
  const handleReadManual = () => navigate('/manual');
  const handleSendFeedback = () => {
    setProfileOpen(false);
    onFeedback();
  };

  // Resize handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    const minWidth = 220;
    const maxWidth = 360;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // Profile toggle handler
  const handleProfileToggle = () => {
    if (collapsed) {
      setCollapsed(false);
      setProfileOpen(true);
    } else {
      setProfileOpen(!profileOpen);
    }
  };

  // Submenu items
  const profileMenuItems = [
    {
      label: isMobile ? t('sidebar_mobile.password') : t('sidebar.changePassword'),
      icon: <Settings size={16} style={{ marginRight: '.5rem' }} />,
      onClick: () => setShowPasswordModal(true),
    },
    {
      label: isMobile ? t('sidebar_mobile.manual') : t('sidebar.manual'),
      icon: <BookOpen size={14.5} style={{ marginRight: '.5rem' }} />,
      onClick: handleReadManual,
    },
    {
      label: isMobile ? t('sidebar_mobile.feedback') : t('sidebar.sendFeedback'),
      icon: <Lightbulb size={16} style={{ marginRight: '.5rem' }} />,
      onClick: handleSendFeedback,
    },
  ];

  return (
    <>
      <div
        ref={sidebarRef}
        className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-around' : 'space-between',
          width: isMobile ? '100%' : collapsed ? '72px' : `${sidebarWidth}px`,
          height: isMobile ? (collapsed ? '48px' : 'auto') : '100vh',
          backgroundColor: 'var(--sidebar-bg)',
          transition: isResizing || isMobile ? 'none' : 'width 0.3s',
          boxShadow: '2px 0 5px rgba(0,0,0,0.05)',
          color: 'var(--sidebar-text)',
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 'unset' : undefined,
          left: isMobile ? '0' : undefined,
          right: isMobile ? '0' : undefined,
          bottom: isMobile ? '0.25px' : undefined,
          zIndex: isMobile ? '20' : undefined,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          borderTop: isMobile ? '1px solid var(--card-border)' : undefined,
          borderRight: isMobile ? 'none' : undefined,
          padding: isMobile ? '0' : '1rem',
          overflow: isMobile ? 'visible' : 'auto',
        }}
      >
        {/* Collapse/Expand Button - Desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', marginBottom: '0rem', marginRight: '.5rem', width: '100%' }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                marginRight: '-15px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--sidebar-text)',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                padding: '0.5rem',
                transform: 'scale(1)',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = darkMode ? '0 2px 8px rgba(255, 255, 255, 0.75)' : '0 2px 8px rgba(127, 127, 127, 0.75)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <ChevronsLeft 
                size={22}
                style={{
                  transition: 'transform 0.65s ease',
                  transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
          </div>
        )}

        {/* Demo Mode Badge - Desktop only */}
        {isDemoMode && !isMobile && !collapsed && (
          <div
            style={{
              width: '100%',
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'linear-gradient(135deg, #f59e0b20, #f97316 20)',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Gamepad2 size={14} aria-hidden="true" />
              {t('sidebar.demoMode', 'Demo Mode')}
            </span>
            <button
              onClick={() => {
                disableDemoMode();
                navigate('/login');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f59e0b',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {t('sidebar.exitDemo', 'Exit')}
            </button>
          </div>
        )}

        {/* Navigation Content */}
        <div style={{ 
          display: 'flex', 
          fontSize: 'clamp(0.7rem, 2.25vw, 1.15rem)',
          flexDirection: isMobile ? 'row' : 'column', 
          alignItems: isMobile ? 'center' : 'flex-start', 
          flex: 1, 
          justifyContent: isMobile ? 'space-around' : 'space-between',
          width: '100%',
          overflow: isMobile ? 'visible' : 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'row' : 'column', 
            alignItems: isMobile ? 'center' : 'flex-start', 
            justifyContent: isMobile ? 'space-around' : 'center', 
            flex: 1, 
            width: '100%',
            overflow: isMobile ? 'visible' : 'auto',
            paddingTop: isMobile ? '0' : '1rem'
          }}>
            
            <AppSwitcher currentApp="contracts" locale={locale} appearance={appearance} compact={collapsed || isMobile} />

            <SidebarButton
              icon={<Newspaper size={20} />}
              label={t('sidebar.newsroom', 'Newsroom')}
              href={withNavigationPreferences('https://vi.icue.vn/newsroom/', { locale, theme: appearance })}
              collapsed={collapsed || isMobile}
              aria-label={t('sidebar.newsroom', 'Newsroom')}
              title={t('sidebar.newsroom', 'Newsroom')}
            />

            {/* Dashboard */}
            <SidebarButton
              icon={<LayoutDashboardIcon size={20} />}
              label={t('sidebar.dashboard', 'Dashboard')}
              path="/"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/')}
            />

            {/* Full record - reopens the last contract read there. */}
            <SidebarButton
              icon={<FileText size={20} />}
              label={t('record.sidebar', 'Full record')}
              path="/contracts"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => {
                const id = browserStorage.getItem(LAST_RECORD_KEY);
                if (id) navigate(`/contracts/${id}`);
                else toast(t('record.sidebarHint', 'Open a contract from the dashboard first.'));
              }}
            />

            {/* Approvals */}
            <SidebarButton
              icon={<Check size={20} />}
              label={t('sidebar.approvals', 'Approvals')}
              path="/approvals"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/approvals')}
            />

            {/* Phase Management */}
            <SidebarButton
              icon={<Workflow size={20} />}
              label={t('sidebar.phaseManagement', 'Phase Management')}
              path="/phases"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/phases')}
            />

            {/* Analytics */}
            <SidebarButton
              icon={<BarChart3 size={20} />}
              label={t('sidebar.analytics', 'Analytics & History')}
              path="/lifecycle"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/lifecycle')}
            />

            {/* Update Status */}
            <SidebarButton
              icon={<RssPulse size={20} active={statusUpdateLoading} />}
              label={statusUpdateLoading ? t('sidebar.updatingStatus') : t('sidebar.updateStatus')}
              collapsed={collapsed}
              onClick={handleStatusUpdate}
              disabled={statusUpdateLoading || !canEditContracts(user) || isDemoMode}
            />

            {/* Profile */}
            <SidebarButton 
              icon={<UserLock size={20} />}
              label={t('sidebar.profile', 'Profile')}
              collapsed={collapsed}
              toggleable
              isOpen={profileOpen}
              onClick={handleProfileToggle}
              onToggle={handleProfileToggle}
            />

            {/* Profile Submenu - Desktop */}
            <AnimatePresence initial={false} mode="wait">
              {!collapsed && profileOpen && !isMobile && (
                <Motion.div
                  key="profile-submenu"
                  initial={{ opacity: 0, maxHeight: 0 }}
                  animate={{ opacity: 1, maxHeight: '100%' }} 
                  exit={{ opacity: 0, maxHeight: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <SubMenu items={profileMenuItems} />
                </Motion.div>
              )}
            </AnimatePresence>

            {/* Sign Out */}
            <SidebarButton 
              icon={<LogOutIcon size={20} />}
              label={t('sidebar.signOut', 'Sign Out')}
              collapsed={collapsed}
              onClick={handleLogout}
            />
          </div>

          {/* User Profile Section */}
          <UserProfileSection 
            user={user} 
            collapsed={collapsed} 
            isMobile={isMobile} 
          />
        </div>
        
        {/* Resize Handle - Desktop only */}
        {!collapsed && !isMobile && (
          <div
            className="sidebar-resize-handle"
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsResizeHandleHovered(true)}
            onMouseLeave={() => !isResizing && setIsResizeHandleHovered(false)}
            style={{
              opacity: (isResizeHandleHovered || isResizing) ? 1 : 0.55
            }}
          />
        )}
      </div>

      {/* Mobile Profile Submenu */}
      {isMobile && profileOpen && (
        <Motion.div
          className="mobile-submenu-modal"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: '41.75px',
            zIndex: 9,
            background: 'var(--sidebar-submenu-bg)',
            boxShadow: darkMode
              ? '0 6px 12px rgba(155, 0, 0, 1), 0 2px 8px rgb(255, 0, 0)'  
              : '0 6px 12px rgba(0, 77, 110, 1), 0 2px 8px rgb(4, 0, 255)',
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '.25rem',
          }}
        >
          <SubMenu className="mobile-submenu-subitems" items={profileMenuItems} />
        </Motion.div>
      )}

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userEmail={user?.email}
      />
    </>
  );
};

export default SidebarMobile;
