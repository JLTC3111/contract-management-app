import React from 'react';
import { useTranslation } from 'react-i18next';
import { buttonStyle } from './constants';

const PhaseConfirmModal = ({ modal, onCancel, onConfirm }) => {
  const { t } = useTranslation();

  if (!modal) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      }}>
        <h3 style={{ color: 'var(--text)', margin: '0 0 1rem 0' }}>
          {modal.type === 'complete'
            ? t('phaseManagement.confirmComplete', 'Complete this phase?')
            : t('phaseManagement.confirmReopen', 'Reopen this phase?')}
        </h3>
        <p style={{ color: 'var(--text)', opacity: 0.7, margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
          {modal.type === 'complete'
            ? t('phaseManagement.completeWarning', 'All tasks will be marked as complete and the next phase will be activated.')
            : t('phaseManagement.reopenWarning', 'This will set the phase back to active status.')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ ...buttonStyle('var(--card-bg)'), color: 'var(--text)', border: '1px solid var(--card-border)' }}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={buttonStyle(modal.type === 'complete' ? '#10b981' : '#f59e0b')}
          >
            {t('common.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhaseConfirmModal;
