import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDeviceSession } from "../hooks/useDeviceSession";
import { recordSwipe } from "../lib/supabaseSwipes";
import { SwipeDirection } from "../types/swipe";
import { CommentsPanel } from "./CommentsPanel";
import { CardActionButtons } from "./CardActionButtons";
import { ProfilePanel } from "./ProfilePanel";
import { analyzeUserPreferenceFromSwipes, reanalyzeUserPreferenceFromSwipes } from "../lib/analyzePreference";
import { BalloonAnimation } from "./BalloonAnimation";
import { LastPage } from "./LastPage";
import { getSupabaseClient } from "../lib/supabaseClient";
import { Tutorial, isTutorialCompleted } from "./Tutorial";
import { PreferenceAnalysisLoading } from "./PreferenceAnalysisLoading";
import { PreferenceReanalysisModal } from "./PreferenceReanalysisModal";
import { fetchCardsOptimized as fetchCards } from "../lib/supabaseCardsOptimized";
import { fetchRandomCards } from "../lib/supabaseRandomCards";
import { fetchUserPreference } from "../lib/supabaseUserPreferences";

export type SwipeCard = {
  id: string;
  name: string;
  age: number;
  city: string;
  about: string;
  image: string;
  tag?: string;
  instagramUrl?: string;
  description?: string;
  aiTags?: string;
};

const SWIPE_RATIO_THRESHOLD = 0.3;
const MAX_ROTATE_Y = 22;
const MAX_ROTATE_Z = 8;

type PageTurnCardProps = {
  card: SwipeCard;
  onSwiped: (direction: SwipeDirection, id: string) => void;
  onSwipeStart?: (direction: SwipeDirection) => void;
};

const PageTurnCard: React.FC<PageTurnCardProps> = ({ card, onSwiped, onSwipeStart }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(320);
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);
  const identity = useDeviceSession();

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const resize = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setCardWidth(width);
    });
    resize.observe(node);
    return () => resize.disconnect();
  }, []);

  const x = useMotionValue(0);
  const rotateZ = useTransform(x, [-cardWidth, 0, cardWidth], [-MAX_ROTATE_Z, 0, MAX_ROTATE_Z]);
  const rotateY = useTransform(x, [-cardWidth, 0, cardWidth], [MAX_ROTATE_Y, 0, -MAX_ROTATE_Y]);
  const curlStrength = useTransform(x, (latest) => {
    const ratio = Math.min(Math.abs(latest) / (cardWidth || 1), 1);
    return ratio;
  });
  const bendShadow = useTransform(x, (latest) => {
    const intensity = Math.min(Math.abs(latest) / (cardWidth || 1), 1) * 0.45;
    const direction = latest >= 0 ? 120 : -120;
    return `linear-gradient(${direction}deg, rgba(0,0,0,${intensity}) 0%, rgba(0,0,0,0) 55%)`;
  });

  const likeOpacity = useTransform(x, [-cardWidth * SWIPE_RATIO_THRESHOLD, 0], [1, 0]);
  const nopeOpacity = useTransform(x, [0, cardWidth * SWIPE_RATIO_THRESHOLD], [0, 1]);
  const boxShadow = useTransform(
    curlStrength,
    [0, 1],
    ["0 28px 70px -35px rgba(0,0,0,0.18)", "0 28px 70px -35px rgba(0,0,0,0.45)"]
  );

  const snapBack = () =>
    animate(x, 0, {
      type: "spring",
      stiffness: 360,
      damping: 30
    });

  const flyOut = (direction: SwipeDirection, velocity: number) => {
    // 애니메이션 트리거
    onSwipeStart?.(direction);
    onSwiped(direction, card.id);
    const exitX = direction === "right" ? cardWidth * 1.2 : -cardWidth * 1.2;
    animate(x, exitX, {
      type: "spring",
      velocity,
      stiffness: 180,
      damping: 16
    });
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = cardWidth * SWIPE_RATIO_THRESHOLD;
    if (info.offset.x > threshold) {
      flyOut("right", info.velocity.x);
    } else if (info.offset.x < -threshold) {
      flyOut("left", info.velocity.x);
    } else {
      snapBack();
    }
  };

  const clearPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    longPressTriggered.current = false;
    pressStart.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pressStart.current = { x: e.clientX, y: e.clientY };
    if (card.instagramUrl) {
      pressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        window.open(card.instagramUrl, "_blank", "noopener,noreferrer");
      }, 1000); // 1초로 변경
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressStart.current) return;
    const dx = Math.abs(e.clientX - pressStart.current.x);
    const dy = Math.abs(e.clientY - pressStart.current.y);
    if (dx > 12 || dy > 12) {
      clearPress();
    }
  };

  const handlePointerUp = () => {
    clearPress();
  };

  const handlePointerCancel = () => {
    clearPress();
  };

  return (
    <motion.div
      ref={cardRef}
      drag="x"
      onDragEnd={handleDragEnd}
      dragConstraints={{ left: -500, right: 500 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        x,
        rotateZ,
        rotateY,
        boxShadow,
        transformStyle: "preserve-3d"
      }}
      className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
    >
      <div className="relative h-full w-full overflow-hidden bg-white">
        <div className="relative h-full w-full">
          <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {card.tag ? (
            <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800 shadow-sm">
              {card.tag}
            </span>
          ) : null}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 pr-20 text-white drop-shadow-sm">
          <p className="text-sm text-white/90 line-clamp-2">{card.about}</p>
        </div>

        {/* LIKE 표시: 왼쪽으로 swipe 시 오른쪽 상단에 표시 (swipe 반대 방향) */}
        <motion.div
          aria-hidden
          style={{ opacity: likeOpacity }}
          className="absolute right-4 top-5 rounded-md border-4 border-green-500 bg-green-500/95 px-6 py-3 text-3xl font-black text-white shadow-2xl backdrop-blur-sm"
        >
          LIKE
        </motion.div>

        {/* NOPE 표시: 오른쪽으로 swipe 시 왼쪽 상단에 표시 (swipe 반대 방향) */}
        <motion.div
          aria-hidden
          style={{ opacity: nopeOpacity }}
          className="absolute left-4 top-5 rounded-md border-4 border-red-500 bg-red-500/95 px-6 py-3 text-3xl font-black text-white shadow-2xl backdrop-blur-sm"
        >
          NOPE
        </motion.div>

        <motion.div
          aria-hidden
          style={{
            backgroundImage: bendShadow,
            opacity: curlStrength
          }}
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
        />
      </div>
    </motion.div>
  );
};

