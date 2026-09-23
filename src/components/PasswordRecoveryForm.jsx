import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { passwordRecovery } from '../utils/supaBaseClient';
import { authErrorMessage } from '../utils/authErrors';

export default function PasswordRecoveryForm({ recovery }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const leave = (path) => {
    navigate(path, { replace: true });
    passwordRecovery.dismiss();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password.length < 6) {
      setError(t('passwordModal.passwordTooShort'));
      return;
    }
    if (password !== confirmation) {
      setError(t('passwordModal.passwordsNotMatch'));
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await passwordRecovery.updatePassword(password);
      if (updateError) setError(authErrorMessage(t, updateError));
      else {
        setPassword('');
        setConfirmation('');
      }
    } catch (err) {
      setError(authErrorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  if (recovery.status === 'pending') return <p role="status">{t('common.loading')}</p>;

  if (recovery.status === 'invalid' || recovery.status === 'complete') {
    const complete = recovery.status === 'complete';
    return (
      <div className="auth-form">
        <p className={complete ? 'auth-notice' : 'auth-error'} role={complete ? 'status' : 'alert'}>
          {t(complete ? 'passwordModal.updateSuccess' : 'passwordRecovery.invalidLink')}
        </p>
        <button type="button" className="auth-submit" onClick={() => leave(complete ? '/' : '/login')}>
          <span>{t(complete ? 'passwordRecovery.continue' : 'passwordRecovery.backToLogin')}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="auth-fineprint">{t('passwordRecovery.description', { email: recovery.email })}</p>
      <label className="field field--password">
        <span>{t('passwordModal.newPassword')}</span>
        <input
          className="input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
          required
        />
        <button
          type="button"
          className="auth-eye"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={t(showPassword ? 'login.hidePassword' : 'login.showPassword')}
        >
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </label>
      <label className="field">
        <span>{t('passwordModal.confirmPassword')}</span>
        <input
          className="input"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={busy}
          required
        />
      </label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="auth-submit" disabled={busy}>
        <span>{t(busy ? 'login.loading' : 'passwordRecovery.save')}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <button type="button" className="auth-forgot" disabled={busy} onClick={() => leave('/login')}>
        {t('passwordRecovery.backToLogin')}
      </button>
    </form>
  );
}
