import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

type PreferenceAnalysisLoadingProps = {
  isVisible: boolean;
  isReanalysis?: boolean; // 재분석 모드 여부
};

export const PreferenceAnalysisLoading: React.FC<PreferenceAnalysisLoadingProps> = ({ 
  isVisible, 
  isReanalysis = false 
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* 배경 - 재분석 모드일 때는 완전히 검은색 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[80] ${isReanalysis ? 'bg-black' : 'bg-black/60'}`}
          />

          {/* 로딩 패널 - 하단에서 올라오는 애니메이션 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col items-center justify-center rounded-t-3xl bg-white px-6 py-12 shadow-2xl"
          >
            {/* 로딩 스피너 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="mb-6 h-16 w-16 rounded-full border-4 border-pink-200 border-t-pink-500"
            />

            {/* 텍스트 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h3 className="mb-2 text-xl font-semibold text-gray-900">고객님의 선호 스타일 분석 중</h3>
              <p className="text-sm text-gray-600">잠시만 기다려주세요...</p>
            </motion.div>

            {/* 점 애니메이션 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 flex gap-1"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                  className="h-2 w-2 rounded-full bg-pink-500"
                />
              ))}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};




