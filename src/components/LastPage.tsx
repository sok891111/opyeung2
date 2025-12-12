import { motion } from 'framer-motion';
import React from 'react';

type LastPageProps = {
  onProfileClick: () => void;
};

export const LastPage: React.FC<LastPageProps> = ({ onProfileClick }) => {
  return (
    <div className="relative flex h-[100svh] min-h-[100svh] w-screen items-center justify-center overflow-hidden bg-black">
      {/* 메시지 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center text-white"
      >
        <p className="mb-2 text-lg">이제 준비된 상품이 없습니다.</p>
        <p className="mb-2 text-lg">더 마음에 드시는 상품으로 준비해두겠습니다.</p>
        <p className="text-lg">내일 다시 방문해주세요.</p>
      </motion.div>

      {/* 우측 하단 프로필 아이콘 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        onClick={onProfileClick}
        className="fixed bottom-24 right-4 z-30 flex flex-col items-center gap-1 transition-all hover:scale-110"
        aria-label="프로필 보기"
      >
        <svg className="h-8 w-8 text-white/80 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </motion.button>
    </div>
  );
};




