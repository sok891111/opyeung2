import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

type BalloonAnimationProps = {
  type: 'like' | 'nope';
  isVisible: boolean;
  startX: number; // 랜덤 시작 X 위치
};

export const BalloonAnimation: React.FC<BalloonAnimationProps> = ({ type, isVisible, startX }) => {
  if (type === 'like') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 0, x: startX, opacity: 1, scale: 0.5 }}
            animate={{ y: -400, opacity: [1, 1, 0], scale: [0.5, 1.2, 1.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="pointer-events-none fixed bottom-0 z-[60]"
            style={{ left: `${startX}%` }}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <svg className="h-16 w-16 text-red-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // 싫어요 - 깨진 하트 풍선 애니메이션
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 0, x: startX, opacity: 1, scale: 0.5 }}
          animate={{ y: -400, opacity: [1, 1, 0], scale: [0.5, 1.2, 1.5] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-none fixed bottom-0 z-[60]"
          style={{ left: `${startX}%` }}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {/* 깨진 하트 아이콘 */}
            <svg className="h-16 w-16 text-gray-600 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
              {/* 왼쪽 하트 조각 */}
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                opacity="0.8"
                clipPath="url(#leftHeartClip)"
              />
              {/* 오른쪽 하트 조각 (약간 오른쪽으로 이동하여 깨진 효과) */}
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                opacity="0.8"
                clipPath="url(#rightHeartClip)"
                transform="translate(1.5, 0)"
              />
              <defs>
                <clipPath id="leftHeartClip">
                  <rect x="0" y="0" width="12" height="24" />
                </clipPath>
                <clipPath id="rightHeartClip">
                  <rect x="12" y="0" width="12" height="24" />
                </clipPath>
              </defs>
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

