import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldCheckIcon,
  RefreshCcwDotIcon,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  UserIcon,
  UserLock,
  BookOpen,
  Moon,
  Sun,
  Lock,
  HelpCircle,
  MessageSquare,
  Settings
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../utils/supaBaseClient';
import { useUser } from '../hooks/useUser';
import { useTheme } from '../hooks/useTheme';
import { gsap } from 'gsap';
import './Table.css';
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { darkMode, toggleDarkMode } = useTheme();
  const { t } = useTranslation();
  const sidebarRef = useRef();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('collapsed') === 'true');
  const [profileOpen, setProfileOpen] = useState(() => {
    const isMobileInit = window.innerWidth < 1024;
    if (isMobileInit) return false;
    const stored = localStorage.getItem('profileOpen');
    return stored !== 'false';
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('collapsed', collapsed);
    localStorage.setItem('profileOpen', profileOpen);
    localStorage.setItem('sidebarWidth', sidebarWidth);
  }, [collapsed, profileOpen, sidebarWidth]);

  const handleLogout = async () => {
    console.log('Attempting to log out...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session on logout click:', session);
    console.log('User object from useUser hook:', user);

    if (!session) {
      console.error('No active session found. Cannot log out.');
      alert('Error: You are not signed in.');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    } else {
      navigate('/login');
    }
  };
  const [isHovered, setIsHovered] = useState(false);
  const [isResizeHandleHovered, setIsResizeHandleHovered] = useState(false);
  const handleChangePassword = () => {
    setShowPasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      // Re-authenticate user (Supabase requires session)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError('Current password is incorrect.');
        setPasswordLoading(false);
        return;
      }
      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message || 'Failed to update password.');
      } else {
        setPasswordSuccess('Password updated successfully!');
        setShowPasswordModal(false);
      }
    } catch (err) {
      setPasswordError('Unexpected error.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleReadManual = () => {
    navigate('/manual');
  };

  const handleSendFeedback = () => {
    // Open feedback form or email client
    window.open('mailto:support@icue.vn?subject=Contract Management App Feedback', '_blank');
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 600;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    // Keep the hover effect if the mouse is still over the handle
    // The onMouseLeave will handle clearing it if the mouse moves away
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

  // Auto-expand sidebar on mobile (mobile needs full width)
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  // GSAP Animation for sidebar entrance
  useEffect(() => {
    if (sidebarRef.current) {
      // Set initial state - sidebar off-screen to the right
      gsap.set(sidebarRef.current, {
        x: 100,
        opacity: 0
      });

      // Animate sidebar sliding in from the right with fade
      gsap.to(sidebarRef.current, {
        x: 0,
        opacity: 1,
        duration: 1.0,
        ease: "power2.out",
        delay: 0.2 // Slight delay after navbar animation
      });
    }
  }, [isMobile]); // Re-run if mobile/desktop changes

  const roleDescriptions = {
    admin: 'Full access: create, edit, approve, comment and delete contracts.',
    editor: 'Can create, edit and delete contracts but not approve.',
    approver: 'Can review and approve contracts. No editing access.',
    viewer: 'Read-only access to all contracts.',
  };

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
          height: isMobile
            ? (collapsed ? '36px' : 'auto')
            : '100vh',
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
          padding: isMobile ? '0' : '1.25rem',
          overflow: isMobile ? 'visible' : 'auto',
        }}
      >
        {/* Chevron buttons at the top - hidden on mobile */}
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
              onMouseEnter={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = darkMode ? '0 2px 8px rgba(255, 255, 255, 0.75)' : '0 2px 8px rgba(127, 127, 127, 0.75)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {collapsed ? (
                <ChevronsLeft 
                  size={22}
                  style={{
                    transition: 'transform 0.65s ease',
                    transform: 'rotate(180deg)', // points right
                  }}
                />
              ) : (
                <ChevronsLeft 
                  size={22}
                  style={{
                    transition: 'transform 1.5s ease',
                    transform: 'rotate(0deg)', // points left
                  }}
                />
              )}
            </button>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
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
            
          <div
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <SidebarButton
                icon={<HomeIcon size={18} />}
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
            <SidebarButton
              icon={<LayoutDashboardIcon size={18} />}
              label={t('sidebar.dashboard', 'Dashboard')}
              path="/"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/')}
            />
            <SidebarButton
              icon={<ShieldCheckIcon size={18} />}
              label={t('sidebar.approvals', 'Approvals')}
              path="/contracts"
              collapsed={collapsed}
              currentPath={location.pathname}
              onClick={() => navigate('/approvals')}
            />
            <SidebarButton
              icon={
                statusUpdateLoading ? (
                  <motion.div
                    animate={{ rotate: 720 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCcwDotIcon size={18} />
                  </motion.div>
                ) : (
                  <RefreshCcwDotIcon size={18} />
                )
              }
              label={statusUpdateLoading ? t('sidebar.updatingStatus') : t('sidebar.updateStatus')}
              collapsed={collapsed}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (statusUpdateLoading) return; // Prevent multiple clicks
                console.log('🔄 Update Status clicked'); // Debug log
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
                    console.error('❌ Cron failed:', result);
                    alert(`${t('sidebar.cronFailed')} ${result.error || result.message || 'Unknown error'}`);
                  } else {
                    alert(`${t('sidebar.statusUpdated')} ${result.updatedCount ? `(${result.updatedCount} ${t('sidebar.contractsUpdated')})` : ''}`);
                  }
                } catch (error) {
                  console.error('🚨 Error triggering cron:', error);
                  alert(t('sidebar.cronTriggerFailed'));
                } finally {
                  setStatusUpdateLoading(false);
                }
              }}
            />

            <SidebarButton 
              icon={<UserLock size={18} />}
              label={t('sidebar.profile', 'Profile')}
              collapsed={collapsed}
              toggleable
              isOpen={profileOpen}
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                  setProfileOpen(true);
                } else {
                  setProfileOpen(!profileOpen);
                }
              }}
              onToggle={() => {
                // If sidebar is collapsed, expand it first, then open profile
                if (collapsed) {
                  setCollapsed(false);
                  setProfileOpen(true);
                } else {
                  setProfileOpen(!profileOpen);
                }
              }}
            />

            <AnimatePresence initial={false} mode="wait">
              {!collapsed && profileOpen && !isMobile && (
                <motion.div
                  key="profile-submenu"
                  initial={{ opacity: 0, maxHeight: 0 }}
                  animate={{ opacity: 1, maxHeight: 300 }} // Pick a reasonable max
                  exit={{ opacity: 0, maxHeight: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <SubMenu className="mobile-submenu-modal"
                    items={[
                      {
                        label: t('sidebar.changePassword'),
                        icon: <Settings size={14} style={{ marginRight: '-.5rem' }} />,
                        onClick: handleChangePassword,
                        isMobile: isMobile,
                      },
                      {
                        label: t('sidebar.manual'),
                        icon: <BookOpen size={14} style={{ marginRight: '-.5rem' }} />,
                        onClick: handleReadManual,
                        isMobile: isMobile,
                      },
                      {
                        label: t('sidebar.sendFeedback'),
                        icon: <MessageSquare size={14} style={{ marginRight: '-.5rem' }} />,
                        isMobile: isMobile,
                      },
                    ]}
                  />
                  
                </motion.div>
              )}
            </AnimatePresence>

            <SidebarButton
              icon={darkMode ? <Sun size={18} /> : <Moon size={18} />}
              label={darkMode ? t('buttons.light', 'Light Mode') : t('buttons.dark', 'Dark Mode')}
              collapsed={collapsed}
              onClick={toggleDarkMode}
            />
            <SidebarButton 
              icon={<LogOutIcon size={18} />}
              label={t('sidebar.signOut', 'Sign Out')}
              collapsed={collapsed}
              onClick={handleLogout}
            />
          </div>
          {user && !isMobile && !collapsed && (
            <div
              style={{
                border: '1px solid var(--card-border)',
                padding: '0.25rem 0.5rem',
                textAlign: 'left',
                boxShadow: darkMode
                  ? '0 2px 4px rgba(255, 255, 255, 0.25)'
                  : '0 2px 4px rgba(0, 0, 0, 0.25)',
                borderRadius: '12px',
                backgroundColor: 'var(--special-card-bg)',
                transition: 'box-shadow 0.3s ease-in-out'
              }}
            >
              <span
                className="text-secondary"
                style={{
                  fontSize: 'clamp(0.7rem, 1.25vw, 0.9rem)',
                  display: 'inline-block',
                }}
              >
                <span>
                 {t('sidebar.logged_in_as')}
                </span>{' '}
                <strong>{user.email}</strong>
              </span>
            </div>
          )}

          {!collapsed && user && !isMobile && (
            <div
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 4px 12px rgba(255, 255, 255, 0.1)'
                  : '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
              style={{
                fontSize: '0.85rem',
                marginTop: '4rem',
                marginBottom: 'calc(1rem + 15px)',
                color: 'var(--sidebar-text)',
                textAlign: 'left',
                padding: '0.75rem',
                paddingLeft: '0.75rem',
                borderRadius: '8px',
                transition: 'box-shadow 0.3s ease-in-out',
                backgroundColor: 'var(--card-bg)',
              }}
            >
              <div>
                <strong>{t('sidebar.role')}:</strong>{' '}
                {t(`sidebar.role_label.${user.role}`, user.role ?? 'unknown')}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: darkMode ? '#9ca3af' : '#64748b',
                  marginTop: '0.25rem',
                }}
              >
                {t(`sidebar.role_description.${user.role}`, roleDescriptions[user.role] || 'Role not recognized.')}
              </div>
            </div>
          )}   </div>
        
        {/* Resize Handle */}
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
          <SubMenu className="mobile-submenu-subitems"
            items={[
              {
                label: t('sidebar_mobile.password'),
                icon: <Settings size={14} style={{ marginRight: '-1rem' }} />,
                onClick: handleChangePassword,
                isMobile: isMobile,
                
              },
              {
                label: t('sidebar_mobile.manual'),
                icon: <BookOpen size={14} style={{ marginRight: '-1rem' }} />,
                onClick: handleReadManual,
                isMobile: isMobile,
                
              },
              {
                label: t('sidebar_mobile.feedback'),
                icon: <MessageSquare size={14} style={{ marginRight: '-1rem' }} />,
                onClick: handleSendFeedback,
                isMobile: isMobile,
              },
            ]}
          />
        </motion.div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setShowPasswordModal(false)}
        >
          <form
            onClick={e => e.stopPropagation()}
            onSubmit={handlePasswordSubmit}
            style={{
              background: 'var(--card-bg)',
              border: '1.5px solid var(--card-border)',
              borderRadius: 12,
              padding: '2rem',
              minWidth: 320,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              zIndex: 2001,
            }}
          >
            <h2 style={{ margin: 0, color: 'var(--text)' }}>{t('headers.changePassword')}</h2>
            <input
              type="password"
              placeholder={t('sidebar.changePassword')}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--card-border)' }}
              autoFocus
            />
            <input
              type="password"
              placeholder={t('sidebar.changePassword')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--card-border)' }}
            />
            <input
              type="password"
              placeholder={t('sidebar.changePassword')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--card-border)' }}
            />
            {passwordError && <div style={{ color: '#ef4444', fontSize: '0.95rem' }}>{passwordError}</div>}
            {passwordSuccess && <div style={{ color: '#10b981', fontSize: '0.95rem' }}>{passwordSuccess}</div>}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                {t('buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: passwordLoading ? 'wait' : 'pointer' }}
              >
                {passwordLoading ? t('buttons.save') + '...' : t('buttons.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

const SidebarButton = ({ icon, label, onClick, collapsed, path, currentPath, toggleable, isOpen, onToggle, ...rest }) => {
  let isActive = false;
  if (path === '/') {
    isActive = currentPath === '/';
  } else if (path) {
    isActive = currentPath.startsWith(path);
  }
  const isMobile = window.innerWidth < 1024;
  
  return (
    <div
      onClick={onClick}
      className="sidebar-button"
      {...rest}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        cursor: 'pointer',
        marginBottom: isMobile ? '0' : '1rem',
        marginRight: isMobile ? '0.5rem' : '0',
        width: isMobile ? 'auto' : 'fit-content',
        maxWidth: isMobile ? 'auto' : 'calc(100% - 1rem)',
        padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
        borderRadius: '8px',
        backgroundColor: isActive ? 'var(--sidebar-active-bg, #c7d2fe)' : 'transparent',
        color: isActive ? 'var(--sidebar-active-text,rgb(220, 229, 254))' : undefined,
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
        transform: 'translateX(0)',
        boxShadow: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg, #e0e7ff)';
        e.currentTarget.style.transform = 'translateX(4px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.borderRadius = '10px';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = isActive ? 'var(--sidebar-active-bg, #c7d2fe)' : 'transparent';
        e.currentTarget.style.transform = 'translateX(0) scale(1)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderRadius = '8px';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed || isMobile ? 0 : '0.5rem',
          justifyContent: collapsed || isMobile ? 'center' : 'flex-start',
          width: 'fit-content',
          paddingLeft: isMobile ? '0' : '0',
          flex: 1,
          // Make sure this div doesn't block pointer events from its parent
          pointerEvents: 'none',
        }}
      >
        {icon}
        {(!collapsed && !isMobile) && <span>{label}</span>}
      </div>
      {!collapsed && toggleable && (
        <div style={{ marginRight: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={e => { e.stopPropagation(); onToggle && onToggle(); }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      )}
    </div>
  );
};

const SubMenu = ({ items }) => {
  const { darkMode } = useTheme();
  const isMobile = window.innerWidth < 1024;
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  // Reset refs before rendering
  itemRefs.current = [];
  // Use useCallback for stable ref assignment
  const setItemRef = useCallback((el, idx) => {
    if (el) itemRefs.current[idx] = el;
  }, []);
  useEffect(() => {
    if (containerRef.current) {
      import('gsap').then(({ default: gsap }) => {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        if (itemRefs.current.length) {
          gsap.fromTo(
            itemRefs.current,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out', stagger: 0.1, delay: 0.1 }
          );
        }
      });
    }
  }, [items.length]);
  return (
    <div className="submenu-container" ref={containerRef}>
      <ul style={{
        marginTop: '-.5rem',
        marginLeft: '.25rem',
        marginBottom: '1rem',
        paddingLeft: '.25rem',
        ...(
          isMobile && { display: 'flex', flexDirection: 'row', gap: '10px' }
        )
      }}>
        {items.map(({ label, icon, onClick }, index) => (
          <li
            key={`${label}-${index}`}
            ref={el => setItemRef(el, index)}
            onClick={onClick}
            style={{
              fontSize: '0.9rem',
              color: darkMode ? '#fff' : 'var(--sidebar-text)',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
              justifyContent: 'flex-start',
              width: 'fit-content',
              maxWidth: 'calc(100% - 0.5rem)',
              borderBottom: !isMobile && index !== items.length - 1 ? '1px solid var(--card-border)' : 'none',
              transform: 'translateX(0) scale(1)',
              boxShadow: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = darkMode ? '#232b3b' : '#e0e7ff';
              e.currentTarget.style.color = darkMode ? '#fff' : '#000';
              e.currentTarget.style.transform = 'translateX(4px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderRadius = '6px';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = darkMode ? '#fff' : 'var(--sidebar-text)';
              e.currentTarget.style.transform = 'translateX(0) scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderRadius = '4px';
            }}
          >
            {icon}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
