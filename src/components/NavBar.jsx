// src/components/Navbar.jsx
import { useUser } from '../hooks/useUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];

const Navbar = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  const { t, i18n } = useTranslation();

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't show on login page
  if (location.pathname === '/login') return null;

  return (
    <nav
      style={{
        backgroundColor: 'var(--card-bg)',
        color: 'var(--text)',
        padding: 'clamp(0.5rem, 2vw, 1.5rem) clamp(1rem, 4vw, 2rem)',
        borderBottom: '1px solid var(--card-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: '0',
        zIndex: 5,
        boxShadow: darkMode
          ? '0 2px 8px rgba(255, 255, 255, 0.8)'
          : '0 2px 8px rgba(0, 0, 0, 0.8)',
        maxHeight: 'clamp(32px, 8vw, 48px)'
      }}
    >
      {/* Left: App Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 'bold' }}>
          📁 Contract Manager
        </h2>
        <div
          style={{ position: 'relative', display: 'inline-block' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.img
            onClick={() => window.location.href = 'https://icue.vn'}
            src="/logoIcons/logo.png"
            alt="Logo"
            style={{
              marginLeft: '.5rem',
              height: '1.8rem',
              width: 'auto',
              borderRadius: '20px',
              verticalAlign: 'middle',
              display: 'inline-block',
              objectFit: 'contain',
              transition: 'all 0.3s ease-in-out',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
              cursor: 'pointer',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isHovered
                ? darkMode
                  ? '0 1px 2px rgba(255, 255, 255, 1.5)'
                  : '0 1px 2px rgba(0, 0, 0, 1.5)'
                : 'none',
            }}
          />

          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x:  15}}
              animate={{ opacity: 1, x: 5}}
              exit={{ opacity: 0, x: 15}}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                left: '120%',
                top: '10%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 100,
              }}
            >
              Visit ICUE!
            </motion.div>
          )}
        </div>
      </div>
      {/* Center: Language Switcher (always visible) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <select
          value={i18n.language}
          onChange={e => i18n.changeLanguage(e.target.value)}
          style={{
            fontSize: 'clamp(0.7rem, 1.25vw, 0.95rem)',
            borderRadius: '6px',
            border: '1.5px solid var(--card-border)',
            background: 'var(--card-bg)',
            color: 'var(--text)',
            padding: '0.3rem 0.5rem',
            cursor: 'pointer',
            appearance: 'none',
            minWidth: 90,
            boxShadow: darkMode
              ? '0 .5px 1px rgba(255, 255, 255, 0.3)'
              : '0 .5px 1px rgba(0, 0, 0, 0.3)',
          }}
          aria-label="Select language"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.label}
            </option>
          ))}
        </select>
      </div>
      {/* Right: Theme Toggle (always visible) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: 'clamp(36px, 8vw, 54px)',
            height: 'clamp(24px, 5vw, 32px)',
            background: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1.5px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            zIndex: 10,
            marginRight: isMobile ? '1.5rem' : 'auto',
          }}
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
        >
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: darkMode ? '24px' : '6px',
              transform: 'translateY(-50%)',
              width: 'clamp(18px, 5vw, 24px)',
              height: 'clamp(18px, 5vw, 24px)',
              borderRadius: '50%',
              background: 'var(--sidebar-hover-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              fontSize: 'clamp(1rem, 3vw, 1.2rem)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
              zIndex: 2,
            }}
          >
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
