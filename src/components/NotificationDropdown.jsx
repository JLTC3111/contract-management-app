import { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, MessageCircle } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useUser } from '../hooks/useUser';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotificationDropdown = () => {
  const { user } = useUser();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [commentNotifications, setCommentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  // Fetch approval requests for approver users
  const fetchNotifications = async () => {
    if (!user) return;
    
    // If user is not an approver or admin, just set empty notifications
    if (user.role !== 'approver' && user.role !== 'admin') {
      setNotifications([]);
      setUnreadCount(0);
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
        return;
      }

      if (!approvalRequests || approvalRequests.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get contract IDs from approval requests
      const contractIds = approvalRequests.map(req => req.contract_id);

      // Fetch contract details for these IDs
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, status')
        .in('id', contractIds);

      if (contractError) {
        console.error('Error fetching contracts:', contractError);
        return;
      }

      // Combine the data
      const notificationsWithContracts = approvalRequests.map(request => {
        const contract = contracts?.find(c => c.id === request.contract_id);
        return {
          ...request,
          contracts: contract || { id: request.contract_id, title: 'Unknown Contract', status: 'Unknown' }
        };
      });

      setNotifications(notificationsWithContracts);
      setUnreadCount(notificationsWithContracts.length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent comments for editor users
  const fetchCommentNotifications = async () => {
    if (!user || user.role !== 'editor') {
      return;
    }
    
    try {
      // Get recent comments (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: comments, error: commentError } = await supabase
        .from('contract_comments')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });

      if (commentError) {
        console.error('Error fetching comments:', commentError);
        return;
      }

      if (!comments || comments.length === 0) {
        setCommentNotifications([]);
        setCommentCount(0);
        return;
      }

      // Get contract IDs from comments
      const contractIds = comments.map(comment => comment.contract_id);

      // Fetch contract details for these IDs
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('id, title')
        .in('id', contractIds);

      if (contractError) {
        console.error('Error fetching contracts for comments:', contractError);
        return;
      }

      // Combine the data
      const commentsWithContracts = comments.map(comment => {
        const contract = contracts?.find(c => c.id === comment.contract_id);
        return {
          ...comment,
          contracts: contract || { id: comment.contract_id, title: 'Unknown Contract' }
        };
      });

      setCommentNotifications(commentsWithContracts);
      setCommentCount(commentsWithContracts.length);
    } catch (err) {
      console.error('Error fetching comment notifications:', err);
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

      // Get the contract ID from the notification
      const notification = notifications.find(n => n.id === requestId);
      if (notification) {
        // Update contract status
        const { error: contractError } = await supabase
          .from('contracts')
          .update({ 
            status: action === 'approve' ? 'approved' : 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.contract_id);

        if (contractError) {
          console.error('Error updating contract status:', contractError);
          toast.error('Approval action completed but failed to update contract status');
        } else {
          toast.success(`Contract ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        }
      }

      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      console.error('Error handling approval action:', err);
      toast.error('Failed to process approval action');
    }
  };

  // Handle dropdown close with animation
  const handleCloseDropdown = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowDropdown(false);
      setIsClosing(false);
    }, 200); // Match the CSS transition duration
  };

  // Fetch notifications when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchCommentNotifications();
    }
  }, [user]);

  // Don't show for non-approver/admin/editor users
  if (!user || (user.role !== 'approver' && user.role !== 'admin' && user.role !== 'editor')) {
    console.log('NotificationDropdown: User role is', user?.role, 'User:', user);
    return null;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <div
        style={{
          position: 'relative',
          cursor: 'pointer',
          padding: '0.5rem',
          background: 'var(--card-bg)',
          border: '1.5px solid var(--card-border)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text)',
          transition: 'background 0.2s',
        }}
        onClick={() => setShowDropdown(!showDropdown)}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--hover-bg)';
          e.currentTarget.style.boxShadow = darkMode
            ? '0 4px 16px 0 rgba(255,255,255,0.25)'
            : '0 4px 16px 0 rgba(0,0,0,0.18)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--card-bg)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Bell 
          size={20} 
          className={`notification-bell ${(unreadCount > 0 || commentCount > 0) ? 'has-notifications' : ''}`}
        />
        {/* Notification badge */}
        {(unreadCount > 0 || commentCount > 0) && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            {unreadCount + commentCount > 99 ? '99+' : unreadCount + commentCount}
          </span>
        )}
      </div>

      {/* Dropdown Menu */}
      {(showDropdown || isClosing) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '400px',
            maxHeight: '500px',
            background: 'var(--card-bg)',
            border: '1.5px solid var(--card-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            opacity: isClosing ? 0 : 1,
            transform: isClosing ? 'translateY(-10px) scale(0.95)' : 'translateY(0) scale(1)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text)' }}>
              {user.role === 'editor' ? 'Notifications' : 'Approval Requests'}
            </h3>
            <button
              onClick={handleCloseDropdown}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {user.role === 'editor' ? (
              // Editor view - show comments
              commentNotifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <MessageCircle size={24} style={{ marginBottom: '0.5rem' }} />
                  <p>No new comments in the last 24 hours</p>
                </div>
              ) : (
                commentNotifications.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--card-border)',
                      background: 'var(--card-bg)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      handleCloseDropdown();
                      navigate(`/contracts/${comment.contract_id}`);
                    }}
                  >
                    {/* Contract Info */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)' }}>
                        <MessageCircle size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        {comment.contracts?.title || 'Unknown Contract'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Comment by: {comment.user_email}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Comment Preview */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.875rem' }}>
                        <strong>Comment:</strong> {comment.comment.length > 100 ? comment.comment.substring(0, 100) + '...' : comment.comment}
                      </p>
                    </div>

                    {/* Click hint */}
                    <div style={{ 
                      background: 'var(--hover-bg)', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      border: '1px solid var(--card-border)'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Click to view contract and full comment
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : user.role !== 'approver' && user.role !== 'admin' ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Clock size={24} style={{ marginBottom: '0.5rem' }} />
                <p>Approval notifications are only available for approver and admin users.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Current role: <strong>{user.role || 'No role assigned'}</strong>
                </p>
              </div>
            ) : loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Clock size={24} style={{ marginBottom: '0.5rem' }} />
                <p>No pending approval requests</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                  }}
                >
                  {/* Contract Info */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)' }}>
                      {notification.contracts?.title || 'Unknown Contract'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Requested by: {notification.requester_email}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: 'var(--text)' }}>
                      <strong>Message:</strong> {notification.message}
                    </p>
                  </div>

                  {/* Default Approval Message */}
                  <div style={{ 
                    background: 'var(--hover-bg)', 
                    padding: '0.75rem', 
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    border: '1px solid var(--card-border)'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <strong>Default Response:</strong> "I have reviewed this contract and found it to be compliant with our standards. All terms and conditions have been verified and are acceptable for approval."
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleApprovalAction(notification.id, 'approve')}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApprovalAction(notification.id, 'reject')}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {(showDropdown || isClosing) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={handleCloseDropdown}
        />
      )}
    </div>
  );
};

export default NotificationDropdown; 