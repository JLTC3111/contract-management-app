import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SearchCheckIcon,
  RefreshCcwDotIcon,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  UserIcon,
  FolderPlus,
  ListChecks,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../utils/supaBaseClient';
import { useUser } from '../hooks/useUser';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

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
    admin: 'Full access: create, edit, approve, and delete contracts.',
    editor: 'Can create and edit contracts but not approve or delete.',
    approver: 'Can review and approve contracts. No editing access.',
    viewer: 'Read-only access to all contracts.',
  };

  return (
    <div
      style={{
        width: collapsed ? '64px' : '200px',
        height: '100vh',
        backgroundColor: '#f1f5f9',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.3s',
        boxShadow: '2px 0 5px rgba(0,0,0,0.05)',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', marginBottom: '0' }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
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
          icon={<SearchCheckIcon size={18} />}
          label="Approve"
          path="/contracts"
          collapsed={collapsed}
          currentPath={location.pathname}
          onClick={() => navigate('/contracts')}
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
              <SubMenu items={['Folder', 'File', 'Contract']} />
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
              <SubMenu items={['Work', 'Private', 'Coding']} />
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
        {!collapsed && user && (
          <div style={{ fontSize: '0.85rem', marginBottom: '2rem', color: '#334155' }}>
            <div><strong>Role:</strong> {user.role ?? 'unknown'}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
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
        backgroundColor: isActive ? '#c7d2fe' : 'transparent',
        color: isActive ? '#1e3a8a' : '#1e293b',
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'background 0.2s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isActive ? '#c7d2fe' : 'transparent'}
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

const SubMenu = ({ items }) => (
  <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
    {items.map((item) => (
      <li
        key={item}
        style={{
          fontSize: '0.9rem',
          color: '#475569',
          padding: '0.25rem 0.5rem',
          cursor: 'pointer',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {item}
      </li>
    ))}
  </ul>
);

export default Sidebar;