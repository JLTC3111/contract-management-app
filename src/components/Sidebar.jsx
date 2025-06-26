import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, FileText } from 'lucide-react';
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
        <h2 style={{ marginBottom: '2rem', fontSize: '1.2rem' }}>📁 ContractApp</h2>

        <button onClick={() => navigate('/')} style={linkStyle}>
          <Home size={18} /> Dashboard
        </button>

        <button onClick={() => navigate('/contracts')} style={linkStyle}>
          <FileText size={18} /> Contracts
        </button>

        {/* Add more links here if needed */}
      </div>

      {/* Bottom - User Info & Logout */}
      <div>
        {user && (
          <div style={{ fontSize: '0.85rem', marginBottom: '2.5rem', color: '#334155' }}>
            Logged in as:<br />
            <strong>{user.email}</strong>
          </div>
        )}

        <button onClick={handleLogout} style={{ ...linkStyle, marginBottom: '3rem', color: '#ef4444' }}>
          <LogOut size={18} /> Logout
        </button>
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
