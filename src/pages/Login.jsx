// src/pages/Login.jsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supaBaseClient';
import gsap from 'gsap';

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
      padding: '2rem',
      gap: '2rem',
    }}>
      {/* Login Card */}
      <div
        ref={cardRef}
        style={{
          background: 'var(--card-bg)',
          border: '1.5px solid var(--card-border)',
          borderRadius: '12px',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2 style={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: 'var(--text)',
          fontSize: '2rem',
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
                padding: '0.75rem .5rem',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                fontSize: '1rem',
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
                padding: '0.75rem .5rem',
                border: '1.5px solid var(--card-border)',
                borderRadius: '8px',
                fontSize: '1rem',
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
              fontSize: '1rem',
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
            Sign In
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
