/**
 * Google Tag Manager 이벤트 추적 유틸리티
 */

declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * GTM dataLayer 초기화 (없으면 생성)
 */
function initDataLayer() {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = [];
  }
}

/**
 * GTM 사용자 ID 설정 (Google Analytics 4용)
 * @param userId 사용자 ID
 * @param deviceId 디바이스 ID (userId가 없을 경우 사용)
 */
export function setGTMUserId(userId?: string, deviceId?: string) {
  if (typeof window === 'undefined') return;
  
  initDataLayer();
  
  const userIdentifier = userId || deviceId;
  if (userIdentifier) {
    window.dataLayer.push({
      user_id: userIdentifier,
    });
    
    // 개발 환경에서 로그 출력
    if (import.meta.env.DEV) {
      console.log('[GTM] User ID set:', userIdentifier);
    }
  }
}

/**
 * GTM 이벤트 전송
 * @param eventName 이벤트 이름
 * @param eventData 이벤트 데이터 (선택사항)
 * @param userId 사용자 ID (선택사항, 이벤트별로 덮어쓸 수 있음)
 */
export function trackGTMEvent(
  eventName: string, 
  eventData?: Record<string, any>,
  userId?: string
) {
  if (typeof window === 'undefined') return;
  
  initDataLayer();
  
  const eventPayload: Record<string, any> = {
    event: eventName,
    ...eventData,
  };
  
  // 사용자 ID가 제공되면 이벤트에 포함
  if (userId) {
    eventPayload.user_id = userId;
  }
  
  window.dataLayer.push(eventPayload);
  
  // 개발 환경에서 로그 출력
  if (import.meta.env.DEV) {
    console.log('[GTM Event]', eventName, eventPayload);
  }
}

/**
 * Swipe 이벤트 추적
 * @param direction 스와이프 방향 ('left' | 'right')
 * @param cardId 카드 ID
 * @param userId 사용자 ID (선택사항)
 */
export function trackSwipe(
  direction: 'left' | 'right', 
  cardId: string,
  userId?: string
) {
  trackGTMEvent('swipe', {
    swipe_direction: direction,
    swipe_type: direction === 'left' ? 'like' : 'nope',
    card_id: cardId,
  }, userId);
}

/**
 * 취향 분석 완료 이벤트 추적
 * @param isReanalysis 재분석 여부
 * @param userId 사용자 ID (선택사항)
 */
export function trackPreferenceAnalysisComplete(
  isReanalysis: boolean = false,
  userId?: string
) {
  trackGTMEvent('preference_analysis_complete', {
    is_reanalysis: isReanalysis,
  }, userId);
}

/**
 * 상세페이지 이동 이벤트 추적
 * @param cardId 카드 ID
 * @param url 이동한 URL
 * @param userId 사용자 ID (선택사항)
 */
export function trackProductDetailView(
  cardId: string, 
  url: string,
  userId?: string
) {
  trackGTMEvent('product_detail_view', {
    card_id: cardId,
    product_url: url,
  }, userId);
}