type PageTurnCardStackProps = {
  cards: SwipeCard[];
  onDepleted?: () => void;
};

type CardSelectOption = string | SwipeCard;

export const PageTurnCardStack: React.FC<PageTurnCardStackProps> = ({ cards, onDepleted }) => {
  const [stack, setStack] = useState(cards);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [isAnalyzingPreference, setIsAnalyzingPreference] = useState(false);
  const [isReanalyzingPreference, setIsReanalyzingPreference] = useState(false);
  const [isReanalysisMode, setIsReanalysisMode] = useState(false); // 재분석 모드 (랜덤 상품 5개 평가)
  const [reanalysisSwipeCount, setReanalysisSwipeCount] = useState(0); // 재분석 모드에서의 스와이프 카운트
  const [viewingFromProfile, setViewingFromProfile] = useState<string | null>(null); // 프로필에서 선택한 카드 ID
  const lastDirections = useRef<Record<string, SwipeDirection>>({});
  const swipeCountRef = useRef(0);
  const consecutiveNopeCountRef = useRef(0); // 연속 싫어요 카운트
  const identity = useDeviceSession();
  const initialCardsCount = useRef(cards.length);
  
  // 풍선 애니메이션 상태 (여러 개 동시 표시 가능)
  const [balloonAnimations, setBalloonAnimations] = useState<Array<{
    id: string;
    type: 'like' | 'nope';
    isVisible: boolean;
    startX: number;
  }>>([]);

  // 튜토리얼 상태
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    setStack(cards);
    initialCardsCount.current = cards.length;
  }, [cards]);

  // 튜토리얼 초기화
  useEffect(() => {
    if (!isTutorialCompleted()) {
      setShowTutorial(true);
    }
  }, []);

  const handleCardSelect = async (cardIdOrCard: string | SwipeCard) => {
    // 카드 객체가 전달된 경우
    if (typeof cardIdOrCard === 'object') {
      const card = cardIdOrCard;
      setViewingFromProfile(card.id); // 프로필에서 선택한 카드로 표시
      setStack((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === card.id);
        if (existingIndex !== -1) {
          // 이미 있으면 맨 위로 이동
          const otherCards = prev.filter((c) => c.id !== card.id);
          return [prev[existingIndex], ...otherCards];
        } else {
          // 없으면 맨 위에 추가
          return [card, ...prev];
        }
      });
      return;
    }

    // cardId만 전달된 경우
    const cardId = cardIdOrCard;
    const existingCardIndex = stack.findIndex((c) => c.id === cardId);
    
    if (existingCardIndex !== -1) {
      // 스택에 있으면 맨 위로 이동
      setStack((prev) => {
        const selectedCard = prev[existingCardIndex];
        const otherCards = prev.filter((c) => c.id !== cardId);
        return [selectedCard, ...otherCards];
      });
    } else {
      // 스택에 없으면 Supabase에서 카드 정보 가져오기
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("cards")
            .select("id,name,age,city,about,image,tag,instagram_url,description,ai_tags")
            .eq("id", cardId)
            .single();

          if (!error && data) {
            const card: SwipeCard = {
              id: String(data.id),
              name: data.name ?? "",
              age: Number(data.age ?? 0),
              city: data.city ?? "",
              about: data.about ?? "",
              image: data.image ?? "",
              tag: data.tag ?? undefined,
              instagramUrl: data.instagram_url ?? undefined,
              description: data.description ?? undefined,
              aiTags: data.ai_tags ?? undefined,
            };
            
            // 카드를 스택 맨 위에 추가
            setStack((prev) => [card, ...prev]);
          }
        } catch (err) {
          console.error("Failed to fetch card:", err);
        }
      }
    }
  };

  const handleSwipeStart = (direction: SwipeDirection) => {
    // 랜덤 X 위치 생성 (화면 너비의 20%~80% 사이)
    const randomX = 20 + Math.random() * 60;
    const balloonId = `balloon-${Date.now()}-${Math.random()}`;
    
    // 새 풍선 추가 (왼쪽 = 좋아요, 오른쪽 = 싫어요)
    setBalloonAnimations((prev) => [
      ...prev,
      {
        id: balloonId,
        type: direction === 'left' ? 'like' : 'nope',
        isVisible: true,
        startX: randomX,
      },
    ]);

    // 2초 후 해당 풍선 숨김
    setTimeout(() => {
      setBalloonAnimations((prev) =>
        prev.map((balloon) =>
          balloon.id === balloonId ? { ...balloon, isVisible: false } : balloon
        )
      );
      
      // 숨김 후 완전히 제거 (애니메이션 완료 후)
      setTimeout(() => {
        setBalloonAnimations((prev) => prev.filter((balloon) => balloon.id !== balloonId));
      }, 300);
    }, 2000);
  };

  const handleSwiped = async (direction: SwipeDirection, id: string) => {
    // 프로필에서 선택한 카드를 보고 있는 경우, 좋아요/싫어요 처리 없이 넘기기만
    if (viewingFromProfile === id) {
      setViewingFromProfile(null); // 다음 카드로 넘어가면 플래그 해제
      setStack((prev) => {
        const [, ...rest] = prev;
        if (rest.length === 0) {
          onDepleted?.();
        }
        return rest;
      });
      console.info(`Card ${id} skipped (viewing from profile)`);
      return;
    }

    lastDirections.current[id] = direction;
    if (identity) {
      // 방향은 그대로 전달 (supabaseSwipes.ts에서 처리)
      await recordSwipe({
        cardId: id,
        direction,
        userId: identity.userId,
        sessionId: identity.sessionId,
        deviceId: identity.deviceId
      });

      // 싫어요 연속 카운트 추적 (재분석 모드가 아닐 때만)
      if (!isReanalysisMode) {
        const isNope = direction === 'right'; // 오른쪽 = 싫어요
        if (isNope) {
          consecutiveNopeCountRef.current += 1;
        } else {
          consecutiveNopeCountRef.current = 0; // 좋아요 시 리셋
        }

        // 싫어요 5번 연속 시 재분석 모드 진입
        if (consecutiveNopeCountRef.current >= 5) {
          console.log('[Preference Re-analysis] 5 consecutive nopes detected. Entering re-analysis mode.');
          consecutiveNopeCountRef.current = 0; // 리셋
          
          // 재분석 모드 진입
          setIsReanalysisMode(true);
          setReanalysisSwipeCount(0);
          setIsReanalyzingPreference(true);

          // 랜덤 상품 5개 가져오기
          try {
            // 최소 1초 로딩 UI 표시
            const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));
            
            Promise.all([
              fetchRandomCards(identity.userId, identity.deviceId, 5),
              minLoadingTime
            ])
            .then(([{ data: randomCards, error: fetchError }]) => {
              if (!fetchError && randomCards && randomCards.length > 0) {
                // 현재 스택을 랜덤 상품 5개로 교체
                setStack(randomCards);
                // 카운팅 초기화 (5개로 설정)
                initialCardsCount.current = randomCards.length;
                setIsReanalyzingPreference(false);
                console.log(`[Preference Re-analysis] Loaded ${randomCards.length} random cards for re-evaluation`);
              } else {
                console.error('Failed to fetch random cards for re-analysis:', fetchError);
                setIsReanalyzingPreference(false);
                setIsReanalysisMode(false);
              }
            })
            .catch((err) => {
              console.error('Error fetching random cards:', err);
              setIsReanalyzingPreference(false);
              setIsReanalysisMode(false);
            });
          } catch (err) {
            console.error('Error setting up random cards fetch:', err);
            setIsReanalyzingPreference(false);
            setIsReanalysisMode(false);
          }
        }
      }

      // 재분석 모드에서의 스와이프 카운트
      if (isReanalysisMode) {
        const newCount = reanalysisSwipeCount + 1;
        setReanalysisSwipeCount(newCount);

        // 재분석 모드에서 5개 평가 완료 시 취향 재분석
        if (newCount >= 5) {
          const groqApiKey = (import.meta as any).env?.VITE_GROQ_API_KEY;
          if (groqApiKey) {
            // 원래 취향 분석 로직과 동일하게 PreferenceAnalysisLoading 사용
            setIsAnalyzingPreference(true);
            setIsReanalysisMode(false);
            setReanalysisSwipeCount(0);
            
            // 최소 1.1초 로딩 UI 표시
            const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1100));
            
            Promise.all([
              reanalyzeUserPreferenceFromSwipes(identity.userId, identity.deviceId, groqApiKey),
              minLoadingTime
            ])
            .then(async ([{ preference, error }]) => {
              // 로딩 UI 숨기기
              setIsAnalyzingPreference(false);
              
              if (!error && preference) {
                // 재분석 완료 후 취향 기반 카드 다시 가져오기
                try {
                  const { data: newCards, error: fetchError } = await fetchCards(
                    identity.userId,
                    identity.deviceId
                  );
                  
                  if (!fetchError && newCards.length > 0) {
                    // 최대 30개로 제한
                    const limitedCards = newCards.slice(0, 30);
                    // 현재 스택을 취향 기반 카드로 교체
                    setStack(limitedCards);
                    // 카운팅 초기화 (30개로 설정)
                    initialCardsCount.current = limitedCards.length;
                    console.log(`[Preference Re-analysis] Loaded ${limitedCards.length} preference-based cards after re-analysis`);
                  }
                } catch (err) {
                  console.error('Failed to reload cards after re-analysis:', err);
                }
                
                // 재분석 완료 후 프로필 패널 자동으로 열기
                setTimeout(() => {
                  setProfileOpen(true);
                }, 300); // 약간의 딜레이 후 열기
              }
            })
            .catch((err) => {
              console.error('Preference re-analysis error:', err);
              setIsAnalyzingPreference(false);
              setIsReanalysisMode(false);
              setReanalysisSwipeCount(0);
            });
          }
        }
      }

      // 스와이프 카운트 증가 (재분석 모드가 아닐 때만)
      if (!isReanalysisMode) {
        swipeCountRef.current += 1;

        // 5번째 스와이프일 때 취향 분석 실행 (최초 로그인 사용자만)
        if (swipeCountRef.current === 5) {
        // 이미 취향 분석이 완료되었는지 확인
        fetchUserPreference(identity.userId, identity.deviceId)
          .then(({ data: existingPreference }) => {
            // 취향 분석이 이미 있으면 스킵
            if (existingPreference) {
              console.log('[Preference Analysis] Already analyzed, skipping.');
              return;
            }

            // 취향 분석이 없으면 분석 실행
            const groqApiKey = (import.meta as any).env?.VITE_GROQ_API_KEY;
            if (!groqApiKey) {
              console.warn('Groq API key not configured. Skipping preference analysis.');
              return;
            }

            // 로딩 UI 표시
            setIsAnalyzingPreference(true);
            
            // 최소 0.8초 로딩 UI 표시를 위한 Promise.all 사용
            const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1100));
            
            // 취향 분석 실행
            Promise.all([
              analyzeUserPreferenceFromSwipes(identity.userId, identity.deviceId, groqApiKey),
              minLoadingTime
            ])
            .then(async ([{ preference, error }]) => {
              // 로딩 UI 숨기기 (최소 0.8초 후)
              setIsAnalyzingPreference(false);
              
              if (!error && preference) {
                // 취향 분석 완료 후 사용자 취향 기반으로 카드 다시 가져오기
                try {
                  // 취향 분석 전에 본 카드 수 저장
                  const viewedBeforeAnalysis = initialCardsCount.current - stack.length;
                  
                  const { data: newCards, error: fetchError } = await fetchCards(
                    identity.userId,
                    identity.deviceId
                  );
                  
                  if (!fetchError && newCards.length > 0) {
                    // 현재 스택의 남은 카드 ID 목록
                    const currentStackIds = new Set(stack.map(card => card.id));
                    
                    // 새로 가져온 카드 중 현재 스택에 없는 카드만 필터링
                    const newCardsToAdd = newCards.filter(card => !currentStackIds.has(card.id));
                    
                    if (newCardsToAdd.length > 0) {
                      // 현재 스택 뒤에 취향 기반 카드 추가
                      setStack((prev) => {
                        const newStack = [...prev, ...newCardsToAdd];
                        // 카운팅을 위해 initialCardsCount 업데이트 (본 카드 수 + 새 카드 수)
                        initialCardsCount.current = viewedBeforeAnalysis + newStack.length;
                        return newStack;
                      });
                      console.log(`[Preference Analysis] Added ${newCardsToAdd.length} preference-based cards to stack`);
                    }
                  }
                } catch (err) {
                  console.error('Failed to reload cards after preference analysis:', err);
                }
                
                // 분석 완료 후 프로필 패널 자동으로 열기
                setTimeout(() => {
                  setProfileOpen(true);
                }, 300); // 약간의 딜레이 후 열기
              }
            })
            .catch((err) => {
              console.error('Preference analysis error:', err);
              setIsAnalyzingPreference(false);
            });
          })
          .catch((err) => {
            console.error('Failed to check existing preference:', err);
          });
        }
      }
    }
    setStack((prev) => {
      const [, ...rest] = prev;
      if (rest.length === 0) {
        onDepleted?.();
      }
      return rest;
    });
    // Simple haptic style feedback could be added here for mobile devices.
    console.info(`Card ${id} ${direction === "left" ? "liked" : "rejected"}`);
  };

  const visibleCards = useMemo(() => stack.slice(0, 30), [stack]);

  const exitAnimation = {
    exit: (dir: SwipeDirection) => ({
      opacity: 0,
      scale: 0.92,
      x: dir === "right" ? 340 : -340,
      rotateZ: dir === "right" ? 10 : -10,
      transition: { duration: 0.18, ease: "easeOut" }
    })
  };

  // 현재 카드 인덱스 계산 (전체 카드 중에서)
  const totalCards = Math.min(initialCardsCount.current, 30);
  // 본 카드 수 = initialCardsCount - stack.length
  // 현재 인덱스 = 본 카드 수 + 1
  const viewedCount = Math.max(0, initialCardsCount.current - stack.length);
  const currentIndex = Math.max(1, Math.min(viewedCount + 1, totalCards));

  return (
    <>
      <div
        className="relative flex h-[100svh] min-h-[100svh] w-screen items-center justify-center overflow-hidden"
        style={{ perspective: 1400 }}
      >
        {/* 우측 상단 카운터 */}
        {visibleCards.length > 0 && (
          <div className="absolute right-4 top-4 z-50 text-white text-sm font-semibold drop-shadow-lg">
            {currentIndex}/{totalCards}
          </div>
        )}

        {visibleCards.length === 0 ? (
          <LastPage onProfileClick={() => setProfileOpen(true)} />
        ) : null}

        <AnimatePresence>
          {visibleCards
            .map((card, index) => {
              const isTop = index === 0;
              const depth = visibleCards.length - index;
              const scale = 1 - index * 0.05;
              const translateY = index * 12;

              return (
                <motion.div
                  key={card.id}
                  initial={{ scale: scale - 0.08, y: translateY + 32, opacity: 0 }}
                  animate={{
                    scale,
                    y: translateY,
                    opacity: 1,
                    filter: "brightness(1)"
                  }}
                  exit="exit"
                  transition={{ type: "spring", stiffness: 260, damping: 28, mass: 1 }}
                  className="absolute inset-0"
                  style={{
                    zIndex: depth
                  }}
                  custom={lastDirections.current[card.id] ?? "right"}
                  variants={exitAnimation}
                >
                  {isTop ? (
                    <PageTurnCard card={card} onSwiped={handleSwiped} onSwipeStart={handleSwipeStart} />
                  ) : (
                    <div className="relative h-full w-full bg-white/80 shadow-card">
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-full w-full object-cover opacity-70"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
                    </div>
                  )}
                </motion.div>
              );
            })
            .reverse()}
        </AnimatePresence>

        {/* 풍선 애니메이션 (여러 개 동시 표시 가능) */}
        {balloonAnimations.map((balloon) => (
          <BalloonAnimation
            key={balloon.id}
            type={balloon.type}
            isVisible={balloon.isVisible}
            startX={balloon.startX}
          />
        ))}

        {/* 우측 하단 액션 버튼 (카드 스택 밖에 고정) */}
        {visibleCards.length > 0 && visibleCards[0] && (
          <CardActionButtons
            cardId={visibleCards[0].id}
            onCommentsClick={() => {
              setCurrentCardId(visibleCards[0].id);
              setCommentsOpen(true);
            }}
            onProfileClick={() => {
              setProfileOpen(true);
            }}
            onLikeClick={() => handleSwipeStart('left')} // 왼쪽 = 좋아요
            onNopeClick={() => handleSwipeStart('right')} // 오른쪽 = 싫어요
          />
        )}
      </div>

      {/* Comments Panel */}
      {currentCardId && (
        <CommentsPanel cardId={currentCardId} isOpen={commentsOpen} onClose={() => setCommentsOpen(false)} />
      )}

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onCardSelect={handleCardSelect}
      />

                  {/* Tutorial */}
                  <Tutorial
                    isVisible={showTutorial}
                    onComplete={() => setShowTutorial(false)}
                    currentStep={tutorialStep}
                    onStepChange={setTutorialStep}
                    sampleCard={visibleCards.length > 0 ? visibleCards[0] : undefined}
                    highlightElement={
                      showTutorial
                        ? tutorialStep === 3
                          ? { type: 'counter', position: { top: 16, right: 16, width: 60, height: 24 } }
                          : null
                        : null
                    }
                  />

      {/* Preference Analysis Loading */}
      <PreferenceAnalysisLoading isVisible={isAnalyzingPreference} />
      
      {/* Preference Re-analysis Modal */}
      <PreferenceReanalysisModal 
        isVisible={isReanalyzingPreference} 
        message="고객님의 취향을 재분석합니다. 5개의 상품에 대해 스타일을 평가해주세요."
      />
    </>
  );
};

