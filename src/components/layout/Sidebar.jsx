import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldCheckIcon,
  RefreshCcwDotIcon,
  ChevronsLeft,
  UserLock,
  BookOpen,
  Moon,
  Sun,
  Settings,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '../../hooks/useUser';
import { useTheme } from '../../hooks/useTheme';
import { gsap } from 'gsap';
import { useTranslation } from 'react-i18next';

// Extracted components
import { SidebarButton, SubMenu } from './SidebarNav';
import PasswordChangeModal from './PasswordChangeModal';
import UserProfileSection from './UserProfileSection';

import '../Table.css';

/**
 * Sidebar Component
 * Main navigation sidebar - refactored to use extracted sub-components
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useTranslation();
  const sidebarRef = useRef();
  
  // State
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('collapsed') === 'true');
  const [profileOpen, setProfileOpen] = useState(() => {
    const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobileInit) return false;
    const stored = localStorage.getItem('profileOpen');
    return stored !== 'false';
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizeHandleHovered, setIsResizeHandleHovered] = useState(false);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('collapsed', collapsed);
    localStorage.setItem('profileOpen', profileOpen);
    localStorage.setItem('sidebarWidth', sidebarWidth);
  }, [collapsed, profileOpen, sidebarWidth]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
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
    if (statusUpdateLoading) return;
    
    setStatusUpdateLoading(true);
    try {
      const response = await fetch('https://idkfmgdfzcsydrqnjcla.functions.supabase.co/contract-status-cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_CRON_SECRET}`,
        },
      });
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Cron failed:', result);
        alert(`${t('sidebar.cronFailed')} ${result.error || result.message || 'Unknown error'}`);
      } else {
        const { updated_count, expired_count, expiring_count, notifications_sent } = result;
        let message = t('sidebar.statusUpdated');
        
        if (updated_count > 0) {
          const details = [];
          if (expired_count > 0) details.push(`${expired_count} expired`);
          if (expiring_count > 0) details.push(`${expiring_count} expiring`);
          if (notifications_sent > 0) details.push(`${notifications_sent} notifications sent`);
          message += ` (${updated_count} contracts updated: ${details.join(', ')})`;
        } else {
          message += ' (No contracts needed updates)';
        }
        alert(message);
      }
    } catch (error) {
      console.error('Error triggering cron:', error);
      alert(t('sidebar.cronTriggerFailed'));
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Navigation handlers
  const handleReadManual = () => navigate('/manual');
  const handleSendFeedback = () => {
    window.open('mailto:support@icue.vn?subject=Contract Management App Feedback', '_blank');
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
    const maxWidth = 280;
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

  // GSAP entrance animation
  useEffect(() => {
    if (sidebarRef.current) {
      gsap.set(sidebarRef.current, { x: 100, opacity: 0 });
      gsap.to(sidebarRef.current, {
        x: 0,
        opacity: 1,
        duration: 1.0,
        ease: 'power2.out',
        delay: 0.2
      });
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
      icon: <Settings size={14} style={{ marginRight: isMobile ? '-1rem' : '-.5rem' }} />,
      onClick: () => setShowPasswordModal(true),
    },
    {
      label: isMobile ? t('sidebar_mobile.manual') : t('sidebar.manual'),
      icon: <BookOpen size={14} style={{ marginRight: isMobile ? '-1rem' : '-.5rem' }} />,
      onClick: handleReadManual,
    },
    {
      label: isMobile ? t('sidebar_mobile.feedback') : t('sidebar.sendFeedback'),
      icon: <MessageSquare size={14} style={{ marginRight: isMobile ? '-1rem' : '-.5rem' }} />,
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
          width: isMobile ? '100%' : collapsed ? '36px' : `${sidebarWidth}px`,
          height: isMobile ? (collapsed ? '36px' : 'auto') : '100vh',
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

        {/* Navigation Content */}
        <div style={{ 
          display: 'flex', 
          fontSize: 'clamp(0.7rem, 2.5vw, 1.25rem)',
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
            
            {/* Home Button with Tooltip */}
            <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <SidebarButton
                icon={<HomeIcon size={20} />}
                label={t('sidebar.home', 'Home')}
                path="/home"
                collapsed={collapsed || isMobile}
                currentPath={location.pathname}
                onClick={() => window.location.href = 'https://icue.vn'}
              />
              <AnimatePresence>
                {isHovered && !isMobile && !collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 5 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      left: '105%',
                      top: '15%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.85)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      pointerEvents: 'auto',
                      whiteSpace: 'nowrap',
                      zIndex: 100,
                    }}
                  >
                    {t('sidebar.visitIcueTooltip')}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dashboard */}
            <SidebarButton
              icon={<LayoutDashboardIcon size={20} />}
              label={t('sidebar.dashboard', 'Dashboard')}
              path="/"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/')}
            />

            {/* Approvals */}
            <SidebarButton
              icon={<ShieldCheckIcon size={20} />}
              label={t('sidebar.approvals', 'Approvals')}
              path="/approvals"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/approvals')}
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
              icon={
                statusUpdateLoading ? (
                  <motion.div
                    animate={{ rotate: 720 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCcwDotIcon size={20} />
                  </motion.div>
                ) : (
                  <RefreshCcwDotIcon size={20} />
                )
              }
              label={statusUpdateLoading ? t('sidebar.updatingStatus') : t('sidebar.updateStatus')}
              collapsed={collapsed}
              onClick={handleStatusUpdate}
              disabled={statusUpdateLoading}
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
                <motion.div
                  key="profile-submenu"
                  initial={{ opacity: 0, maxHeight: 0 }}
                  animate={{ opacity: 1, maxHeight: '100%' }} 
                  exit={{ opacity: 0, maxHeight: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <SubMenu items={profileMenuItems} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Theme Toggle */}
            <SidebarButton
              icon={darkMode ? <Sun size={20} /> : <Moon size={20} />}
              label={darkMode ? t('buttons.light', 'Light Mode') : t('buttons.dark', 'Dark Mode')}
              collapsed={collapsed}
              onClick={toggleDarkMode}
            />

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
              background: (isResizeHandleHovered || isResizing) ? 'var(--sidebar-hover-bg, #e0e7ff)' : 'transparent'
            }}
          />
        )}
      </div>

      {/* Mobile Profile Submenu */}
      {isMobile && profileOpen && (
        <motion.div
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
        </motion.div>
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

export default Sidebar;
