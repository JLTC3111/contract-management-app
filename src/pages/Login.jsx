// src/pages/Login.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supaBaseClient';
import gsap from 'gsap';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typedText, setTypedText] = useState('');
  const modelViewerRef = useRef(null);
  const cardRef = useRef(null);
  const modelRef = useRef(null);
  const logoUrl = '/logoIcons/logo.png';
  const { darkMode, toggleDarkMode } = useTheme();

  // Typing animation for ''
  useEffect(() => {
    const text = 'Contract Manager';
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
  }, []);

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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 'clamp(1rem, 4vw, 2rem)',
      gap: 'clamp(1rem, 4vw, 2rem)',
    }}>
      {/* Login Card */}
      <div
        ref={cardRef}
        style={{
          background: 'var(--card-bg)',
          border: '1.5px solid var(--card-border)',
          borderRadius: '12px',
          padding: 'clamp(1rem, 4vw, 2.5rem)',
          width: '100%',
          maxWidth: 'clamp(280px, 90vw, 400px)',
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
          {typedText === 'Contract Manager' && (
            <img
              src={logoUrl}
              alt="Logo"
              style={{
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
        
        <form onSubmit={handleLogin} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          width: '100%',
        }}>
          <div>
            <input 
              type="email" 
              placeholder="Email" 
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
                background: 'var(--card-bg)',
                color: 'var(--text)',
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
          
          <div>
            <input 
              type="password" 
              placeholder="Password" 
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
                background: 'var(--card-bg)',
                color: 'var(--text)',
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
            Log In
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
              {error}
            </div>
          )}
        </form>
      </div>

      {/* 3D Model */}
      <div
        ref={modelRef}
        style={{
          flex: 1,
          minWidth: 320,
          maxWidth: 480,
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Theme Toggle Button (moved here) */}
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
        </button>
        <model-viewer
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
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            background: 'transparent',
            
          }}
        />
      </div>
    </div>
  );
};

export default Login;
