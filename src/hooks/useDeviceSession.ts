import { useEffect, useState } from "react";

/**
 * 디바이스별 사용자 식별 정보
 * - userId: 디바이스별 고유 UUID (localStorage에 영구 저장, 만료 없음)
 * - deviceId: userId와 동일 (하위 호환성 유지)
 * - sessionId: 세션별 고유 ID (페이지 새로고침 시마다 새로 생성)
 */
export type DeviceSession = {
  userId: string; // 디바이스별 고유 UUID (영구 저장)
  deviceId: string; // userId와 동일 (하위 호환성)
  sessionId: string; // 세션별 ID
};

const USER_ID_KEY = "user-device-uuid";
const SESSION_ID_KEY = "current-session-id";

/**
 * UUID 생성 함수
 * crypto.randomUUID가 있으면 사용, 없으면 타임스탬프 기반 생성
 */
const createUUID = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: 타임스탬프 + 랜덤 문자열
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * 디바이스별 사용자 UUID를 가져오거나 생성
 * localStorage에 영구 저장되며 만료되지 않음
 */
const getOrCreateUserId = (): string => {
  if (typeof window === "undefined") {
    return createUUID();
  }

  try {
    // 기존 저장된 UUID 확인
    const stored = localStorage.getItem(USER_ID_KEY);
    if (stored) {
      return stored;
    }

    // 새 UUID 생성 및 저장
    const newUserId = createUUID();
    localStorage.setItem(USER_ID_KEY, newUserId);
    return newUserId;
  } catch (err) {
    console.warn("Failed to access localStorage, generating temporary ID", err);
    return createUUID();
  }
};

/**
 * 세션 ID 생성 (페이지 새로고침 시마다 새로 생성)
 */
const getOrCreateSessionId = (): string => {
  if (typeof window === "undefined") {
    return createUUID();
  }

  try {
    // 세션 스토리지에 저장 (탭별로 독립적)
    const stored = sessionStorage.getItem(SESSION_ID_KEY);
    if (stored) {
      return stored;
    }

    const newSessionId = createUUID();
    sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
    return newSessionId;
  } catch (err) {
    console.warn("Failed to access sessionStorage, generating temporary ID", err);
    return createUUID();
  }
};

/**
 * 디바이스별 사용자 세션 훅
 * - userId: 디바이스별 고유 UUID (localStorage에 영구 저장)
 * - deviceId: userId와 동일 (하위 호환성)
 * - sessionId: 세션별 ID (sessionStorage에 저장)
 */
export const useDeviceSession = (): DeviceSession | null => {
  const [identity, setIdentity] = useState<DeviceSession | null>(null);

  useEffect(() => {
    try {
      const userId = getOrCreateUserId();
      const sessionId = getOrCreateSessionId();

      setIdentity({
        userId,
        deviceId: userId, // 하위 호환성을 위해 동일한 값 사용
        sessionId,
      });
    } catch (err) {
      console.error("Failed to initialize device session", err);
      // 에러 발생 시에도 기본값 제공
      const fallbackId = createUUID();
      setIdentity({
        userId: fallbackId,
        deviceId: fallbackId,
        sessionId: createUUID(),
      });
    }
  }, []);

  return identity;
};


