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

// Individual comment component
const Comment = ({ comment }) => (
  <div
    style={{
      padding: '1rem',
      border: '1px solid var(--card-border)',
      borderRadius: '6px',
      marginBottom: '0.5rem',
      background: 'var(--card-bg)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
      <strong style={{ color: 'var(--text)' }}>{comment.user_email}</strong>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        {formatDate(comment.created_at)}
      </span>
    </div>
    <p style={{ color: 'var(--text)', margin: 0 }}>{comment.comment}</p>
  </div>
);

const CommentSection = ({ contractId }) => {
  const { user } = useUser();
  const [showCommentSection, setShowCommentSection] = useState(false);
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
            {loadingComments ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '1rem',
                color: 'var(--text-secondary)'
              }}>
                <LoadingSpinner size={16} />
                {t('loading_comments')}
              </div>
            ) : comments.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {comments.map((comment) => (
                  <Comment key={comment.id} comment={comment} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('no_comments_yet')} {t('be_the_first_to_comment')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection; 