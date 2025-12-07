import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { approvalsApi, contractsApi } from '../api/contracts';
import { useUser } from '../hooks/useUser';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Helper to check demo mode
const isDemoMode = () => localStorage.getItem('isDemoMode') === 'true';

// Centralized Supabase insert helper
const insertToSupabase = async (table, payload) => {
  const { data, error } = await supabase.from(table).insert(payload);
  if (error) {
    console.error(`Supabase ${table} insert error:`, {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  return data;
};

// Loading spinner component
const LoadingSpinner = ({ size = 16 }) => (
  <Loader2 size={size} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
);

const ApprovalRequestForm = ({ contractId, contract, onStatusUpdate }) => {
  const { user } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const textareaRef = useRef(null);
  useEffect(() => {
    if (rootRef.current) {
      import('gsap').then(({ default: gsap }) => {
        gsap.fromTo(
          rootRef.current,
          { x: 80, scale: 0.95, opacity: 0 },
          { x: 0, scale: 1, opacity: 1, duration: 2.5, ease: 'back.out(1.7)' }
        );
      });
    }
  }, []);

  // Check if user already has a pending approval request
  const hasPendingRequest = contract.status === 'pending';

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (approvalMessage.trim() && !submitting && !hasPendingRequest) {
          handleSubmitApprovalRequest();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [approvalMessage, submitting, hasPendingRequest]);

  // Submit approval request with better error handling
  const handleSubmitApprovalRequest = async () => {
    if (!approvalMessage.trim()) {
      toast.error(t('Please enter a message for the approval request'));
      return;
    }

    if (hasPendingRequest) {
      toast.error(t('Contract is already pending approval'));
      return;
    }

    setSubmitting(true);
    try {
      // Use approvalsApi which handles demo mode
      await approvalsApi.create({
        contract_id: contractId,
        requester_id: user.id,
        requester_email: user.email,
        message: approvalMessage.trim(),
        status: 'pending'
      });

      // Update contract status to pending using contractsApi
      try {
        await contractsApi.update(contractId, { status: 'pending' });
        toast.success(t('Approval request submitted successfully!'));
        setApprovalMessage('');
        setShowForm(false);
        onStatusUpdate && onStatusUpdate('pending');
      } catch (contractError) {
        console.error('Error updating contract status:', contractError);
        toast.error(t('Approval request sent but failed to update contract status'));
      }
    } catch (err) {
      console.error('Error submitting approval request:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name,
        details: err.details
      });
      
      // More specific error messages
      if (err.message?.includes('duplicate key')) {
        toast.error(t('Approval request already exists for this contract'));
      } else if (err.message?.includes('foreign key')) {
        toast.error(t('Invalid contract or user reference'));
      } else if (err.message?.includes('permission')) {
        toast.error(t('Permission denied. Please check your access rights.'));
      } else {
        toast.error(t('failed_to_submit_approval_request') + `: ${err.message || err.details || 'Database error'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !['admin', 'editor'].includes(user.role)) {
    return null;
  }
    return (
    <div ref={rootRef} style={{borderRadius: '6px', padding: '1rem', margin: '0 auto', marginBottom: '.5rem' }}>
      {!showForm ? (
        <button className="btn-hover-effect"
          onClick={() => setShowForm(true)}
          disabled={hasPendingRequest}
          aria-label={hasPendingRequest ? t('approval_already_pending') : t('send_approval_request')}
          style={{
            backgroundColor: hasPendingRequest ? '#e5e7eb' : '#3b82f6',
            color: hasPendingRequest ? '#6b7280' : '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: hasPendingRequest ? 'not-allowed' : 'pointer',
            opacity: hasPendingRequest ? 0.6 : 1,
          }}
        >
          {t('send_approval_request')}
        </button>
      ) : (
        <div style={{ 
          background: 'var(--hover-bg)', 
          padding: '1rem', 
          borderRadius: '6px',
          border: '1px solid var(--card-border)'
        }}>
          <label htmlFor="approval-message" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)' }}>
            {t('approval_message')}
          </label>
          <textarea
            ref={textareaRef}
            id="approval-message"
            value={approvalMessage}
            onChange={(e) => setApprovalMessage(e.target.value)}
            placeholder={t('enter_your_message_for_the_approval_request')}
            aria-label={t('approval_request_message')}
            style={{
              width: '90%',
              minHeight: '80px',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              resize: 'vertical',
              marginBottom: '1rem'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-hover-effect"
              onClick={handleSubmitApprovalRequest}
              disabled={submitting || !approvalMessage.trim()}
              aria-label={submitting ? t('sending_approval_request') : t('send_approval_request')}
              style={{
                backgroundColor: submitting || !approvalMessage.trim() ? '#e5e7eb' : '#10b981',
                color: submitting || !approvalMessage.trim() ? '#6b7280' : '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: submitting || !approvalMessage.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {submitting ? <LoadingSpinner size={14} /> : null}
              {submitting ? t('sending') : t('send_request')}
            </button>
            <button className="btn-hover-effect"
              onClick={() => {
                setShowForm(false);
                setApprovalMessage('');
              }}
              aria-label={t('cancel_approval_request')}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#374151',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {t('ac_cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequestForm; 