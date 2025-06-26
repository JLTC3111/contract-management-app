import React from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useUser } from '../hooks/useUser'; // Make sure this is working

const Home = () => {
  const navigate = useNavigate();
  const { user } = useUser(); // ✅ get current user

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{
      padding: '2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h1>🏠 Dashboard</h1>
        {user && (
          <p style={{ color: '#555', fontSize: '0.9rem' }}>
            Logged in as <strong>{user.email}</strong>
          </p>
        )}
      </div>

      <button
        onClick={handleLogout}
        style={{
          backgroundColor: '#f87171',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
};

export default Home;
