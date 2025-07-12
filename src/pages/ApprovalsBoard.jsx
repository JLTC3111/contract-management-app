import { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import { Check, X, Clock, FileText, User, ArrowLeft, Edit, Save, X as CancelIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import toast from 'react-hot-toast';
import React, { useRef } from 'react';

const Approvals = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const { darkMode } = useTheme();
  
  // Edit state
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const lastDefaultApprovalResponseTextRef = useRef(t('defaultApprovalResponseText'));

  // Handle keyboard shortcuts for save and cancel buttons
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (editingRequestId && editedMessage.trim() && !saving) {
          handleSaveMessage(editingRequestId);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (editingRequestId && !saving) {
          handleCancelEdit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingRequestId, editedMessage, saving]);

  const headerRef = useRef(null);
  const cardRefs = useRef([]);
  const buttonRefs = useRef([]);
  const editRefs = useRef([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from('contract_approval_requests')
        .select('*, contracts(*)')
        .eq('id', id)
        .single();
  
      if (error) {
        console.error('Error fetching approval request:', error);
        return;
      }
  
      setRequest(data);
    };
  
    if (id) {
      fetchRequest();
    }
  }, [id]);

  // Fetch all pending approval requests
  const fetchApprovalRequests = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'approver')) {
      return;
    }

    setLoading(true);
    try {
      // First, get all pending approval requests
      const { data: approvalRequests, error: approvalError } = await supabase
        .from('contract_approval_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (approvalError) {
        console.error('Error fetching approval requests:', approvalError);
        toast.error('Failed to load approval requests');
        return;
      }

      if (!approvalRequests || approvalRequests.length === 0) {
        setApprovalRequests([]);
        setLoading(false);
        return;
      }

      // Get contract IDs from approval requests
      const contractIds = approvalRequests.map(req => req.contract_id);

      // Fetch contract details for these IDs
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, status, updated_at')
        .in('id', contractIds);

      if (contractError) {
        console.error('Error fetching contracts:', contractError);
        toast.error('Failed to load contract details');
        return;
      }

      // Combine the data
      const requestsWithContracts = approvalRequests.map(request => {
        const contract = contracts?.find(c => c.id === request.contract_id);
        return {
          ...request,
          contracts: contract || { id: request.contract_id, title: 'Unknown Contract', status: 'Unknown', updated_at: null }
        };
      });

      setApprovalRequests(requestsWithContracts);
    } catch (err) {
      console.error('Error fetching approval requests:', err);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  // Handle approval/rejection
  const handleApprovalAction = async (requestId, action) => {
    try {
      // Update the approval request status
      const { error: requestError } = await supabase
        .from('contract_approval_requests')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected'
        })
        .eq('id', requestId);

      if (requestError) {
        console.error('Error updating approval request:', requestError);
        toast.error(t('failed_to_update_approval_request'));
        return;
      }

      // Get the contract ID from the request
      const request = approvalRequests.find(r => r.id === requestId);
      if (request) {
        // Update contract status
        const { error: contractError } = await supabase
          .from('contracts')
          .update({ 
            status: action === 'approve' ? 'approved' : 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', request.contract_id);

        if (contractError) {
          console.error('Error updating contract status:', contractError);
          toast.error(t('approval_action_completed_but_failed_to_update_contract_status'));
        } else {
          toast.success(t('contract_approval_action_completed_successfully'));
        }
      }

      // Refresh the list
      fetchApprovalRequests();
    } catch (err) {
      console.error('Error handling approval action:', err);
      toast.error(t('failed_to_process_approval_action'));
    }
  };

  // Handle edit message
  const handleEditMessage = (requestId, currentResponse) => {
    setEditingRequestId(requestId);
    setEditedMessage(currentResponse || t('defaultApprovalResponseText'));
  };

  // Handle save edited message
  const handleSaveMessage = async (requestId) => {
    if (!editedMessage.trim()) {
      toast.error(t('response_message_cannot_be_empty'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contract_approval_requests')
        .update({ 
          approval_response: editedMessage.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating approval response:', error);
        toast.error(t('failed_to_update_approval_response'));
        return;
      }

      toast.success(t('approval_response_updated_successfully'));
      setEditingRequestId(null);
      setEditedMessage('');
      
      // Refresh the list to show updated response
      fetchApprovalRequests();
    } catch (err) {
      console.error('Error saving approval response:', err);
      toast.error(t('failed_to_save_approval_response'));
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingRequestId(null);
    setEditedMessage('');
  };

  useEffect(() => {
    fetchApprovalRequests();
  }, [user]);

  useEffect(() => {
    // If editing and the message matches the previous default, update to new translation
    if (
      editingRequestId !== null &&
      editedMessage === lastDefaultApprovalResponseTextRef.current
    ) {
      setEditedMessage(t('defaultApprovalResponseText'));
    }
    // Always update the ref to the latest translation
    lastDefaultApprovalResponseTextRef.current = t('defaultApprovalResponseText');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, editingRequestId]);

  // GSAP entrance animation
  useEffect(() => {
    import('gsap').then(({ default: gsap }) => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
        );
      }
      if (cardRefs.current) {
        gsap.fromTo(
          cardRefs.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12 }
        );
      }
      if (buttonRefs.current) {
        gsap.fromTo(
          buttonRefs.current,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.08, delay: 0.2 }
        );
      }
    });
  }, [approvalRequests.length, loading]);

  useEffect(() => {
    if (editingRequestId !== null) {
      import('gsap').then(({ default: gsap }) => {
        const idx = approvalRequests.findIndex(r => r.id === editingRequestId);
        if (editRefs.current[idx]) {
          gsap.fromTo(
            editRefs.current[idx],
            { y: 30, scale: 0.96, opacity: 0 },
            { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' }
          );
        }
      });
    }
  }, [editingRequestId, approvalRequests]);

  // Don't show for non-admin/approver users
  if (!user || (user.role !== 'admin' && user.role !== 'approver')) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>{t('access_denied')}</h2>
        <p>{t('no_permission_to_view_approval_requests')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: 'clamp(1rem, 4vw, 2rem)' }}>
        <div
          ref={headerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(0.5rem, 2vw, 1rem)',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              padding: 'clamp(0.3rem, 2vw, 0.5rem)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--card-bg)';
            }}
          >
            <ArrowLeft size={20} />
          </button>
  
          <h1
            style={{
              color: 'var(--text)',
              margin: 0,
              fontSize: 'clamp(0.8rem, 2vw, 1.25rem)',
            }}
          >
            📋 {t('approval_board_approvalRequests.title')}
          </h1>
  
          <h3
            style={{
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: 'clamp(0.3rem, 2vw, 0.5rem)',
              margin: 0,
              color: 'var(--text)',
              fontSize: '1.2rem',
              fontWeight: 500,
              boxShadow: darkMode ? '0 2px 8px rgba(255, 255, 255, 0.2)' : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {approvalRequests.length > 0 ? approvalRequests[0]?.contracts?.title || t('unknown_contract') : t('unknown_contract')}
          </h3>
        </div>
  
        {/*<p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('approval_board_approvalRequests.subtitle')}
        </p>*/}
      </div>
   

      {loading ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '3rem',
          color: 'var(--text-secondary)'
        }}>
          <Clock size={24} style={{ marginRight: '0.5rem' }} />
          {t('loading_approval_requests')}
        </div>
      ) : approvalRequests.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '3rem',
          color: 'var(--text-secondary)',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px'
        }}>
          <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 0.5rem 0' }}>{t('noPendingRequests')}</h3>
          <p style={{ margin: 0, textAlign: 'center' }}>
            {t('currentlyNoApprovalRequestsWaitingForYourReview')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {approvalRequests.map((request, idx) => (
            <div
              key={request.id}
              ref={el => cardRefs.current[idx] = el}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: 'clamp(1rem, 4vw, 1.5rem)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {t('requestedBy')} {request.requester_email}
                  </p>
                </div>
                <span style={{
                  background: '#f59e0b',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {t('pending')}
                </span>
              </div>

              {/* Request Details */}
              <div style={{ marginBottom: 'clamp(1rem, 4vw, 1.5rem)' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>
                  <strong>{t('requestMessage')}:</strong>
                </p>
                <div style={{
                  background: 'var(--hover-bg)',
                  padding: 'clamp(0.5rem, 2vw, 1rem)',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text)'
                }}>
                  {request.message}
                </div>
              </div>

              {/* Contract Info */}
              <div style={{ 
                background: 'var(--hover-bg)', 
                padding: 'clamp(0.5rem, 2vw, 1rem)', 
                borderRadius: '6px',
                marginBottom: 'clamp(1rem, 4vw, 1.5rem)',
                border: '1px solid var(--card-border)'
              }}>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <strong>{t('contractDetails')}:</strong>
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  • {t('status_label')}: {request.contracts?.status || 'Unknown'}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  • {t('updated')}: {new Date(request.contracts?.updated_at).toLocaleDateString()}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  • {t('requestDate')}: {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Default Response */}
              <div style={{ 
                background: 'var(--card-bg)', 
                padding: 'clamp(0.5rem, 2vw, 1rem)', 
                borderRadius: '6px',
                marginBottom: 'clamp(1rem, 4vw, 1.5rem)',
                border: '1px solid var(--card-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <strong>{t('defaultApprovalResponse')}:</strong>
                  </p>
                  {(user?.role === 'admin' || user?.role === 'approver') && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {editingRequestId === request.id ? (
                        <>
                          <button className="btn-hover-effect"
                            onClick={() => handleSaveMessage(request.id)}
                            disabled={saving}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              opacity: saving ? 0.6 : 1,
                            }}
                          >
                            <Save size={12} />
                            {saving ? t('approval_board_saving') : t('approval_board_save')}
                          </button>
                          <button className="btn-hover-effect"
                            onClick={handleCancelEdit}
                            disabled={saving}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              opacity: saving ? 0.6 : 1,
                            }}
                          >
                            <CancelIcon size={12} />
                            {t('approval_board_cancel')}
                          </button>
                        </>
                      ) : (
                        <button className="btn-hover-effect"
                          onClick={() => handleEditMessage(request.id, request.approval_response)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          <Edit size={12} />
                          {t('approval_board_edit')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {editingRequestId === request.id ? (
                  <div
                    ref={el => editRefs.current[idx] = el}
                    style={{
                      background: 'var(--hover-bg)',
                      padding: 'clamp(0.5rem, 2vw, 1rem)',
                      borderRadius: '6px',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '0.5rem',
                        border: '1px solid var(--card-border)',
                        borderRadius: '4px',
                        background: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                      }}
                      placeholder={t('approval_board_placeholder')}
                    />
                  </div>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    "{request.approval_response || t('defaultApprovalResponseText')}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                <button
                  ref={el => buttonRefs.current[idx * 2] = el}
                  onClick={() => handleApprovalAction(request.id, 'approve')}
                  className="btn-hover-effect"
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                    fontWeight: '500',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#059669'}
                  onMouseLeave={(e) => e.target.style.background = '#10b981'}
                >
                  <Check size={16} />
                  {t('approval_board_approve')}
                </button>
                <button
                  ref={el => buttonRefs.current[idx * 2 + 1] = el}
                  onClick={() => handleApprovalAction(request.id, 'reject')}
                  className="btn-hover-effect"
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                    fontWeight: '500',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.target.style.background = '#ef4444'}
                >
                  <X size={16} />
                  {t('approval_board_reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approvals; 