import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { SwipeCard } from './PageTurnCardStack';

type TutorialProps = {
  isVisible: boolean;
  onComplete: () => void;
  highlightElement?: {
    type: 'swipe' | 'heart' | 'comment' | 'counter';
    position?: { top?: number; right?: number; bottom?: number; left?: number; width?: number; height?: number };
  } | null;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  sampleCard?: SwipeCard;
};

const TUTORIAL_STORAGE_KEY = 'opyeung-tutorial-completed';

export const Tutorial: React.FC<TutorialProps> = ({ 
  isVisible, 
  onComplete, 
  highlightElement,
  currentStep: externalStep,
  onStepChange,
  sampleCard
}) => {
  const [internalStep, setInternalStep] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'center'>('center');
  const [showProfileAnimation, setShowProfileAnimation] = useState(false);
  const [showCommentAnimation, setShowCommentAnimation] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0); // long press 진행도 (0-100)
  const [isLongPressing, setIsLongPressing] = useState(false);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;
  
  const setCurrentStep = (step: number) => {
    if (externalStep === undefined) {
      setInternalStep(step);
    }
    onStepChange?.(step);
  };

  // 첫 번째 단계에서 스와이프 애니메이션 (왼쪽 = 좋아요, 오른쪽 = 싫어요)
  useEffect(() => {
    if (currentStep === 0 && isVisible) {
      // 즉시 애니메이션 시작
      const runAnimation = () => {
        setSwipeDirection('left'); // 왼쪽으로 = 좋아요
        setTimeout(() => {
          setSwipeDirection('center');
          setTimeout(() => {
            setSwipeDirection('right'); // 오른쪽으로 = 싫어요
            setTimeout(() => {
              setSwipeDirection('center');
            }, 1000);
          }, 1000);
        }, 1000);
      };
      
      // 즉시 실행
      runAnimation();
      
      // 이후 3초마다 반복
      const interval = setInterval(runAnimation, 3000);

      return () => clearInterval(interval);
    }
  }, [currentStep, isVisible]);

  // 두 번째 단계에서 프로필 패널 애니메이션
  useEffect(() => {
    if (currentStep === 1 && isVisible) {
      // 즉시 애니메이션 시작
      const runAnimation = () => {
        setShowProfileAnimation(true);
        setTimeout(() => {
          setShowProfileAnimation(false);
        }, 2000);
      };
      
      // 즉시 실행
      runAnimation();
      
      // 이후 3초마다 반복
      const interval = setInterval(runAnimation, 3000);

      return () => clearInterval(interval);
    } else {
      setShowProfileAnimation(false);
    }
  }, [currentStep, isVisible]);

  // 세 번째 단계에서 댓글창 애니메이션
  useEffect(() => {
    if (currentStep === 2 && isVisible) {
      // 즉시 애니메이션 시작
      const runAnimation = () => {
        setShowCommentAnimation(true);
        setTimeout(() => {
          setShowCommentAnimation(false);
        }, 2000);
      };
      
      // 즉시 실행
      runAnimation();
      
      // 이후 3초마다 반복
      const interval = setInterval(runAnimation, 3000);

      return () => clearInterval(interval);
    } else {
      setShowCommentAnimation(false);
    }
  }, [currentStep, isVisible]);

  // 다섯 번째 단계에서 long press 애니메이션
  useEffect(() => {
    if (currentStep === 4 && isVisible) {
      // 즉시 애니메이션 시작
      const runAnimation = () => {
        setIsLongPressing(true);
        setLongPressProgress(0);
        
        // 1초 동안 진행도 증가
        const startTime = Date.now();
        const duration = 1000; // 1초
        
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / duration) * 100, 100);
          setLongPressProgress(progress);
          
          if (progress >= 100) {
            clearInterval(progressInterval);
            // 완료 후 잠시 유지
            setTimeout(() => {
              setIsLongPressing(false);
              setLongPressProgress(0);
            }, 500);
          }
        }, 16); // 약 60fps
        
        // 3초 후 다음 애니메이션 시작
        setTimeout(() => {
          clearInterval(progressInterval);
        }, 3000);
      };
      
      // 즉시 실행
      runAnimation();
      
      // 이후 3.5초마다 반복
      const interval = setInterval(runAnimation, 3500);

      return () => clearInterval(interval);
    } else {
      setIsLongPressing(false);
      setLongPressProgress(0);
    }
  }, [currentStep, isVisible]);

  const steps = [
    {
      title: '좌우로 스와이프하세요',
      description: '좌우로 카드를 넘겨서 다양한 스타일을 평가하세요. 오른쪽으로 넘기면 좋아요\n왼쪽으로 넘기면 싫어요로 평가합니다.',
      highlight: 'swipe' as const,
    },
    {
      title: '하트 아이콘 - 내 프로필',
      description: '좋아요한 상품, 내 댓글, 나의 취향을\n확인할 수 있습니다.',
      highlight: 'heart' as const,
    },
    {
      title: '댓글 아이콘',
      description: '상품에 대한 댓글을 작성하고\n다른 사람의 의견을 볼 수 있습니다.',
      highlight: 'comment' as const,
    },
    {
      title: '하루 최대 30개',
      description: '우측 상단에서 현재 상품 위치를 확인할 수 있습니다.\n하루에 최대 30개의 상품만 볼 수 있습니다.',
      highlight: 'counter' as const,
    },
    {
      title: '이미지 꾹 누르기',
      description: '상품 이미지를 1초 이상 꾹 누르고 있으면\n해당 상품의 상세 페이지로 이동합니다.',
      highlight: 'longpress' as const,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 튜토리얼 완료
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    onComplete();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* 어두운 배경 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60"
          />

          {/* 첫 번째 단계: 스와이프 애니메이션 카드 */}
          {currentStep === 0 && sampleCard && (
            <div className="fixed inset-0 z-[71] flex items-center justify-center">
              <motion.div
                initial={{ x: 0, rotateY: 0, rotateZ: 0 }}
                animate={{
                  x: swipeDirection === 'right' ? 150 : swipeDirection === 'left' ? -150 : 0,
                  rotateY: swipeDirection === 'right' ? -15 : swipeDirection === 'left' ? 15 : 0,
                  rotateZ: swipeDirection === 'right' ? 5 : swipeDirection === 'left' ? -5 : 0,
                }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                className="relative h-[60vh] w-[85%] max-w-md"
                style={{ perspective: 1000 }}
              >
                {/* 카드 */}
                <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <img
                    src={sampleCard.image}
                    alt={sampleCard.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* 좋아요/싫어요 표시 (왼쪽 = 좋아요, 오른쪽 = 싫어요) */}
                  <AnimatePresence>
                    {swipeDirection === 'left' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-6 top-6 rounded-lg border-4 border-green-500 bg-green-500/20 px-6 py-3 backdrop-blur-sm"
                      >
                        <span className="text-2xl font-black text-green-500">좋아요</span>
                      </motion.div>
                    )}
                    {swipeDirection === 'right' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-6 top-6 rounded-lg border-4 border-red-500 bg-red-500/20 px-6 py-3 backdrop-blur-sm"
                      >
                        <span className="text-2xl font-black text-red-500">싫어요</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 화살표 표시 */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                    <motion.div
                      animate={{
                        x: swipeDirection === 'right' ? [0, 20, 0] : swipeDirection === 'left' ? [0, -20, 0] : 0,
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="flex items-center gap-2 text-white"
                    >
                      {swipeDirection === 'left' && (
                        <>
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span className="text-sm font-semibold">왼쪽으로</span>
                        </>
                      )}
                      {swipeDirection === 'right' && (
                        <>
                          <span className="text-sm font-semibold">오른쪽으로</span>
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                      {swipeDirection === 'center' && (
                        <div className="flex items-center gap-1">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span className="text-sm font-semibold">좌우로</span>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* 하이라이트 영역 (4번 단계만) */}
          {highlightElement && currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="fixed z-[71] rounded-lg border-4 border-pink-400 shadow-2xl ring-4 ring-pink-400/30"
              style={{
                top: highlightElement.position?.top,
                right: highlightElement.position?.right,
                bottom: highlightElement.position?.bottom,
                left: highlightElement.position?.left,
                width: highlightElement.position?.width || (highlightElement.type === 'counter' ? '60px' : 'calc(100% - 32px)'),
                height: highlightElement.position?.height || (highlightElement.type === 'counter' ? '24px' : 'calc(100% - 32px)'),
              }}
            >
              <div className="absolute inset-0 rounded-lg bg-pink-400/20 backdrop-blur-sm" />
              {/* 펄스 애니메이션 */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 rounded-lg border-2 border-pink-300"
              />
            </motion.div>
          )}

          {/* 프로필 패널 애니메이션 (2번 단계) */}
          {currentStep === 1 && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: showProfileAnimation ? 0 : '100%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[69] flex max-h-[60vh] flex-col rounded-t-3xl bg-white shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-12 rounded-full bg-gray-300" />
              </div>
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">내 프로필</h2>
                <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">나의 상품 취향</h3>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-700">취향 분석 중...</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">좋아요한 상품 (0)</h3>
                    <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
                      좋아요한 상품이 없습니다.
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {/* 댓글창 애니메이션 (3번 단계) */}
          {currentStep === 2 && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: showCommentAnimation ? 0 : '100%' }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[69] flex max-h-[60vh] flex-col rounded-t-3xl bg-white shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-12 rounded-full bg-gray-300" />
              </div>
              <div className="flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">댓글</h2>
                <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex items-center justify-center py-8 text-gray-500">댓글이 없습니다.</div>
              </div>
              <form className="border-t bg-gray-50 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="댓글을 입력하세요..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled
                  />
                  <button
                    type="button"
                    disabled
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    전송
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 다섯 번째 단계: Long Press 애니메이션 */}
          {currentStep === 4 && sampleCard && (
            <div className="fixed inset-0 z-[71] flex items-center justify-center">
              <motion.div
                className="relative h-[60vh] w-[85%] max-w-md"
                style={{ perspective: 1000 }}
              >
                {/* 카드 */}
                <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <img
                    src={sampleCard.image}
                    alt={sampleCard.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Long Press 진행 표시 */}
                  {isLongPressing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/30"
                    >
                      {/* 진행 바 */}
                      <div className="relative w-48">
                        <div className="h-2 w-full rounded-full bg-white/30">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${longPressProgress}%` }}
                            transition={{ duration: 0.1 }}
                            className="h-full rounded-full bg-white"
                          />
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="absolute -top-8 left-1/2 -translate-x-1/2 text-center"
                        >
                          <svg className="mx-auto h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          <p className="mt-2 text-sm font-semibold text-white">꾹 누르는 중...</p>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* 완료 표시 */}
                  {longPressProgress >= 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-green-500/30"
                    >
                      <div className="text-center">
                        <svg className="mx-auto h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <p className="mt-4 text-lg font-bold text-white">상품 페이지로 이동!</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* 튜토리얼 설명 카드 */}
          <motion.div
            initial={{ opacity: 0, y: currentStep === 1 || currentStep === 2 ? -20 : 20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
            }}
            exit={{ opacity: 0, y: currentStep === 1 || currentStep === 2 ? -20 : 20 }}
            className={`fixed left-4 right-4 z-[72] rounded-2xl bg-white p-6 shadow-2xl md:left-1/2 md:right-auto md:w-96 md:-translate-x-1/2 ${
              currentStep === 1 || currentStep === 2 ? 'top-8' : 'bottom-8'
            }`}
          >
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{currentStepData.title}</h3>
                <span className="text-sm text-gray-500">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm text-gray-600">{currentStepData.description}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                건너뛰기
              </button>
              <button
                onClick={handleNext}
                className="flex-1 rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-600"
              >
                {currentStep < steps.length - 1 ? '다음' : '완료'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// 튜토리얼 완료 여부 확인 함수
export const isTutorialCompleted = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
};

