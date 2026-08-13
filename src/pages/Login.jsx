// src/pages/Login.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, Eye, EyeOff, Mail, MoonStar, Sun } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useTheme } from '../hooks/useTheme';
import { useLoginPhotos } from '../hooks/useLoginPhotos';
import { authErrorMessage } from '../utils/authErrors';
import { LANGUAGES, languageFor } from '../i18n/languages';
// The display face for the headline and the wordmark. Self-hosted, so no CDN.
import '@fontsource-variable/archivo';
import './login.css';

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const langRef = useRef(null);
  const emailRef = useRef(null);

  const { photos, index, mounted } = useLoginPhotos(i18n.language);
  const current = languageFor(i18n.language);

  // Close the language menu on an outside click or Escape.
  useEffect(() => {
    if (!langOpen) return undefined;
    const onDown = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setLangOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(authErrorMessage(t, signInError));
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login failed:', err);
      setError(authErrorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  /** Sends the reset mail to whatever is in the email field. */
  const handleForgot = useCallback(async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError(t('login.enterEmailFirst', 'Enter your email address first.'));
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) setError(authErrorMessage(t, resetError));
      else setNotice(t('login.resetSent', 'Check your inbox for a reset link.'));
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(authErrorMessage(t, err));
    } finally {
      setBusy(false);
    }
  }, [email, t]);

  // Demo mode is locked - this now routes to a request instead of an instant login.
  const handleDemo = () => {
    window.open('mailto:support@icue.vn?subject=Demo Access Request', '_blank');
  };

  return (
    <div className="auth">
      <nav className="auth-nav">
        <img src="/logoIcons/logo.png" alt="Logo" className="auth-nav__logo" />
        <p className="auth-nav__brand">{t('login.title', 'Quản Lý Hợp Đồng')}</p>

        <div className="auth-nav__end">
          <div className="auth-lang" ref={langRef}>
            <button
              type="button"
              className="auth-lang__btn"
              onClick={() => setLangOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              title={t('login.languageSelector', 'Select language')}
            >
              <img className="auth-lang__flag" src={current.flag} alt="" />
              <span className="auth-lang__label">{current.label}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>

            {langOpen && (
              <ul className="auth-lang__menu" role="listbox">
                {LANGUAGES.map((lang) => (
                  <li key={lang.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i18n.language === lang.code}
                      className={`auth-lang__item${i18n.language === lang.code ? ' auth-lang__item--on' : ''}`}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setLangOpen(false);
                      }}
                    >
                      <img className="auth-lang__flag" src={lang.flag} alt="" />
                      <span>{lang.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="auth-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? t('buttons.light', 'Light') : t('buttons.dark', 'Dark')}
            title={darkMode ? t('buttons.light', 'Light') : t('buttons.dark', 'Dark')}
          >
            {darkMode ? <MoonStar size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </nav>

      <div className="auth-split">
        {/* Form column. Ordered first below 900px - see login.css. */}
        <section className="auth-form-col">
          <h1 className="auth-form__title">{t('login.loginButton', 'Đăng nhập')}</h1>
          <hr className="auth-rule" />

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>{t('login.email', 'Email')}</span>
              <input
                ref={emailRef}
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder', 'ten@congty.vn')}
                autoComplete="email"
                required
              />
            </label>

            <label className="field field--password">
              <span>{t('login.password', 'Mật khẩu')}</span>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder', 'Nhập mật khẩu')}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword
                  ? t('login.hidePassword', 'Hide password')
                  : t('login.showPassword', 'Show password')}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </label>

            <button type="button" className="auth-forgot" onClick={handleForgot} disabled={busy}>
              {t('login.forgotPassword', 'Quên mật khẩu?')}
            </button>

            {error && <p className="auth-error">{error}</p>}
            {notice && <p className="auth-notice">{notice}</p>}

            <button type="submit" className="auth-submit" disabled={busy}>
              <span>{busy ? t('login.loading', 'Loading...') : t('login.loginButton', 'Đăng nhập')}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>

            <div className="auth-or">{t('login.or', 'or')}</div>

            <button type="button" className="auth-demo" onClick={handleDemo}>
              <span>{t('login.tryDemo', 'Request Demo Access')}</span>
              <Mail size={15} aria-hidden="true" />
            </button>

            <p className="auth-fineprint">
              {t('login.noAccount', 'Chưa có tài khoản? Liên hệ quản trị viên.')}
            </p>
          </form>
        </section>

        <section className="auth-hero">
          <p className="auth-kicker">{t('login.kicker', 'Nền tảng hợp đồng')}</p>
          <h2 className="auth-headline">
            {t('login.headline', 'Mọi hợp đồng, một nơi duy nhất.')}
          </h2>
          <p className="auth-lede">
            {t('login.lede', 'Soạn thảo, phê duyệt, ký kết và lưu trữ hợp đồng của cả công ty trong một hệ thống duy nhất.')}
          </p>

          <div className="auth-photo">
            {photos.length === 0 ? (
              <div className="auth-photo__empty">
                {t('login.photoPlaceholder', 'Ảnh bìa — grayscale')}
              </div>
            ) : (
              // Only the frame being shown and the one fading out are mounted -
              // these are full-bleed photos, and holding the whole set in the DOM
              // would fetch every one of them up front.
              mounted.map((i) => (
                <img
                  key={photos[i]}
                  className={`auth-photo__img${i === index ? ' auth-photo__img--on' : ''}`}
                  src={photos[i]}
                  alt=""
                  aria-hidden="true"
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
