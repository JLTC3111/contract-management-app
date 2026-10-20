import { useEffect, useRef, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../hooks/useUser';
import { feedbackMailto, submitFeedback } from '../api/feedback';
import './FeedbackDialog.css';

export default function FeedbackDialog({ onClose }) {
  const { t } = useTranslation();
  const { user, isDemoMode } = useUser();
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const dialogRef = useRef(null);
  const pendingRef = useRef(false);
  const attemptRef = useRef(null);
  const page = window.location.pathname;

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pendingRef.current || receipt || isDemoMode) return;
    if (!message.trim()) {
      setError(t('feedbackForm.empty', 'Enter a message before submitting.'));
      return;
    }
    const payload = { category, message: message.trim(), page };
    const fingerprint = JSON.stringify(payload);
    if (attemptRef.current?.fingerprint !== fingerprint) {
      attemptRef.current = { fingerprint, id: crypto.randomUUID() };
    }
    pendingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const result = await submitFeedback({ ...payload, id: attemptRef.current.id });
      setReceipt(result.reference);
    } catch (failure) {
      const errors = {
        unauthorized: t('feedbackForm.signIn', 'Sign in again to submit feedback.'),
        forbidden: t('feedbackForm.signIn', 'Sign in again to submit feedback.'),
        rate_limited: t('feedbackForm.rateLimited', 'Please wait a minute before sending more feedback.'),
        invalid_request: t('feedbackForm.invalid', 'Check your message and try again.'),
        conflict: t('feedbackForm.invalid', 'Check your message and try again.'),
      };
      setError(errors[failure.feedbackCode] || t('feedbackForm.failed', 'Could not submit feedback. Your message is still here. Try again or email support.'));
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="feedback-dialog"
      aria-labelledby="feedback-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pendingRef.current) onClose();
      }}
    >
      <header className="feedback-dialog__header">
        <h2 id="feedback-title">{t('feedbackForm.title', 'Send feedback')}</h2>
        <button type="button" className="feedback-dialog__close" onClick={onClose} disabled={loading} aria-label={t('buttons.close', 'Close')}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {receipt ? (
        <div className="feedback-dialog__body" role="status">
          <CheckCircle size={28} aria-hidden="true" />
          <h3>{t('feedbackForm.received', 'Feedback received')}</h3>
          <p>{t('feedbackForm.reference', 'Reference')}: <strong>{receipt}</strong></p>
          <p>{t('feedbackForm.receivedDescription', 'Your feedback is saved. Support will receive an email notification and can reply to your email address.')}</p>
          <button type="button" className="feedback-dialog__submit" onClick={onClose}>{t('buttons.close', 'Close')}</button>
        </div>
      ) : (
        <form className="feedback-dialog__body" onSubmit={handleSubmit} aria-busy={loading}>
          <p>{t('feedbackForm.description', 'Share a problem or an idea with the ICUE support team.')}</p>
          <label>
            <span>{t('feedbackForm.type', 'Type')}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={loading} autoFocus>
              <option value="bug">{t('feedbackForm.bug', 'Bug')}</option>
              <option value="suggestion">{t('feedbackForm.suggestion', 'Suggestion')}</option>
              <option value="other">{t('feedbackForm.other', 'Other')}</option>
            </select>
          </label>
          <label>
            <span>{t('feedbackForm.email', 'Reply email')}</span>
            <input type="email" value={user?.email || ''} readOnly />
          </label>
          <label>
            <span>{t('feedbackForm.message', 'Message')}</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('feedbackForm.placeholder', 'What happened, or what would you like to improve?')}
              required maxLength={5000} rows={5} disabled={loading}
            />
          </label>
          {isDemoMode && <p role="status">{t('feedbackForm.demo', 'Sign in to submit feedback. You can still email support.')}</p>}
          {error && <p className="feedback-dialog__error" role="alert">{error}</p>}
          <footer className="feedback-dialog__actions">
            <a href={feedbackMailto(category, message, page)}>{t('feedbackForm.emailInstead', 'Email support instead')}</a>
            <button type="submit" className="feedback-dialog__submit" disabled={loading || isDemoMode}>
              {loading ? t('feedbackForm.submitting', 'Submitting…') : t('feedbackForm.submit', 'Submit feedback')}
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}
