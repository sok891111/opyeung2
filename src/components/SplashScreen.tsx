import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';

type SplashScreenProps = {
  onComplete: () => void;
  isLoading?: boolean; // 카드 로딩 상태
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, isLoading = true }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // 최소 1초 유지
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1000);

    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    // 최소 시간이 지나고 로딩이 완료되면 SplashScreen 종료
    if (minTimeElapsed && !isLoading) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        // 애니메이션 완료 후 콜백 호출
        setTimeout(() => {
          onComplete();
        }, 300); // fade out 애니메이션 시간
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, isLoading, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-pink-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-center"
          >
            <h1 className="text-5xl font-normal text-gray-800 tracking-wide">opyeung</h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

