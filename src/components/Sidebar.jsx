import React, { useState, useEffect } from 'react';
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
  Check,
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
import './ContractTable.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { darkMode, toggleDarkMode } = useTheme();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('collapsed') === 'true');
  const [profileOpen, setProfileOpen] = useState(() => localStorage.getItem('profileOpen') !== 'false');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 380;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    localStorage.setItem('collapsed', collapsed);
    localStorage.setItem('profileOpen', profileOpen);
    localStorage.setItem('sidebarWidth', sidebarWidth);
  }, [collapsed, profileOpen, sidebarWidth]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    } else {
      navigate('/login');
    }
  };

  const handleChangePassword = () => {
    // For now, we'll show an alert. In a real app, this would open a modal or navigate to a password change page
    alert('Change Password feature - This would typically open a password change modal or navigate to a settings page.');
  };

  const handleReadManual = () => {
    // Open the manual in a new tab or show a modal
    window.open('https://docs.example.com/manual', '_blank');
  };

  const handleSendFeedback = () => {
    // Open feedback form or email client
    window.open('mailto:feedback@example.com?subject=Contract Management App Feedback', '_blank');
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

  const roleDescriptions = {
    admin: 'Full access: create, edit, approve, comment and delete contracts.',
    editor: 'Can create, edit and delete contracts but not approve.',
    approver: 'Can review and approve contracts. No editing access.',
    viewer: 'Read-only access to all contracts.',
  };

  return (
    <div
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
          bottom: isMobile ? '0.5px' : undefined,
          zIndex: isMobile ? '11' : undefined,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          borderTop: isMobile ? '1px solid var(--card-border)' : undefined,
          borderRight: isMobile ? 'none' : undefined,
          padding: isMobile ? '0' : undefined,
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
              borderRadius: '6px',
              transition: 'background 0.2s',
              padding: '0.5rem',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {collapsed ? <ChevronsRight size={22} /> : <ChevronsLeft size={22} />}
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
          <SidebarButton
            icon={<HomeIcon size={18} />}
            label="Home"
            path="/home"
            collapsed={collapsed || isMobile}
            currentPath={location.pathname}
            onClick={() => window.location.href = 'https://icue.vn'}
          />
          <SidebarButton
            icon={<LayoutDashboardIcon size={18} />}
            label="Dashboard"
            path="/"
            collapsed={collapsed}
            currentPath={location.pathname}
            onClick={() => navigate('/')}
          />
          <SidebarButton
            icon={<ShieldCheckIcon size={18} />}
            label="Approve"
            path="/contracts"
            collapsed={collapsed}
            currentPath={location.pathname}
            onClick={() => navigate('/approvals')}
          />
          <SidebarButton
            icon={<RefreshCcwDotIcon size={18} />}
            label="Update Status"
            collapsed={collapsed}
            onClick={async () => {
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
                  alert(`❌ Cron failed: ${result.error || result.message || 'Unknown error'}`);
                } else {
                  alert(`✅ Status Updated! ${result.updatedCount ? `(${result.updatedCount} contract(s) updated)` : ''}`);
                }
              } catch (error) {
                console.error('🚨 Error triggering cron:', error);
                alert('🚨 Failed to trigger cron job. Check network or CORS settings.');
              }
            }}
          />

          <SidebarButton 
            icon={<UserIcon size={18} />}
            label="Profile"
            collapsed={collapsed}
            toggleable
            isOpen={profileOpen}
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
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <SubMenu
                  items={[
                    {
                      label: 'Change Password',
                      icon: <Settings size={14} style={{ marginRight: '-.5rem' }} />,
                      onClick: handleChangePassword,
                      style: { marginBottom: '1rem' },
                      isMobile: isMobile,
                    },
                    {
                      label: 'Read Manual',
                      icon: <BookOpen size={14} style={{ marginRight: '-.5rem' }} />,
                      onClick: handleReadManual,
                      style: { marginBottom: '1rem' },
                      isMobile: isMobile,
                    },
                    {
                      label: 'Send Feedback',
                      icon: <MessageSquare size={14} style={{ marginRight: '-.5rem' }} />,
                      onClick: handleSendFeedback,
                      isMobile: isMobile,
                    },
                  ]}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <SidebarButton
            icon={darkMode ? <Sun size={18} /> : <Moon size={18} />}
            label={darkMode ? 'Light Mode' : 'Dark Mode'}
            collapsed={collapsed}
            onClick={toggleDarkMode}
          />
          <SidebarButton
            icon={<LogOutIcon size={18} />}
            label="Sign Out"
            collapsed={collapsed}
            onClick={handleLogout}
          />
        </div>

        {!collapsed && user && (
          <div style={{ fontSize: '0.85rem', marginTop: '4rem', marginBottom: 'calc(1rem + 15px)', color: 'var(--sidebar-text)', textAlign: 'left', paddingLeft: '0.5rem' }}>
            <div><strong>Role:</strong> {user.role ?? 'unknown'}</div>
            <div style={{ fontSize: '0.8rem', color: darkMode ? '#9ca3af' : '#64748b', marginTop: '0.25rem' }}>
              {roleDescriptions[user.role] || 'Role not recognized.'}
            </div>
          </div>
        )}
      </div>
      
      
      {/* Resize Handle */}
      {!collapsed && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '4px',
            height: '100%',
            cursor: 'col-resize',
            backgroundColor: 'transparent',
            zIndex: 10,
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg, #e0e7ff)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        />
      )}

      {isMobile && profileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            overflow: 'hidden',
          }}
        >
          <SubMenu
            items={[
              {
                label: 'Change Password',
                icon: <Settings size={14} style={{ marginRight: '-.5rem' }} />,
                onClick: handleChangePassword,
                style: { marginBottom: '1rem' },
                isMobile: isMobile,
              },
              {
                label: 'Read Manual',
                icon: <BookOpen size={14} style={{ marginRight: '-.5rem' }} />,
                onClick: handleReadManual,
                style: { marginBottom: '1rem' },
                isMobile: isMobile,
              },
              {
                label: 'Send Feedback',
                icon: <MessageSquare size={14} style={{ marginRight: '-.5rem' }} />,
                onClick: handleSendFeedback,
                isMobile: isMobile,
              },
            ]}
          />
        </motion.div>
      )}
    </div>
  );
};

