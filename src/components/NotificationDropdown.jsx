import { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, MessageCircle } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useUser } from '../hooks/useUser';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const isDemoMode = () => localStorage.getItem('isDemoMode') === 'true';

const NotificationDropdown = () => {
  const { user } = useUser();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [generalNotifications, setGeneralNotifications] = useState([]);
  const [commentNotifications, setCommentNotifications] = useState([]);
  const [approvalStatusNotifications, setApprovalStatusNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [generalCount, setGeneralCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [approvalStatusCount, setApprovalStatusCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState(new Set());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  const { t } = useTranslation();

  // Fetch approval requests for approver users
  const fetchNotifications = async () => {
    if (!user) return;
    if (isDemoMode()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
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
    if (isDemoMode()) {
      setCommentNotifications([]);
      setCommentCount(0);
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

  // Fetch general notifications for the current user
  const fetchGeneralNotifications = async () => {
    if (!user) return;
    if (isDemoMode()) {
      setGeneralNotifications([]);
      setGeneralCount(0);
      return;
    }
    
    try {
      // Get unread notifications for the current user
      const { data: userNotifications, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10); // Limit to recent notifications

      if (notificationError) {
        console.error('Error fetching general notifications:', notificationError);
        return;
      }

      setGeneralNotifications(userNotifications || []);
      setGeneralCount(userNotifications?.length || 0);
    } catch (err) {
      console.error('Error fetching general notifications:', err);
    }
  };

  // Fetch approval status notifications for editor users
  const fetchApprovalStatusNotifications = async () => {
    if (!user || user.role !== 'editor') {
      return;
    }
    if (isDemoMode()) {
      setApprovalStatusNotifications([]);
      setApprovalStatusCount(0);
      return;
    }
    
    try {
      // Get approval requests that were made by this editor and have been processed (approved/rejected)
      const { data: approvalRequests, error: approvalError } = await supabase
        .from('contract_approval_requests')
        .select('*')
        .eq('requester_id', user.id)
        .in('status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(10); // Limit to recent 10 notifications

      if (approvalError) {
        console.error('Error fetching approval status notifications:', approvalError);
        return;
      }

      if (!approvalRequests || approvalRequests.length === 0) {
        setApprovalStatusNotifications([]);
        setApprovalStatusCount(0);
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
        console.error('Error fetching contracts for approval status:', contractError);
        return;
      }

      // Combine the data
      const statusNotificationsWithContracts = approvalRequests.map(request => {
        const contract = contracts?.find(c => c.id === request.contract_id);
        return {
          ...request,
          contracts: contract || { id: request.contract_id, title: 'Unknown Contract', status: 'Unknown' }
        };
      });

      setApprovalStatusNotifications(statusNotificationsWithContracts);
      setApprovalStatusCount(statusNotificationsWithContracts.length);
    } catch (err) {
      console.error('Error fetching approval status notifications:', err);
    }
  };

  // Handle approval/rejection
  const handleApprovalAction = async (requestId, action) => {
    if (isDemoMode()) {
      toast.info(t('demo_action_not_available', 'This action is not available in demo mode.'));
      return;
    }
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
      fetchApprovalStatusNotifications();
    } catch (err) {
      console.error('Error handling approval action:', err);
      toast.error('Failed to process approval action');
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    setReadNotifications(prev => new Set([...prev, notificationId]));
    if (isDemoMode()) return;
    
    // Check if this is a general notification that needs to be marked as read in the database
    const generalNotification = generalNotifications.find(n => n.id === notificationId);
    if (generalNotification) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const allNotificationIds = [
      ...approvalStatusNotifications.map(n => n.id),
      ...commentNotifications.map(c => c.id),
      ...generalNotifications.map(n => n.id)
    ];
    setReadNotifications(prev => new Set([...prev, ...allNotificationIds]));
    if (isDemoMode()) return;
    
    // Mark all general notifications as read in the database
    if (generalNotifications.length > 0) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    }
  };

  // Handle notification click
  const handleNotificationClick = (notificationId, contractId) => {
    markNotificationAsRead(notificationId);
    handleCloseDropdown();
    navigate(`/contracts/${contractId}`);
  };

  // Calculate unread counts
  const unreadApprovalCount = approvalStatusNotifications.filter(n => !readNotifications.has(n.id)).length;
  const unreadCommentCount = commentNotifications.filter(c => !readNotifications.has(c.id)).length;
  const unreadGeneralCount = generalNotifications.filter(n => !readNotifications.has(n.id)).length;
  const totalUnreadCount = unreadCount + unreadCommentCount + unreadApprovalCount + unreadGeneralCount;

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
      fetchApprovalStatusNotifications();
      fetchGeneralNotifications(); // Add general notifications
      
      // Set up auto-refresh every 30 seconds for editors and all users for general notifications
      if (user.role === 'editor') {
        const interval = setInterval(() => {
          fetchApprovalStatusNotifications();
          fetchCommentNotifications();
          fetchGeneralNotifications();
        }, 30000); // 30 seconds
        
        setAutoRefreshInterval(interval);
        
        return () => {
          if (interval) clearInterval(interval);
        };
      } else {
        // For non-editors, still refresh general notifications
        const interval = setInterval(() => {
          fetchGeneralNotifications();
        }, 60000); // 60 seconds
        
        setAutoRefreshInterval(interval);
        
        return () => {
          if (interval) clearInterval(interval);
        };
      }
    }
  }, [user]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  // Show for all authenticated users (general notifications), but only show specific types based on role
  if (!user) {
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
          e.currentTarget.style.borderColor = darkMode ? '#60a5fa' : '#f97316';
          e.currentTarget.style.animation = 'ziggle 0.4s ease-in-out';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--card-bg)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'var(--card-border)';
          e.currentTarget.style.animation = 'none';
        }}
      >
        <Bell 
          size={20} 
          className={`notification-bell ${totalUnreadCount > 0 ? 'has-notifications' : ''}`}
        />
        {/* Notification badge */}
        {totalUnreadCount > 0 && (
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
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
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
            width: 'clamp(220px, 60vw, 400px)',
            maxHeight: 'clamp(320px, 70vh, 500px)',
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
              padding: 'clamp(0.7rem, 2vw, 1rem)',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
           <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 'clamp(1rem, 3vw, 1.25rem)' }}>
             {user.role === 'editor' ? t('bell_notifications') : t('bell_headers')}
           </h3>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {user.role === 'editor' && totalUnreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    padding: 'clamp(0.2rem, 1vw, 0.5rem)',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                  }}
                >
                  {t('mark_all_read', 'Mark all read')}
                </button>
              )}
              <button
                onClick={handleCloseDropdown}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 'clamp(0.2rem, 1vw, 0.5rem)',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ maxHeight: 'clamp(220px, 50vh, 400px)', overflowY: 'auto', fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>
            {/* General Notifications - Show for all users */}
            {generalNotifications.length > 0 && (
              <div style={{ padding: '1rem', borderBottom: '2px solid var(--card-border)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontSize: '1rem' }}>
                  🔔 {t('general_notifications', 'System Notifications')}
                </h4>
                {generalNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.75rem',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                                 notification.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 
                                 notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                                 'rgba(59, 130, 246, 0.1)',
                      cursor: 'pointer',
                      opacity: readNotifications.has(notification.id) ? 0.7 : 1,
                      transition: 'opacity 0.2s ease',
                    }}
                    onClick={() => handleNotificationClick(notification.id, notification.contract_id)}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <h5 style={{ 
                        margin: '0 0 0.25rem 0', 
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {notification.type === 'error' && '🛑'}
                        {notification.type === 'warning' && '⚠️'}
                        {notification.type === 'success' && '✅'}
                        {notification.type === 'info' && 'ℹ️'}
                        {notification.title}
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div style={{ 
                      background: 'var(--card-bg)', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      border: '1px solid var(--card-border)'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)' }}>
                        {notification.message}
                      </p>
                    </div>

                    {notification.contract_id && (
                      <div style={{ 
                        marginTop: '0.5rem',
                        background: 'var(--hover-bg)', 
                        padding: '0.25rem', 
                        borderRadius: '4px',
                        border: '1px solid var(--card-border)'
                      }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          {t('click_to_view_contract', 'Click to view contract')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {user.role === 'editor' ? (
              // Editor view - show comments and approval status notifications
              <>
                {/* Approval Status Notifications */}
                {approvalStatusNotifications.length > 0 && (
                  <div style={{ padding: '1rem', borderBottom: '2px solid var(--card-border)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)', fontSize: '1rem' }}>
                      📋 {t('approval_status_updates', 'Approval Status Updates')}
                    </h4>
                    {approvalStatusNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.75rem',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          background: notification.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          cursor: 'pointer',
                          opacity: readNotifications.has(notification.id) ? 0.7 : 1,
                          transition: 'opacity 0.2s ease',
                        }}
                        onClick={() => handleNotificationClick(notification.id, notification.contract_id)}
                      >
                        {/* Contract Info */}
                        <div style={{ marginBottom: '0.5rem' }}>
                          <h5 style={{ 
                            margin: '0 0 0.25rem 0', 
                            color: 'var(--text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {notification.status === 'approved' ? (
                              <Check size={16} style={{ color: '#10b981' }} />
                            ) : (
                              <X size={16} style={{ color: '#ef4444' }} />
                            )}
                            {notification.contracts?.title || 'Unknown Contract'}
                          </h5>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {notification.status === 'approved' ? t('approved', 'Approved') : t('rejected', 'Rejected')} • {new Date(notification.updated_at).toLocaleString()}
                          </p>
                        </div>

                        {/* Response Message */}
                        {notification.approval_response && (
                          <div style={{ 
                            background: 'var(--card-bg)', 
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            border: '1px solid var(--card-border)'
                          }}>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)' }}>
                              <strong>{t('response', 'Response')}:</strong> {notification.approval_response}
                            </p>
                          </div>
                        )}

                        {/* Click hint */}
                        <div style={{ 
                          marginTop: '0.5rem',
                          background: 'var(--hover-bg)', 
                          padding: '0.25rem', 
                          borderRadius: '4px',
                          border: '1px solid var(--card-border)'
                        }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {t('click_to_view_contract', 'Click to view contract')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                                {/* Comment Notifications */}
                {commentNotifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <MessageCircle size={24} style={{ marginBottom: '0.5rem' }} />
                    <p>{t('bell_no_new_comments_in_last_24_hours')}</p>
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
                        opacity: readNotifications.has(comment.id) ? 0.7 : 1,
                        transition: 'opacity 0.2s ease',
                      }}
                      onClick={() => handleNotificationClick(comment.id, comment.contract_id)}
                    >
                      {/* Contract Info */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)' }}>
                          <MessageCircle size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          {comment.contracts?.title || 'Unknown Contract'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {t('comment_by')} {comment.user_email}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Comment Preview */}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.875rem' }}>
                          <strong>{t('comment')}:</strong> {comment.comment.length > 100 ? comment.comment.substring(0, 100) + '...' : comment.comment}
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
                          {t('click_to_view_contract_and_full_comment')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : user.role !== 'approver' && user.role !== 'admin' ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Clock size={24} style={{ marginBottom: '0.5rem' }} />
                <p>{t('approval_notifications_only_for_approver_and_admin_users')}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {t('current_role')}: <strong>{user.role || 'No role assigned'}</strong>
                </p>
              </div>
            ) : loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {t('loading_notifications')}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Clock size={24} style={{ marginBottom: '0.5rem' }} />
                <p>{t('bell_no_pending_approval_requests')}</p>
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
                      {t('bell_requested_by')} {notification.requester_email}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: 'var(--text)' }}>
                      <strong>{t('message')}:</strong> {notification.message}
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
                      <strong>{t('bell_default_response')}:</strong>{t('bell_default_response_message')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <button className="btn-hover-effect"
                      onClick={() => handleApprovalAction(notification.id, 'approve')}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = darkMode 
                          ? '0 2px 4px rgba(255,255,255,0.75)' 
                          : '0 2px 4px rgba(0,0,0,0.45)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Check size={14} />
                      {t('bell_approve')}
                    </button>
                    <button className="btn-hover-effect"
                      onClick={() => handleApprovalAction(notification.id, 'reject')}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = darkMode 
                          ? '0 2px 4px rgba(255,255,255,0.75)' 
                          : '0 2px 4px rgba(0,0,0,0.45)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <X size={14} />
                      {t('bell_reject')}
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