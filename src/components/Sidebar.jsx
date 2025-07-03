import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCcwDotIcon, Home, FileText, SearchCheckIcon } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useUser } from '../hooks/useUser';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user } = useUser();

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
    viewer: 'Read-only access to all contracts.'
  };

  return (
    <div style={{
      width: '240px',
      height: '100vh',
      backgroundColor: '#f1f5f9',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '2px 0 5px rgba(0,0,0,0.05)'
    }}>
      {/* Top Navigation Links */}
      <div>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.2rem' }}></h2>
        <button onClick={() => navigate('/')} style={linkStyle}>
          <Home size={18} /> Dashboard
        </button>

        <button onClick={() => navigate('/contracts')} style={linkStyle}>
          <SearchCheckIcon size={18} /> Search
        </button>
        
        <button 
        style={linkStyle}
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
                alert(`✅ Cron ran successfully! ${result.updatedCount ? `(${result.updatedCount} contract(s) updated)` : ''}`);
              }
            } catch (error) {
              console.error('🚨 Error triggering cron:', error);
              alert('🚨 Failed to trigger cron job. Check network or CORS settings.');
            }
          }}
        > <RefreshCcwDotIcon size={18} /> Update Contract Status   
        </button>

        {/* Add more links here if needed */}
      </div>

      {/* Bottom - User Info & Logout */}
      <div>
        {user && (
          <div style={{ fontSize: '0.85rem', marginBottom: '60%', color: '#334155' }}>
            <div style={{ marginTop: '0.75rem' }}>
              <div><strong>Role:</strong> {user.role ?? 'unknown'}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                {roleDescriptions[user.role] || 'Role not recognized.'}
              </div>
            </div>
          </div>
        )}
            </div>
      </div>
      );
    };

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'none',
  border: 'none',
  color: '#1e293b',
  fontSize: '1rem',
  cursor: 'pointer',
  marginBottom: '1rem',
  padding: 0,
};

export default Sidebar;
