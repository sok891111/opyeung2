import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { fetchCardStats, CardStats } from '../lib/supabaseStats';
import { recordSwipe } from '../lib/supabaseSwipes';
import { useDeviceSession } from '../hooks/useDeviceSession';

type CardActionButtonsProps = {
  cardId: string;
  onCommentsClick: () => void;
  onProfileClick: () => void;
  onLikeClick?: () => void;
  onNopeClick?: () => void;
};

export const CardActionButtons: React.FC<CardActionButtonsProps> = ({ 
  cardId, 
  onCommentsClick, 
  onProfileClick,
  onLikeClick,
  onNopeClick
}) => {
  const [stats, setStats] = useState<CardStats>({ likeCount: 0, nopeCount: 0, commentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<'like' | 'nope' | null>(null);
  const identity = useDeviceSession();

  useEffect(() => {
    void loadStats();
  }, [cardId]);

  const loadStats = async () => {
    setLoading(true);
    const { data, error } = await fetchCardStats(cardId);
    if (!error && data) {
      setStats(data);
    }
    setLoading(false);
  };

  const handleLike = async () => {
    if (!identity || processing) return;
    
    // 애니메이션 트리거
    onLikeClick?.();
    
    setProcessing('like');
    const { error } = await recordSwipe({
      cardId,
      direction: 'left', // 왼쪽 = 좋아요
      userId: identity.userId,
      sessionId: identity.sessionId,
      deviceId: identity.deviceId,
    });
    if (!error) {
      await loadStats();
    }
    setProcessing(null);
  };

  const handleNope = async () => {
    if (!identity || processing) return;
    
    // 애니메이션 트리거
    onNopeClick?.();
    
    setProcessing('nope');
    const { error } = await recordSwipe({
      cardId,
      direction: 'right', // 오른쪽 = 싫어요
      userId: identity.userId,
      sessionId: identity.sessionId,
      deviceId: identity.deviceId,
    });
    if (!error) {
      await loadStats();
    }
    setProcessing(null);
  };

  const formatCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}만`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}천`;
    }
    return count.toString();
  };

  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col items-center gap-4">
      {/* 프로필 (하트) */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
        onClick={onProfileClick}
        className="flex flex-col items-center gap-1 transition-all hover:scale-110"
        aria-label="프로필 보기"
      >
        <svg className="h-8 w-8 text-white/80 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </motion.button>

      {/* 좋아요 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        onClick={handleLike}
        disabled={processing === 'like'}
        className="flex flex-col items-center gap-1 transition-all hover:scale-110 disabled:opacity-50"
        aria-label="좋아요"
      >
        <svg
          className={`h-8 w-8 drop-shadow-lg ${processing === 'like' ? 'text-white/50' : 'text-white/80'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
        <span className="text-xs font-semibold text-white/80 drop-shadow-lg">
          {loading ? '...' : formatCount(stats.likeCount)}
        </span>
      </motion.button>

      {/* 싫어요 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleNope}
        disabled={processing === 'nope'}
        className="flex flex-col items-center gap-1 transition-all hover:scale-110 disabled:opacity-50"
        aria-label="싫어요"
      >
        <svg
          className={`h-8 w-8 drop-shadow-lg ${processing === 'nope' ? 'text-white/50' : 'text-white/80'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ transform: 'rotate(180deg)' }}
        >
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
        <span className="text-xs font-semibold text-white/80 drop-shadow-lg">
          {loading ? '...' : formatCount(stats.nopeCount)}
        </span>
      </motion.button>

      {/* 댓글 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onCommentsClick}
        className="flex flex-col items-center gap-1 transition-all hover:scale-110"
        aria-label="댓글 보기"
      >
        <svg className="h-8 w-8 text-white/80 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          <circle cx="9" cy="10" r="1.5"/>
          <circle cx="15" cy="10" r="1.5"/>
          <circle cx="12" cy="13" r="1.5"/>
        </svg>
        <span className="text-xs font-semibold text-white/80 drop-shadow-lg">
          {loading ? '...' : formatCount(stats.commentCount)}
        </span>
      </motion.button>
    </div>
  );
};

