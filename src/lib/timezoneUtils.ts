/**
 * 한국 시간대(KST, UTC+9) 관련 유틸리티 함수
 * 환경 변수 VITE_TIMEZONE_OFFSET_HOURS로 시간대 오프셋을 설정할 수 있습니다.
 * 기본값은 9 (한국 시간대, UTC+9)입니다.
 */

// 환경 변수에서 시간대 오프셋 가져오기 (기본값: 9 = KST)
const TIMEZONE_OFFSET_HOURS = Number(import.meta.env.VITE_TIMEZONE_OFFSET_HOURS) || 9;
const TIMEZONE_OFFSET_MS = TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000;

// 하위 호환성을 위해 KST_OFFSET_HOURS와 KST_OFFSET_MS 유지
const KST_OFFSET_HOURS = TIMEZONE_OFFSET_HOURS;
const KST_OFFSET_MS = TIMEZONE_OFFSET_MS;

/**
 * 현재 한국 시간을 반환
 */
export function getCurrentKST(): Date {
  const nowUTC = new Date();
  return new Date(nowUTC.getTime() + KST_OFFSET_MS);
}

/**
 * 한국 시간 기준 오늘 날짜의 시작/끝 시간을 UTC로 변환
 * Supabase는 UTC로 저장되므로, 한국 시간 기준 오늘을 UTC로 변환해야 함
 * @returns { startISO: string, endISO: string } 오늘 날짜 범위 (UTC ISO 문자열)
 */
export function getTodayDateRangeUTC(): { startISO: string; endISO: string } {
  // 현재 한국 시간
  const nowKST = getCurrentKST();
  
  // 오늘 00:00:00 KST
  const todayStartKST = new Date(
    nowKST.getFullYear(),
    nowKST.getMonth(),
    nowKST.getDate(),
    0, 0, 0, 0
  );
  
  // 오늘 23:59:59.999 KST
  const todayEndKST = new Date(
    nowKST.getFullYear(),
    nowKST.getMonth(),
    nowKST.getDate(),
    23, 59, 59, 999
  );
  
  // KST를 UTC로 변환 (KST에서 9시간 빼기)
  const todayStartUTC = new Date(todayStartKST.getTime() - KST_OFFSET_MS);
  const todayEndUTC = new Date(todayEndKST.getTime() - KST_OFFSET_MS);
  
  return {
    startISO: todayStartUTC.toISOString(),
    endISO: todayEndUTC.toISOString()
  };
}

/**
 * UTC 시간을 한국 시간으로 변환
 * @param utcDate UTC 시간 문자열 또는 Date 객체
 * @returns 한국 시간 Date 객체
 */
export function convertUTCToKST(utcDate: string | Date): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/**
 * 한국 시간을 UTC로 변환
 * @param kstDate 한국 시간 Date 객체
 * @returns UTC 시간 Date 객체
 */
export function convertKSTToUTC(kstDate: Date): Date {
  return new Date(kstDate.getTime() - KST_OFFSET_MS);
}

/**
 * UTC 시간 문자열을 한국 시간 기준으로 포맷팅
 * @param utcDateString UTC 시간 문자열 (ISO 형식)
 * @param options Intl.DateTimeFormatOptions
 * @returns 포맷된 한국 시간 문자열
 */
export function formatKSTDate(
  utcDateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string {
  const kstDate = convertUTCToKST(utcDateString);
  return kstDate.toLocaleDateString('ko-KR', options);
}

/**
 * 현재 한국 시간을 ISO 문자열로 반환 (저장용)
 * 주의: Supabase는 UTC로 저장하므로, 이 함수는 클라이언트 측에서만 사용
 * 실제 저장 시에는 서버의 now() 또는 default now()를 사용하는 것이 권장됨
 */
export function getCurrentKSTISO(): string {
  const kst = getCurrentKST();
  // UTC로 변환하여 ISO 문자열 생성
  const utc = convertKSTToUTC(kst);
  return utc.toISOString();
}

