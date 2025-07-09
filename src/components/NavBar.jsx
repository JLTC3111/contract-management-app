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
        width: '92.5%',
        marginBottom: '1rem',
        backgroundColor: 'var(--card-bg)',
        color: 'var(--text)',
        padding: 'clamp(.5rem, 2vw, 1.5rem) clamp(.25rem, 2vw, 2rem)',
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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 style={{ fontSize: 'clamp(0.5rem, 1.5vw, 1.25rem)', fontWeight: 'bold' }}>
          📁 Contract Manager
        </h2>
        <div
          style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.img
            onClick={() => window.location.href = 'https://icue.vn'}
            src="/logoIcons/logo.png"
            alt="Logo"
            style={{
              
              height: 'clamp(1rem, 1.5vw, 1.8rem)', // Responsive height
              width: 'auto',
              borderRadius: '20px',
              alignItems: 'center',
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
              Visit iCUE!
            </motion.div>
          )}
        </div>
      </div>
      {/* Center: Language Switcher (always visible) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 20,
          width: 'clamp(140px, 2.5vw, 220px)',
          maxWidth: '45%',
        }}
      >
        {/* Responsive width for mobile */}
        <style>{`
          @media (max-width: 500px) {
            .navbar-lang-switcher {
              
              width: 140px !important;
              min-width: 0 !important;
              max-width: 90% !important;
            }
          }
        `}</style>
        <div className="navbar-lang-switcher" style={{ position: 'relative', minWidth: 150 }}>
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            style={{
              fontSize: 'clamp(0.65rem, 1vw, 0.95rem)',
              borderRadius: '6px',
              border: '1.5px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              padding: '0.3rem 0.5rem',
              cursor: 'pointer',
              minWidth: 90,
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: darkMode
                ? '0 .5px 1px rgba(255, 255, 255, 0.3)'
                : '0 .5px 1px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              zIndex: 21,
            }}
          >
            <span>
              {LANGUAGES.find(l => l.code === i18n.language)?.flag} {LANGUAGES.find(l => l.code === i18n.language)?.label}
            </span>
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>▼</span>
          </button>
          <AnimatePresence>
            {showDropdown && (
              <motion.ul
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  width: '100%',
                  background: 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  zIndex: 22,
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  overflow: 'hidden',
                }}
                role="listbox"
                aria-activedescendant={i18n.language}
              >
                {LANGUAGES.map(lang => (
                  <li
                    key={lang.code}
                    role="option"
                    aria-selected={i18n.language === lang.code}
                    tabIndex={0}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      setShowDropdown(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        i18n.changeLanguage(lang.code);
                        setShowDropdown(false);
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      background: i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)',
                      color: 'var(--text)',
                      fontWeight: i18n.language === lang.code ? 600 : 400,
                      borderBottom: '1px solid var(--card-border)',
                      outline: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)'}
                  >
                    <span style={{ marginRight: 8 }}>{lang.flag}</span> {lang.label}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          {/* Click outside to close */}
          {showDropdown && (
            <div
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
              onClick={() => setShowDropdown(false)}
              tabIndex={-1}
            />
          )}
        </div>
      </div>
      {/* Right: Theme Toggle (responsive on mobile) */}
<div
  style={{
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginLeft: 'auto',
    padding: isMobile ? '0.25rem' : '0.5rem',
  }}
>
  <div
    style={{
      position: 'relative',
      width: isMobile ? '42px' : 'clamp(38px, 8vw, 54px)',
      height: isMobile ? '18px' : 'clamp(24px, 5vw, 32px)',
      background: 'var(--card-bg)', // changed from var(--sidebar-hover-bg)
      borderRadius: '16px',
      border: '1.5px solid var(--card-border)',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background 0.2s',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      zIndex: 10,
      marginRight: isMobile ? '0' : 'auto',
    }}
    onClick={toggleDarkMode}
    aria-label="Toggle theme"
  >
    <span
      style={{
        position: 'absolute',
        top: '50%',
        left: darkMode ? (isMobile ? '22px' : '25px') : '2px',
        transform: 'translateY(-50%)',
        width: isMobile ? '20px' : 'clamp(18px, 5vw, 24px)',
        height: isMobile ? '20px' : 'clamp(18px, 5vw, 24px)',
        borderRadius: '50%',
        background: 'var(--theme-toggle-bg)', // changed from var(--sidebar-hover-bg)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text)',
        fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.2rem)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
        zIndex: 2,
      }}
    >
      {darkMode ? <Moon size={isMobile ? 12 : 20} /> : <Sun size={isMobile ? 12 : 18} />}
    </span>
  </div>
</div>

    </nav>
  );
};

export default Navbar;
