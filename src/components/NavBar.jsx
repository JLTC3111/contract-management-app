// src/components/Navbar.jsx
import { useUser } from '../hooks/useUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';


const Navbar = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
    } else {
      navigate('/login');
    }
  };

  // Helper: recursively list all files/folders under a base path
  async function listAllFilesRecursive(basePath) {
    let results = [];
    const { data: items, error } = await supabase.storage.from('contracts').list(basePath, { limit: 100 });
    if (error || !items) return results;
    for (const item of items) {
      if (item.name === '.keep') continue;
      const isFolder = !item.metadata?.mimetype;
      const fullPath = basePath + '/' + item.name;
      results.push({ ...item, isFolder, basePath, fullPath });
      if (isFolder) {
        // Recursively list subfolders
        const subResults = await listAllFilesRecursive(fullPath);
        results = results.concat(subResults);
      }
    }
    return results;
  }

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    let active = true;
    (async () => {
      // Get all contracts
      const { data: contracts, error } = await supabase.from('contracts').select('id, title');
      if (error || !contracts) return;
      let results = [];
      for (const contract of contracts) {
        const basePath = `uploads/${contract.id}`;
        const allItems = await listAllFilesRecursive(basePath);
        for (const item of allItems) {
          if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({
              contractId: contract.id,
              contractTitle: contract.title,
              name: item.name,
              isFolder: item.isFolder,
              path: item.basePath,
              fullPath: item.fullPath,
            });
          }
        }
      }
      if (active) setSearchResults(results);
    })();
    return () => { active = false; };
  }, [searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Don't show on login page
  if (location.pathname === '/login') return null;

  return (
    <nav style={{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--text)',
      padding: '1rem 2rem',
      borderBottom: '1px solid var(--card-border)',
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
          <span className="text-secondary" style={{ fontSize: '0.9rem'}}>Logged in as <strong>{user.email}</strong></span>
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
          <div
        style={{
          position: 'sticky',
          top: '15%',
          left: '3.5%',
          width: '54px',
          height: '32px',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1.5px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          zIndex: 100,
          marginLeft: 'auto',
        }}
        onClick={toggleDarkMode}
        aria-label="Toggle theme"
      >
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: darkMode ? '26px' : '4px',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--sidebar-hover-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            fontSize: '1.2rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
            zIndex: 2,
          }}
        >
          {darkMode ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            {/* Show both icons, inactive one faint */}
            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: !darkMode ? '#facc15' : 'var(--text-secondary)', opacity: !darkMode ? 0.7 : 0.3, fontSize: 14, zIndex: 1 }}>
              <Sun size={14} />
            </span>
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: darkMode ? '#60a5fa' : 'var(--text-secondary)', opacity: darkMode ? 0.7 : 0.3, fontSize: 14, zIndex: 1 }}>
              <Moon size={14} />
            </span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
