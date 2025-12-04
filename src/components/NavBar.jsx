// src/components/Navbar.jsx
import { useUser } from '../hooks/useUser';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import { useTheme } from '../hooks/useTheme';
import { Sun, MoonStar, ChevronDownIcon, Folder, FolderOpen } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '/flags/gb.svg' },
  { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
  { code: 'es', label: 'Español', flag: '/flags/es.svg' },
  { code: 'ja', label: '日本語', flag: '/flags/jp.svg' },
  { code: 'th', label: 'ไทย', flag: '/flags/th.svg' },
  { code: 'zh', label: '中文', flag: '/flags/cn.svg' },
  { code: 'vi', label: 'Tiếng Việt', flag: '/flags/vn.svg' },
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
  
  // Refs for animations
  const navbarRef = useRef();
  const titleRef = useRef();
  const logoRef = useRef();
  const langSwitcherRef = useRef();
  const themeToggleRef = useRef();
  const [titleText, setTitleText] = useState('');
  const [logoVisible, setLogoVisible] = useState(false);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langSwitcherRef.current && !langSwitcherRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (!navbarRef.current) return;

    // Initial state - navbar off-screen to the right
    gsap.set(navbarRef.current, {
      x: 50,
      opacity: 0
    });

    // Initial state for other elements
    gsap.set([langSwitcherRef.current, themeToggleRef.current], {
      opacity: 0,
      y: 20
    });

    // Animate navbar sliding in from the right with fade
    const tl = gsap.timeline();
    tl.to(navbarRef.current, {
      x: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power2.out"
    });

    // Start typing animation for title after navbar animation
    tl.call(() => {
      const fullTitle = t('navbar.title');
      let currentIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (currentIndex <= fullTitle.length) {
          setTitleText(fullTitle.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          // Show logo after title typing is complete
          setLogoVisible(true);
        }
      }, 100);
    }, [], 0.3);

    // Animate logo appearance
    tl.to(logoRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: "back.out(1.7)"
    }, 0.8);

    // Animate language switcher and theme toggle
    tl.to([langSwitcherRef.current, themeToggleRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.1
    }, 1.0);

  }, [t]);

  // Don't show on login page
  if (location.pathname === '/login') return null;

  return (
    <nav
      ref={navbarRef}
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
        transition: 'box-shadow 0.3s ease',
        boxShadow: isHovered
          ? darkMode
            ? '0 4px 16px rgba(255, 255, 255, 0.8)'
            : '0 4px 16px rgba(0, 0, 0, 0.8)'
          : darkMode
            ? '0 2px 8px rgba(138, 138, 138, 0.8)'
            : '0 2px 8px rgba(133, 133, 133, 0.8)',
        maxHeight: 'clamp(32px, 8vw, 48px)'
      }}
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)} 
    >
      {/* Left: App Title */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 
          ref={titleRef}
          style={{ 
            fontSize: 'clamp(0.75rem, 1.25vw, 1.25rem)', 
            fontWeight: 'bold',
            minHeight: '1.5em',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            marginRight: '1rem'
          }}
        > <Folder size={isMobile ? 14 : 18} />
          {titleText}
          {titleText.length < t('navbar.title').length && (
            <span 
              style={{ 
                display: 'inline-block',
                width: '2px',
                height: '1.2em',
                backgroundColor: 'var(--text)',
                marginLeft: '2px',
                animation: 'blink 1s infinite', 
              }}
            />
          )}
        </h2>
        <div
          ref={logoRef}
          style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'scale(1)' : 'scale(0.8)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.img
            onClick={() => window.location.href = 'https://icue.vn'}
            src="/logoIcons/logo.png"
            alt="Logo"
            animate={{ rotate: -360 }}
            transition={{ 
              duration: 2.5, 
              repeat: 1, 
              ease: "linear" 
            }}
            style={{
              height: 'clamp(1rem, 2.5vw, 1.5rem)', 
              width: 'auto',
              borderRadius: '20px',
              alignItems: 'center',
              display: 'inline-block',
              objectFit: 'contain',
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
                display: isMobile ? 'none' : 'block',
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
              {t('navbar.visitIcue')}
            </motion.div>
          )}
        </div>
      </div>
      {/* Center: Language Switcher (always visible) */}
      <div
        ref={langSwitcherRef}
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
              margin-right: 0.5rem;
              width: 140px !important;
              min-width: 0 !important;
              max-width: 90% !important;
            }
          }
        `}</style>
        <div className="navbar-lang-switcher" style={{ position: 'relative', minWidth: 150 }}>
          <button className="btn-hover-preview"
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={showDropdown}
            title={t('navbar.languageSelector')}
            style={{
              fontSize: 'clamp(0.65rem, 1.75vw, 0.925rem)',
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                  <img 
                    src={LANGUAGES.find(l => l.code === i18n.language)?.flag}
                    alt={LANGUAGES.find(l => l.code === i18n.language)?.label}
                    style={{ width: '1.25em', height: '1.25em', objectFit: 'contain' }}
                  />
                  <span style={{ flexGrow: 1 }}>{LANGUAGES.find(l => l.code === i18n.language)?.label}</span>
                  <ChevronDownIcon size={16} />
                </span>
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
                      fontSize: 'clamp(0.65rem, 2.5vw, 0.925rem)',
                      padding: '0.5rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
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
                    <img 
                          src={lang.flag} 
                          alt={lang.label} 
                          style={{ width: '1.5em', height: '1.5em', objectFit: 'contain' }}
                        />
                        <span>{lang.label}</span>
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
  <div
  ref={themeToggleRef}
  style={{
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    justifyItems: 'center',
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
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'background 0.2s',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      zIndex: 10,
      marginRight: isMobile ? '0' : 'auto',
    }}
    onClick={toggleDarkMode}
    aria-label={t('navbar.themeToggle')}
  >
    <span
      style={{
        position: 'absolute',
        top: '50%',
        left: darkMode ? (isMobile ? '24px' : '25px') : '2px',
        transform: 'translateY(-50%)',
        width: isMobile ? '16px' : 'clamp(18px, 5vw, 24px)',
        height: isMobile ? '16px' : 'clamp(18px, 5vw, 24px)',
        borderRadius: '50%',
        background: 'var(--theme-toggle-bg)', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text)',
        fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.2rem)',
        boxShadow: darkMode ? '0 1px 4px rgba(255,255,255,0.8)' : '0 1px 4px rgba(0,0,0,0.8)',
        transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
        zIndex: 2,
      }}
    >
        <motion.div 
         style={{ 
           position: 'relative', 
           top: isMobile ? '0px' : darkMode ? '-2.5px' : '0.5px'
         }}
         animate={{ rotate: darkMode ? 225 : 0 }}
         transition={{ duration: 0.5, ease: "linear" }}
       >
         {darkMode ? <MoonStar size={isMobile ? 12 : 24} /> : <Sun size={isMobile ? 12 : 22} />}
       </motion.div>
    </span>
  </div>
</div>

    </nav>
  );
};

export default Navbar;
