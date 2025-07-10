// src/pages/Login.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supaBaseClient';
import gsap from 'gsap';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const modelViewerRef = useRef(null);
  const cardRef = useRef(null);
  const modelRef = useRef(null);
  const logoUrl = '/logoIcons/logo.png';
  const { darkMode, toggleDarkMode } = useTheme();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 500);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Typing animation for title
  useEffect(() => {
    const text = t('login.title');
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 110);
    return () => clearInterval(interval);
  }, [t]);

  // GSAP slide-in animation
  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.2 }
    );
    gsap.fromTo(
      modelRef.current,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.45 }
    );
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/'; // or use navigate('/')
  };

  const handleModelLoad = () => {
    setIsLoading(false);
  };

  const handleModelError = () => {
    setIsLoading(false);
  };

  return (
    <div style={{
      width: '85vw',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: isMobile ? '2rem' : 'clamp(1rem, 4vw, 2rem)',
      gap: 'clamp(1rem, 4vw, 2rem)',
      position: 'relative',
    }}>
      {/* Theme Toggle Button for mobile - visually overlapping the card's top left by ~5px */}
      {isMobile && (
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
          style={{
            position: 'absolute',
            top: 'calc(50% - 210px + 5px)',
            left: 'calc(50% - 210px + 25px)',
            width: 40,
            height: 28,
            background: 'var(--card-bg)',
            borderRadius: 14,
            border: '1.5px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            zIndex: 100,
            outline: 'none',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: darkMode ? 18 : 4,
              transform: 'translateY(-50%)',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--theme-toggle-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              fontSize: '1.1rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
              zIndex: 2,
            }}
          >
            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          </span>
        
        </button>
      )}
      {/* Login Card */}
      <div
        ref={cardRef}
        style={{
          flex: 1,
          background: 'var(--card-bg)',
          border: '1.5px solid var(--card-border)',
          borderRadius: '12px',
          padding: 'clamp(0.75rem, 2vw, 1.5rem)',
          width: '100%',
          maxWidth: isMobile ? '100vw' : 'clamp(280px, 95vw, 550px)',
          boxSizing: 'border-box',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <h2 style={{
          textAlign: 'center',
          marginBottom: 'clamp(1rem, 4vw, 2rem)',
          color: 'var(--text)',
          fontSize: 'clamp(1.2rem, 5vw, 2rem)',
          fontWeight: '600',
          minHeight: '2.5rem',
          letterSpacing: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}>
          {typedText}
          {/* Blinking cursor only while typing */}
          {typedText.length < 10 && (
            <span style={{
              display: 'inline-block',
              width: '1ch',
              color: 'var(--primary)',
              animation: 'blink 1s steps(1) infinite',
              fontWeight: 700,
            }}>|</span>
          )}
          {/* Show logo after typing is done */}
          {typedText === t('login.title') && (
            <img 
              onClick={() => window.location.href = 'https://icue.vn'}
              src={logoUrl}
              alt="Logo"
              style={{
                cursor: 'pointer',
                height: '2.2rem',
                width: 'auto',
                marginLeft: '0.5rem',
                verticalAlign: 'middle',
                display: 'inline-block',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          )}
        </h2>
        
        {/* Language Switcher */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{ position: 'relative', minWidth: 120 }}>
            <button
              onClick={() => setShowLanguageDropdown((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={showLanguageDropdown}
              title={t('login.languageSelector')}
              style={{
                fontSize: 'clamp(0.675rem, 2.5vw, 0.925rem)',
                borderRadius: '8px',
                border: '1.5px solid var(--card-border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                minWidth: 100,
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--card-border)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <span>
                {LANGUAGES.find(l => l.code === i18n.language)?.flag} {LANGUAGES.find(l => l.code === i18n.language)?.label}
              </span>
              <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>▼</span>
            </button>
            <AnimatePresence>
              {showLanguageDropdown && (
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
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
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
                        setShowLanguageDropdown(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          i18n.changeLanguage(lang.code);
                          setShowLanguageDropdown(false);
                        }
                      }}
                      style={{
                        fontSize: 'clamp(0.675rem, 2.5vw, 0.925rem)',
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        background: i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)',
                        color: 'var(--text)',
                        fontWeight: i18n.language === lang.code ? 600 : 400,
                        borderBottom: '1px solid var(--card-border)',
                        outline: 'none',
                        transition: 'background 0.2s ease',
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
            {showLanguageDropdown && (
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                onClick={() => setShowLanguageDropdown(false)}
                tabIndex={-1}
              />
            )}
          </div>
        </div>
        
        <form onSubmit={handleLogin} style={{ 
          display: 'flex', 
          background: 'transparent',
          flexDirection: 'column', 
          gap: '1.5rem',
          width: '100%',
        }}>
          <div>
            <input 
              type="email" 
              placeholder={t('login.email')} 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{
                width: '100%',
                maxWidth: '92.5%',
                padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                color: 'var(--login-input-text)',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--card-border)';
                e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              }}
            />
          </div>
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder={t('login.password')} 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{
                width: '100%',
                maxWidth: '92.5%',
                padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                color: 'var(--login-input-text)',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--card-border)';
                e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              }}
            />
            <button
              type="button"
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: '2.5%',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                color: 'var(--eye-icon)',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <button 
            type="submit"
            className="fancy-btn"
            style={{
              width: '100%',
              fontSize: 'clamp(0.95rem, 2vw, 1rem)',
              fontWeight: 600,
              marginTop: '0.5rem',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => {
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {t('login.loginButton')}
          </button>
          
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}>
              {t('login.error')}
            </div>
          )}
        </form>
      </div>

      {/* 3D Model */}
      <div
       ref={modelRef}
       style={{
         position: 'absolute',
         top: 0,
         left: 0,
         right: 0,
         margin: 'auto',
         minWidth: isMobile ? 180 : 320,
         maxWidth: isMobile ? 320 : 480,
         height: isMobile ? 300 : 400,
         display: isMobile ? 'block' : 'flex',
         alignItems: 'center',
         justifyContent: 'center',
       }}
       
      >
        {/* Theme Toggle Button (desktop only, inside model area) */}
        {!isMobile && (
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            style={{
              position: 'absolute',
              top: 18,
              left: 18,
              width: 54,
              height: 32,
              background: 'var(--card-bg)',
              borderRadius: 16,
              border: '1.5px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              zIndex: 10,
              outline: 'none',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: darkMode ? 26 : 4,
                transform: 'translateY(-50%)',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--theme-toggle-bg)',
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
            {/* Active icon (centered) */}
            <span>
              {darkMode ? <Moon size={18} /> : <Sun size={18} />}
            </span>

            {/* Inactive Sun icon (left side) */}
            <span
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: !darkMode ? '#facc15' : 'var(--text-secondary)',
                opacity: !darkMode ? 0.7 : 0.3,
                fontSize: 14,
                zIndex: 1,
              }}
            >
              <Sun size={14} />
            </span>

            {/* Inactive Moon icon (right side) */}
            <span
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: darkMode ? '#60a5fa' : 'var(--text-secondary)',
                opacity: darkMode ? 0.7 : 0.3,
                fontSize: 14,
                zIndex: 1,
              }}
            >
              <Moon size={14} />
            </span>
            </span>
          </button>
        )}
        <model-viewer
          id="robot"
          ref={modelViewerRef}
          src="/3d_models/robot.glb"
          alt="Robot 3D Model"
          auto-rotate
          camera-controls
          shadow-intensity="1"
          environment-image="neutral"
          exposure="1"
          onLoad={handleModelLoad}
          onError={handleModelError}
          style={{
            display: isMobile ? 'block' : 'block',
            width: isMobile ? '90%' : '100%',
            height: isMobile ? '90%' : '100%',
            borderRadius: '12px',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
};

export default Login;