const SidebarButton = ({ icon, label, onClick, collapsed, path, currentPath, toggleable, isOpen, onToggle }) => {
  const isActive = path && currentPath.startsWith(path);
  const isMobile = window.innerWidth < 1024;
  
  return (
    <div
      className="sidebar-button"
      onClick={toggleable ? onToggle : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        cursor: 'pointer',
        marginBottom: isMobile ? '0' : '1rem',
        marginRight: isMobile ? '0.5rem' : '0',
        width: isMobile ? 'auto' : '100%',
        padding: isMobile ? '0.5rem' : '0.5rem 0',
        borderRadius: '6px',
        backgroundColor: isActive ? 'var(--sidebar-active-bg, #c7d2fe)' : 'transparent',
        color: isActive ? 'var(--sidebar-active-text,rgb(220, 229, 254))' : undefined,
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'background 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover-bg, #e0e7ff)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = isActive ? 'var(--sidebar-active-bg, #c7d2fe)' : 'transparent'}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed || isMobile ? 0 : '0.5rem',
          justifyContent: collapsed || isMobile ? 'center' : 'flex-start',
          width: '100%',
          paddingLeft: isMobile ? '0' : '0.5rem',
        }}
      >
        {icon}
        {(!collapsed && !isMobile) && <span>{label}</span>}
      </div>
      {!collapsed && toggleable && (
        <div style={{ marginRight: '0.25rem' }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      )}
    </div>
  );
};

const SubMenu = ({ items }) => {
  const { darkMode } = useTheme();
  return (
    <div className="submenu-container">
      <ul style={{ marginTop: '-.5rem', marginLeft: '.25rem', marginBottom: '1rem', paddingLeft: '.25rem' }}>
        {items.map(({ label, icon, onClick }) => (
          <li
            key={label}
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
              transition: 'background 0.2s ease',
              justifyContent: 'flex-start',
              width: '100%',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = darkMode ? '#232b3b' : '#e0e7ff';
              e.currentTarget.style.color = darkMode ? '#fff' : '#000';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = darkMode ? '#fff' : 'var(--sidebar-text)';
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
