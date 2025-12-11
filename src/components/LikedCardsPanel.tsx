import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { SwipeCard } from './PageTurnCardStack';
import { fetchLikedCards } from '../lib/supabaseLikedCards';
import { useDeviceSession } from '../hooks/useDeviceSession';

type LikedCardsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onCardSelect: (cardId: string) => void;
};

export const LikedCardsPanel: React.FC<LikedCardsPanelProps> = ({ isOpen, onClose, onCardSelect }) => {
  const [likedCards, setLikedCards] = useState<SwipeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const identity = useDeviceSession();

  useEffect(() => {
    if (isOpen && identity) {
      void loadLikedCards();
    }
  }, [isOpen, identity?.deviceId]);

  const loadLikedCards = async () => {
    if (!identity) return;
    setLoading(true);
    const { data, error } = await fetchLikedCards(identity.userId, identity.deviceId);
    if (!error && data) {
      setLikedCards(data);
    }
    setLoading(false);
  };

  const handleCardClick = (cardId: string) => {
    onCardSelect(cardId);
    onClose();
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
              <h2 className="text-lg font-semibold text-gray-900">좋아요한 상품</h2>
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

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">로딩 중...</div>
              ) : likedCards.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500">좋아요한 상품이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {likedCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      className="flex w-full items-center gap-4 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                    >
                      <img
                        src={card.image}
                        alt={card.name}
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{card.name}</p>
                        {card.about && (
                          <p className="mt-1 line-clamp-1 text-sm text-gray-500">{card.about}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

