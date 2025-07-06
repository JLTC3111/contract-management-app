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
  FolderPlus,
  ListChecks,
  FolderIcon,
  FileText,
  FilePlus,
  Check,
  BookOpen,
  Moon,
  Sun
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
  const [createOpen, setCreateOpen] = useState(() => localStorage.getItem('createOpen') !== 'false');
  const [todoOpen, setTodoOpen] = useState(() => localStorage.getItem('todoOpen') !== 'false');

  useEffect(() => {
    localStorage.setItem('collapsed', collapsed);
    localStorage.setItem('createOpen', createOpen);
    localStorage.setItem('todoOpen', todoOpen);
  }, [collapsed, createOpen, todoOpen]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    } else {
      navigate('/login');
    }
  };

  const roleDescriptions = {
    admin: 'Full access: create, edit, approve, comment and delete contracts.',
    editor: 'Can create, edit and delete contracts but not approve.',
    approver: 'Can review and approve contracts. No editing access.',
    viewer: 'Read-only access to all contracts.',
  };

  return (
    <div
      style={{
        width: collapsed ? '64px' : '150px',
        height: '100vh',
        backgroundColor: 'var(--sidebar-bg)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'width 0.3s',
        boxShadow: '2px 0 5px rgba(0,0,0,0.05)',
        color: 'var(--sidebar-text)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', marginBottom: '1rem', width: '100%' }}>
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
              paddingTop: '20px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {collapsed ? <ChevronsRight size={22} /> : <ChevronsLeft size={22} />}
          </button>
        </div>

        <SidebarButton
          icon={<HomeIcon size={18} />}
          label="Home"
          path="/home"
          collapsed={collapsed}
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
          icon={<FolderPlus size={18} />}
          label="Create"
          collapsed={collapsed}
          toggleable
          isOpen={createOpen}
          onToggle={() => setCreateOpen(!createOpen)}
        />
        <AnimatePresence>
          {!collapsed && createOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SubMenu items={[{ label: 'Folder', icon: <FolderIcon size={14} /> }, { label: 'File', icon: <FileText size={14} /> }, { label: 'Contract', icon: <FilePlus size={14} /> }]} />
            </motion.div>
          )}
        </AnimatePresence>

        <SidebarButton
          icon={<ListChecks size={18} />}
          label="Comments"
          collapsed={collapsed}
          toggleable
          isOpen={todoOpen}
          onToggle={() => setTodoOpen(!todoOpen)}
        />
        <AnimatePresence>
          {!collapsed && todoOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SubMenu items={[{ label: 'Work', icon: <Check size={14} /> }, { label: 'Private', icon: <BookOpen size={14} /> }, { label: 'Coding', icon: <FileText size={14} /> }]} />
            </motion.div>
          )}
        </AnimatePresence>

        <SidebarButton
          icon={<UserIcon size={18} />}
          label="Profile"
          path="/profile"
          collapsed={collapsed}
          currentPath={location.pathname}
          onClick={() => navigate('/profile')}
        />
        <SidebarButton
          icon={<LogOutIcon size={18} />}
          label="Logout"
          collapsed={collapsed}
          onClick={handleLogout}
        />
        <SidebarButton
          icon={darkMode ? <Sun size={18} /> : <Moon size={18} />}
          label={darkMode ? 'Light Mode' : 'Dark Mode'}
          collapsed={collapsed}
          onClick={toggleDarkMode}
        />

        {!collapsed && user && (
          <div style={{ fontSize: '0.85rem', marginBottom: '2rem', color: 'var(--sidebar-text)', textAlign: 'center' }}>
            <div><strong>Role:</strong> {user.role ?? 'unknown'}</div>
            <div style={{ fontSize: '0.8rem', color: darkMode ? '#9ca3af' : '#64748b', marginTop: '0.25rem' }}>
              {roleDescriptions[user.role] || 'Role not recognized.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarButton = ({ icon, label, onClick, collapsed, path, currentPath, toggleable, isOpen, onToggle }) => {
  const isActive = path && currentPath.startsWith(path);
  return (
    <div
      onClick={toggleable ? onToggle : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        marginBottom: '1rem',
        width: '100%',
        padding: '0.5rem 0',
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
          gap: collapsed ? 0 : '0.5rem',
          justifyContent: collapsed ? 'center' : 'flex-start',
          width: '100%',
          paddingLeft: '0.5rem',
        }}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
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
    <ul style={{ marginLeft: '5%', marginBottom: '1rem', paddingLeft: 0 }}>
      {items.map(({ label, icon }) => (
        <li
          key={label}
          style={{
            fontSize: '0.9rem',
            color: darkMode ? '#fff' : 'var(--sidebar-text)',
            padding: '0.25rem 0.5rem',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
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
  );
};

export default Sidebar;
