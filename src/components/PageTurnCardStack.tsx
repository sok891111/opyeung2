import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDeviceSession } from "../hooks/useDeviceSession";
import { recordSwipe } from "../lib/supabaseSwipes";
import { SwipeDirection } from "../types/swipe";

export type SwipeCard = {
  id: string;
  name: string;
  age: number;
  city: string;
  about: string;
  image: string;
  tag?: string;
  instagramUrl?: string;
};

const SWIPE_RATIO_THRESHOLD = 0.3;
const MAX_ROTATE_Y = 22;
const MAX_ROTATE_Z = 8;

type PageTurnCardProps = {
  card: SwipeCard;
  onSwiped: (direction: SwipeDirection, id: string) => void;
};

const PageTurnCard: React.FC<PageTurnCardProps> = ({ card, onSwiped }) => {
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

  const likeOpacity = useTransform(x, [0, cardWidth * SWIPE_RATIO_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-cardWidth * SWIPE_RATIO_THRESHOLD, 0], [1, 0]);
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
      }, 2000);
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
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white drop-shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>{card.name}</span>
            <span className="text-white/80">{card.age}</span>
            <span className="text-xs uppercase tracking-wide text-white/80">· {card.city}</span>
          </div>
          <p className="mt-2 text-sm text-white/90">{card.about}</p>
        </div>

        <motion.div
          aria-hidden
          style={{ opacity: likeOpacity }}
          className="absolute left-4 top-5 rounded-md border-4 border-like px-4 py-2 text-2xl font-black text-like shadow-lg shadow-like/30"
        >
          LIKE
        </motion.div>

        <motion.div
          aria-hidden
          style={{ opacity: nopeOpacity }}
          className="absolute right-4 top-5 rounded-md border-4 border-nope px-4 py-2 text-2xl font-black text-nope shadow-lg shadow-nope/30"
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

export const PageTurnCardStack: React.FC<PageTurnCardStackProps> = ({ cards, onDepleted }) => {
  const [stack, setStack] = useState(cards);
  const lastDirections = useRef<Record<string, SwipeDirection>>({});
  const identity = useDeviceSession();

  useEffect(() => setStack(cards), [cards]);

  const handleSwiped = (direction: SwipeDirection, id: string) => {
    lastDirections.current[id] = direction;
    if (identity) {
      void recordSwipe({
        cardId: id,
        direction,
        sessionId: identity.sessionId,
        deviceId: identity.deviceId
      });
    }
    setStack((prev) => {
      const [, ...rest] = prev;
      if (rest.length === 0) {
        onDepleted?.();
      }
      return rest;
    });
    // Simple haptic style feedback could be added here for mobile devices.
    console.info(`Card ${id} ${direction === "right" ? "liked" : "rejected"}`);
  };

  const visibleCards = useMemo(() => stack.slice(0, 3), [stack]);

  const exitAnimation = {
    exit: (dir: SwipeDirection) => ({
      opacity: 0,
      scale: 0.92,
      x: dir === "right" ? 340 : -340,
      rotateZ: dir === "right" ? 10 : -10,
      transition: { duration: 0.18, ease: "easeOut" }
    })
  };

  return (
    <div
      className="relative flex h-[100svh] min-h-[100svh] w-screen items-center justify-center overflow-hidden"
      style={{ perspective: 1400 }}
    >
      {visibleCards.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center text-slate-500">
          더 이상 카드가 없습니다.
        </div>
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
                  <PageTurnCard card={card} onSwiped={handleSwiped} />
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
    </div>
  );
};

