import { useState, useEffect } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supaBaseClient';
import { useUser } from '../hooks/useUser';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

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

// Date formatting helper
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

// Loading spinner component
const LoadingSpinner = ({ size = 16 }) => (
  <Loader2 size={size} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
);

// Style constants
const loadingStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '1rem',
  color: 'var(--text-secondary)'
};

const commentContainerStyle = {
  maxHeight: '300px',
  overflowY: 'auto'
};

const commentBoxStyle = {
  marginBottom: '1rem',
  padding: '0.75rem',
  borderRadius: '8px',
  background: 'var(--card-bg)',
  border: '1.5px solid var(--card-border)',
  textAlign: 'left',
  transition: 'box-shadow 0.2s, background 0.2s',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
};

const commentHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const commentTextStyle = {
  marginTop: 8,
  whiteSpace: 'pre-wrap'
};

const deleteButtonStyle = {
  marginLeft: 'auto',
  marginTop: 8,
  float: 'right',
  background: '#ef4444',
  color: '#fff'
};

// Component to display individual comment
const CommentItem = ({ comment, user, onDelete, t }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      style={{
        ...commentBoxStyle,
        background: isHovered ? 'var(--hover-bg)' : 'var(--card-bg)',
        boxShadow: isHovered ? '0 4px 16px rgba(59,130,246,0.10)' : commentBoxStyle.boxShadow,
        borderColor: isHovered ? 'var(--primary)' : 'var(--card-border)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div style={commentHeaderStyle}>
        <span style={{ fontWeight: 600 }}>{comment.user_email}</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {formatDate(comment.created_at)}
        </span>
      </div>

      {/* Comment Text */}
      <div style={commentTextStyle}>{comment.comment}</div>

      {/* Delete Button Below */}
      {user && comment.user_id === user.id && (
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            className="btn-hover-effect"
            style={{
              background: '#ef4444',
              color: '#fff',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
            }}
            onClick={() => onDelete(comment.id)}
          >
            {t('delete', 'Delete')}
          </button>
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ contractId }) => {
  const { user } = useUser();
  const [showCommentSection, setShowCommentSection] = useState(true); // Show comments by default
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const { t } = useTranslation();
  // Fetch comments for this contract
  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('contract_comments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error('Failed to load comments');
      } else {
        setComments(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching comments:', err);
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  // Submit comment with optimistic update
  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    const newComment = {
      id: Date.now(), // temp ID for optimistic update
      contract_id: contractId,
      user_id: user.id,
      user_email: user.email,
      comment: commentText.trim(),
      created_at: new Date().toISOString()
    };

    // Optimistic update
    setComments(prev => [newComment, ...prev]);
    setCommentText('');
    setSubmittingComment(true);

    try {
      await insertToSupabase('contract_comments', {
        contract_id: contractId,
        user_id: user.id,
        user_email: user.email,
        comment: newComment.comment
      });

      toast.success('Comment submitted successfully!');
      
      // Refresh comments to get the real ID from database
      setTimeout(() => fetchComments(), 500);
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error(`Failed to submit comment: ${err.message || 'Unknown error'}`);
      
      // Revert optimistic update on error
      setComments(prev => prev.filter(c => c.id !== newComment.id));
      setCommentText(newComment.comment);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm(t('delete_comment_confirm', 'Are you sure you want to delete this comment?'))) return;
    const { error } = await supabase
      .from('contract_comments')
      .delete()
      .eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success(t('comment_deleted', 'Comment deleted!'));
    } else {
      toast.error(t('failed_to_delete_comment', 'Failed to delete comment.'));
    }
  };

  // Load comments when component mounts or contract changes
  useEffect(() => {
    if (contractId && showCommentSection) {
      fetchComments();
    }
  }, [contractId, showCommentSection]);

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: '1rem', borderRadius: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowCommentSection(!showCommentSection)}
          aria-label={showCommentSection ? t('hide_comments') : t('show_comments')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          {showCommentSection ? t('hide') : t('show')} {t('comments')}
        </button>
      </div>

      {showCommentSection && (
        <div>
          {/* Add Comment */}
          <div style={{ 
            background: 'var(--hover-bg)', 
            padding: '1rem', 
            borderRadius: '6px',
            border: '1px solid var(--card-border)',
            marginBottom: '1rem'
          }}>
            <label htmlFor="comment-text" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)' }}>
              {t('add_a_comment')}:
            </label>
            <textarea
              id="comment-text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('add_a_comment')}
              aria-label="Comment text"
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                resize: 'vertical',
                marginBottom: '0.5rem'
              }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={submittingComment || !commentText.trim()}
              aria-label={submittingComment ? 'Posting comment...' : 'Post comment'}
              style={{
                backgroundColor: submittingComment || !commentText.trim() ? '#e5e7eb' : '#3b82f6',
                color: submittingComment || !commentText.trim() ? '#6b7280' : '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: submittingComment || !commentText.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {submittingComment ? <LoadingSpinner size={14} /> : null}
              {submittingComment ? t('posting') : '💬 ' + t('post_comment')}
            </button>
          </div>

          {/* Display Comments */}
          <div>
            {loadingComments && (
              <div style={loadingStyle}>
                <LoadingSpinner size={16} />
                {t('loading_comments')}
              </div>
            )}

            {!loadingComments && comments.length > 0 && (
              <div style={commentContainerStyle}>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    user={user}
                    onDelete={handleDeleteComment}
                    t={t}
                  />
                ))}
              </div>
            )}

            {!loadingComments && comments.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {t('no_comments_yet')} {t('be_the_first_to_comment')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection; 