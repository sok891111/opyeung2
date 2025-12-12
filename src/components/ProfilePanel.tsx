import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { SwipeCard } from './PageTurnCardStack';
import { Comment } from '../types/comment';
import { fetchLikedCards } from '../lib/supabaseLikedCards';
import { fetchUserComments } from '../lib/supabaseUserComments';
import { fetchUserPreference } from '../lib/supabaseUserPreferences';
import { useDeviceSession } from '../hooks/useDeviceSession';

// 취향 텍스트를 파싱하여 연애인 섹션을 강조하는 컴포넌트
const PreferenceTextDisplay: React.FC<{ text: string }> = ({ text }) => {
  // "###비슷한 스타일의 연애인" 부분을 찾아서 분리
  const celebritySectionRegex = /(###비슷한 스타일의 연애인\s*\n?)(.+?)(?=\n\n|\n#|$)/s;
  const match = text.match(celebritySectionRegex);
  
  if (match) {
    const beforeCelebrity = text.substring(0, match.index);
    const celebrityTitle = match[1].trim();
    const celebrityContent = match[2].trim();
    const afterCelebrity = text.substring((match.index || 0) + match[0].length);
    
    return (
      <div className="space-y-4 text-sm text-gray-700">
        {/* 취향 설명 부분 */}
        {beforeCelebrity && (
          <p className="whitespace-pre-line leading-relaxed">{beforeCelebrity.trim()}</p>
        )}
        
        {/* 연애인 섹션 - 강조 스타일 */}
        <div className="mt-6 rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <h4 className="text-base font-semibold text-amber-900">비슷한 스타일의 연예인</h4>
          </div>
          <p className="leading-relaxed text-gray-800 whitespace-pre-line">{celebrityContent}</p>
        </div>
        
        {/* 태그 부분 */}
        {afterCelebrity && (
          <div className="mt-4 flex flex-wrap gap-2">
            {afterCelebrity
              .trim()
              .split(/[,\s]+/)
              .filter(tag => tag.trim().startsWith('#'))
              .map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-gray-200/60 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {tag.trim()}
                </span>
              ))}
          </div>
        )}
      </div>
    );
  }
  
  // 연애인 섹션이 없으면 기본 표시
  return <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{text}</p>;
};

type ProfilePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onCardSelect: (cardId: string | SwipeCard) => void;
};

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ isOpen, onClose, onCardSelect }) => {
  const [likedCards, setLikedCards] = useState<SwipeCard[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [preferenceText, setPreferenceText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const identity = useDeviceSession();

  useEffect(() => {
    if (isOpen && identity) {
      void loadProfileData();
    }
  }, [isOpen, identity?.userId]);

  const loadProfileData = async () => {
    if (!identity) return;
    setLoading(true);
    
    // 좋아요한 상품, 내 댓글, 취향 정보를 동시에 로드
    const [likedResult, commentsResult, preferenceResult] = await Promise.all([
      fetchLikedCards(identity.userId, identity.deviceId),
      fetchUserComments(identity.userId, identity.deviceId),
      fetchUserPreference(identity.userId, identity.deviceId),
    ]);

    if (!likedResult.error && likedResult.data) {
      setLikedCards(likedResult.data);
    }
    if (!commentsResult.error && commentsResult.data) {
      setUserComments(commentsResult.data);
    }
    if (!preferenceResult.error && preferenceResult.data) {
      setPreferenceText(preferenceResult.data.preference_text);
    } else {
      // 취향 정보가 없으면 기본 메시지
      setPreferenceText('아직 충분한 스와이프 데이터가 없어 취향 분석이 완료되지 않았습니다. 더 많은 상품을 평가해주세요!');
    }
    
    setLoading(false);
  };

  const handleCardClick = (card: SwipeCard) => {
    onCardSelect(card); // 전체 카드 객체 전달
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
              <h2 className="text-lg font-semibold text-gray-900">내 프로필</h2>
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">로딩 중...</div>
              ) : (
                <div className="space-y-6">
                  {/* 1. 상품 취향 설명 */}
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">나의 상품 취향</h3>
                    <div className="rounded-lg bg-gray-50 p-4">
                      {preferenceText ? (
                        <PreferenceTextDisplay text={preferenceText} />
                      ) : (
                        <p className="text-sm text-gray-700">
                          아직 충분한 스와이프 데이터가 없어 취향 분석이 완료되지 않았습니다. 더 많은 상품을 평가해주세요!
                        </p>
                      )}
                    </div>
                  </section>

                  {/* 2. 좋아요한 상품 리스트 */}
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">
                      좋아요한 상품 ({likedCards.length})
                    </h3>
                    {likedCards.length === 0 ? (
                      <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
                        좋아요한 상품이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {likedCards.map((card) => (
                          <button
                            key={card.id}
                            onClick={() => handleCardClick(card)}
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
                  </section>

                  {/* 3. 내가 작성한 댓글 */}
                  <section>
                    <h3 className="mb-3 text-base font-semibold text-gray-900">
                      내가 작성한 댓글 ({userComments.length})
                    </h3>
                    {userComments.length === 0 ? (
                      <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
                        작성한 댓글이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userComments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-lg border border-gray-200 p-4"
                          >
                            <p className="text-sm text-gray-900">{comment.content}</p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>{comment.like_count}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>{comment.nope_count}</span>
                              </div>
                              <span>
                                {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

