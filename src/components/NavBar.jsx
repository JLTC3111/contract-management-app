// src/components/Navbar.jsx
import { useUser } from '../hooks/useUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';


const Navbar = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    } else {
      navigate('/login');
    }
  };

  // Don’t show on login page
  if (location.pathname === '/login') return null;

  return (
    <nav style={{
      backgroundColor: '#f8fafc',
      padding: '1rem 2rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <h2 style={{ marginRight: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>📁 Contract Manager</h2>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>Logged in as <strong>{user.email}</strong></span>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#f87171',
              color: '#fff',
              border: 'none',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
