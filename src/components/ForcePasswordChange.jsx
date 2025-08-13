import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

/**
 * ForcePasswordChange Component
 * 
 * This component appears when a user logs in with a temporary password
 * set by an administrator. It forces them to change their password
 * before they can access the application.
 */
const ForcePasswordChange = ({ user, onPasswordChanged }) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return strength;
  };

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(newPassword));
  }, [newPassword]);

  const getStrengthLabel = (strength) => {
    if (strength <= 2) return { label: t('passwordStrength.weak'), color: '#ef4444' };
    if (strength <= 4) return { label: t('passwordStrength.medium'), color: '#f59e0b' };
    return { label: t('passwordStrength.strong'), color: '#10b981' };
  };

  const validatePasswords = () => {
    if (!currentPassword) {
      return t('forcePasswordChange.currentPasswordRequired');
    }
    
    if (!newPassword) {
      return t('forcePasswordChange.newPasswordRequired');
    }
    
    if (newPassword.length < 8) {
      return t('forcePasswordChange.passwordMinLength');
    }
    
    if (newPassword === currentPassword) {
      return t('forcePasswordChange.passwordMustBeDifferent');
    }
    
    if (newPassword !== confirmPassword) {
      return t('forcePasswordChange.passwordsDoNotMatch');
    }
    
    if (passwordStrength < 4) {
      return t('forcePasswordChange.passwordTooWeak');
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        setError(t('forcePasswordChange.currentPasswordIncorrect'));
        setLoading(false);
        return;
      }
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      
      // Update user metadata to remove force_password_change flag
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          force_password_change: false,
          password_changed_at: new Date().toISOString()
        }
      });
      
      if (metadataError) {
        console.warn('Could not update user metadata:', metadataError);
      }
      
      // Update the users table if it exists
      try {
        await supabase
          .from('users')
          .update({ 
            force_password_change: false,
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);
      } catch (dbError) {
        console.warn('Could not update users table:', dbError);
      }
      
      // Call the callback to indicate password has been changed
      onPasswordChanged();
      
    } catch (err) {
      setError(t('forcePasswordChange.unexpectedError'));
      console.error('Password change error:', err);
    } finally {
      setLoading(false);
    }
  };

  const strengthInfo = getStrengthLabel(passwordStrength);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--card-border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '1.5rem',
          color: '#f59e0b'
        }}>
          <AlertTriangle size={24} style={{ marginRight: '0.5rem' }} />
          <h2 style={{ margin: 0, color: 'var(--text)' }}>
            {t('forcePasswordChange.title')}
          </h2>
        </div>
        
        <p style={{ 
          color: 'var(--text)', 
          marginBottom: '1.5rem',
          lineHeight: '1.5'
        }}>
          {t('forcePasswordChange.description')}
        </p>
        
        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block',
              color: 'var(--text)',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>
              {t('forcePasswordChange.currentPassword')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '2.5rem',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '1rem'
                }}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          {/* New Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block',
              color: 'var(--text)',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>
              {t('forcePasswordChange.newPassword')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '2.5rem',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '1rem'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{
                  height: '4px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(passwordStrength / 6) * 100}%`,
                    backgroundColor: strengthInfo.color,
                    transition: 'all 0.3s ease'
                  }} />
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  color: strengthInfo.color,
                  marginTop: '0.25rem',
                  display: 'block'
                }}>
                  {strengthInfo.label}
                </span>
              </div>
            )}
          </div>
          
          {/* Confirm Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block',
              color: 'var(--text)',
              marginBottom: '0.5rem',
              fontWeight: '500'
            }}>
              {t('forcePasswordChange.confirmPassword')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '2.5rem',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text)',
                  fontSize: '1rem'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div style={{
              color: '#ef4444',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || passwordStrength < 4}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: passwordStrength >= 4 ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: passwordStrength >= 4 && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.3s ease'
            }}
          >
            <Lock size={18} />
            {loading ? t('forcePasswordChange.updating') : t('forcePasswordChange.updatePassword')}
          </button>
        </form>
        
        {/* Password Requirements */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--hover-bg)',
          borderRadius: '6px'
        }}>
          <h4 style={{ 
            margin: '0 0 0.5rem 0',
            color: 'var(--text)',
            fontSize: '0.875rem'
          }}>
            {t('forcePasswordChange.requirements')}
          </h4>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            lineHeight: '1.4'
          }}>
            <li>{t('forcePasswordChange.requirement1')}</li>
            <li>{t('forcePasswordChange.requirement2')}</li>
            <li>{t('forcePasswordChange.requirement3')}</li>
            <li>{t('forcePasswordChange.requirement4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
