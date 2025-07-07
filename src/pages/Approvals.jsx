import { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supaBaseClient';
import { Check, X, Clock, FileText, User, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const Approvals = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
        toast.error('Failed to update approval request');
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
          toast.error('Approval action completed but failed to update contract status');
        } else {
          toast.success(`Contract ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        }
      }

      // Refresh the list
      fetchApprovalRequests();
    } catch (err) {
      console.error('Error handling approval action:', err);
      toast.error('Failed to process approval action');
    }
  };

  useEffect(() => {
    fetchApprovalRequests();
  }, [user]);

  // Don't show for non-admin/approver users
  if (!user || (user.role !== 'admin' && user.role !== 'approver')) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view approval requests.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: 'clamp(1rem, 4vw, 2rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)', marginBottom: '0.5rem' }}>
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
          <h1 style={{ color: 'var(--text)', margin: 0, fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}>
            📋 Approval Requests
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Manage pending approval requests from editors
        </p>
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
          Loading approval requests...
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
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No Pending Requests</h3>
          <p style={{ margin: 0, textAlign: 'center' }}>
            There are currently no approval requests waiting for your review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {approvalRequests.map((request) => (
            <div
              key={request.id}
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
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>
                    <FileText size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    {request.contracts?.title || 'Unknown Contract'}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <User size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    Requested by: {request.requester_email}
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
                  Pending
                </span>
              </div>

              {/* Request Details */}
              <div style={{ marginBottom: 'clamp(1rem, 4vw, 1.5rem)' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>
                  <strong>Request Message:</strong>
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
                  <strong>Contract Details:</strong>
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  • Status: {request.contracts?.status || 'Unknown'}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  • Updated: {new Date(request.contracts?.updated_at).toLocaleDateString()}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  • Request Date: {new Date(request.created_at).toLocaleDateString()}
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
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <strong>Default Approval Response:</strong>
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  "I have reviewed this contract and found it to be compliant with our standards. All terms and conditions have been verified and are acceptable for approval."
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between' }}>
                <button
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
                  Approve
                </button>
                <button
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
                  Reject
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