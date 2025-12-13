import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { Comment } from '../types/comment';
import { fetchCommentsWithReactions, createComment, toggleCommentReaction } from '../lib/supabaseComments';
import { useDeviceSession } from '../hooks/useDeviceSession';
import { formatKSTDate } from '../lib/timezoneUtils';

type CommentsPanelProps = {
  cardId: string;
  isOpen: boolean;
  onClose: () => void;
};

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ cardId, isOpen, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const identity = useDeviceSession();

  useEffect(() => {
    if (isOpen && cardId && identity) {
      void loadComments();
    }
  }, [isOpen, cardId, identity?.deviceId]);

  const loadComments = async () => {
    if (!identity) return;
    setLoading(true);
    const { data, error } = await fetchCommentsWithReactions(cardId, identity.deviceId);
    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !identity || submitting) return;

    setSubmitting(true);
    const { data, error } = await createComment(cardId, newComment, identity.deviceId, identity.userId);
    if (!error && data) {
      setComments((prev) => [data, ...prev]);
      setNewComment('');
    }
    setSubmitting(false);
  };

  const handleReaction = async (commentId: string, reaction: 'like' | 'nope') => {
    if (!identity) return;
    const { error } = await toggleCommentReaction(commentId, reaction, identity.deviceId, identity.userId);
    if (!error) {
      await loadComments();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">댓글</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="닫기"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">로딩 중...</div>
              ) : comments.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500">댓글이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <p className="text-sm text-gray-900">{comment.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleReaction(comment.id, 'like')}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                            comment.user_reaction === 'like'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{comment.like_count}</span>
                        </button>
                        <button
                          onClick={() => handleReaction(comment.id, 'nope')}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                            comment.user_reaction === 'nope'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{comment.nope_count}</span>
                        </button>
                        <span className="text-xs text-gray-400">
                          {formatKSTDate(comment.created_at, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSubmit} className="border-t bg-gray-50 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {submitting ? '전송 중...' : '전송'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

