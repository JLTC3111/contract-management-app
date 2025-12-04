import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../utils/supaBaseClient';
import { useTranslation } from 'react-i18next';

/**
 * Password Change Modal Component
 * Extracted from Sidebar for better separation of concerns
 */
const PasswordChangeModal = ({ 
  isOpen, 
  onClose, 
  userEmail 
}) => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      // Focus first input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('passwordModal.allFieldsRequired', 'All fields are required.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordModal.passwordsNotMatch', 'New passwords do not match.'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordModal.passwordTooShort', 'Password must be at least 6 characters.'));
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setError(t('passwordModal.incorrectCurrentPassword', 'Current password is incorrect.'));
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (updateError) {
        setError(updateError.message || t('passwordModal.updateFailed', 'Failed to update password.'));
      } else {
        setSuccess(t('passwordModal.updateSuccess', 'Password updated successfully!'));
        setTimeout(() => onClose(), 1500);
      }
    } catch (err) {
      console.error('Password update error:', err);
      setError(t('passwordModal.unexpectedError', 'An unexpected error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={() => !loading && onClose()}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '2rem',
          minWidth: '320px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '1.25rem' }}>
            {t('headers.changePassword', 'Change Password')}
          </h2>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '0.25rem',
              opacity: loading ? 0.5 : 0.6,
              transition: 'opacity 0.2s'
            }}
          >
            <X size={20} color="var(--text)" />
          </button>
        </div>

        {/* Current Password */}
        <div>
          <label style={{ display: 'block', color: 'var(--text)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {t('passwordModal.currentPassword', 'Current Password')}
          </label>
          <input
            ref={inputRef}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--input-bg, var(--card-bg))',
              color: 'var(--text)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
        </div>

        {/* New Password */}
        <div>
          <label style={{ display: 'block', color: 'var(--text)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {t('passwordModal.newPassword', 'New Password')}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--input-bg, var(--card-bg))',
              color: 'var(--text)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ display: 'block', color: 'var(--text)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            {t('passwordModal.confirmPassword', 'Confirm New Password')}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--input-bg, var(--card-bg))',
              color: 'var(--text)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            color: '#ef4444',
            fontSize: '0.9rem',
            padding: '0.5rem 0.75rem',
            background: '#fef2f2',
            borderRadius: '6px',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            color: '#10b981',
            fontSize: '0.9rem',
            padding: '0.5rem 0.75rem',
            background: '#ecfdf5',
            borderRadius: '6px',
            border: '1px solid #a7f3d0'
          }}>
            {success}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading && (
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
            )}
            {loading ? t('buttons.saving', 'Saving...') : t('buttons.save', 'Save')}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </form>
    </div>
  );
};

export default PasswordChangeModal;
