import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, Trash2, CheckCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';

/**
 * Reusable confirmation dialog component
 * Replaces window.confirm() with a styled modal
 * 
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/description
 * @param {string} variant - Style variant: 'danger', 'warning', 'info', 'success'
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Function} onCancel - Callback when cancelled
 * @param {boolean} loading - Show loading state on confirm button
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  variant = 'danger',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const { t } = useTranslation();
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  
  const variants = {
    danger: {
      color: '#ef4444',
      icon: Trash2,
      bgColor: '#fef2f2'
    },
    warning: {
      color: '#f59e0b',
      icon: AlertTriangle,
      bgColor: '#fffbeb'
    },
    info: {
      color: '#3b82f6',
      icon: Info,
      bgColor: '#eff6ff'
    },
    success: {
      color: '#10b981',
      icon: CheckCircle,
      bgColor: '#ecfdf5'
    }
  };
  
  const variantConfig = variants[variant] || variants.danger;
  const Icon = variantConfig.icon;
  
  // Animation on open/close
  useEffect(() => {
    if (!overlayRef.current || !dialogRef.current) return;
    
    if (isOpen) {
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2 }
      );
      gsap.fromTo(dialogRef.current,
        { scale: 0.9, opacity: 0, y: -20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.5)' }
      );
    }
  }, [isOpen]);
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && !loading) {
          onCancel?.();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '1.5rem',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--card-border)'
        }}
      >
        {/* Header with icon */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: variantConfig.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon size={20} color={variantConfig.color} />
          </div>
          
          <div style={{ flex: 1 }}>
            <h3
              id="confirm-dialog-title"
              style={{
                margin: 0,
                color: 'var(--text)',
                fontSize: '1.1rem',
                fontWeight: 600
              }}
            >
              {title || t('common.confirm', 'Confirm')}
            </h3>
            
            <p
              style={{
                margin: '0.5rem 0 0 0',
                color: 'var(--text)',
                opacity: 0.7,
                fontSize: '0.9rem',
                lineHeight: 1.5
              }}
            >
              {message || t('common.areYouSure', 'Are you sure you want to proceed?')}
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '0.25rem',
              opacity: loading ? 0.5 : 0.6,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = 1; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; }}
          >
            <X size={20} color="var(--text)" />
          </button>
        </div>
        
        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            marginTop: '1.5rem'
          }}
        >
          <button
            onClick={onCancel}
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
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {cancelText || t('common.cancel', 'Cancel')}
          </button>
          
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: variantConfig.color,
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
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
            {confirmText || t('common.confirm', 'Confirm')}
          </button>
        </div>
        
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ConfirmDialog;
