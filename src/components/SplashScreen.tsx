import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';

type SplashScreenProps = {
  onComplete: () => void;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 애니메이션 완료 후 콜백 호출
      setTimeout(() => {
        onComplete();
      }, 300); // fade out 애니메이션 시간
    }, 300); // 0.3초 유지

    return () => clearTimeout(timer);
  }, [onComplete]);

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

