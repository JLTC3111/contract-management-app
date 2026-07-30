import { useTranslation } from 'react-i18next';

const PhaseConfirmModal = ({ modal, onCancel, onConfirm }) => {
  const { t } = useTranslation();

  if (!modal) return null;

  return (
    <div className="phase-modal" role="presentation" onClick={onCancel}>
      <div
        className="phase-modal__box"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="phase-modal__title">
          {modal.type === 'complete'
            ? t('phaseManagement.confirmComplete', 'Complete this phase?')
            : t('phaseManagement.confirmReopen', 'Reopen this phase?')}
        </h2>
        <p className="phase-modal__body">
          {modal.type === 'complete'
            ? t('phaseManagement.completeWarning', 'All tasks will be marked as done and the next phase will be activated.')
            : t('phaseManagement.reopenWarning', 'This will set the phase back to active status.')}
        </p>
        <div className="phase-modal__actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button type="button" className="btn-secondary" onClick={onConfirm}>
            {t('common.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhaseConfirmModal;
