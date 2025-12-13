-- ============================================
-- Supabase 타임존 설정 (한국 시간대 고려)
-- 참고: Supabase는 UTC로 저장되지만, 한국 시간 기준으로 쿼리할 수 있도록 함수 제공
-- ============================================

-- 1. 한국 시간대(Asia/Seoul) 기준 현재 시간을 반환하는 함수
CREATE OR REPLACE FUNCTION now_kst()
RETURNS timestamptz AS $$
BEGIN
  -- 현재 시간을 한국 시간대로 변환
  -- PostgreSQL의 timezone 함수를 사용하여 UTC를 KST로 변환
  RETURN (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. 한국 시간 기준 오늘 날짜의 시작 시간 (00:00:00 KST)을 UTC로 반환
CREATE OR REPLACE FUNCTION today_start_kst_utc()
RETURNS timestamptz AS $$
DECLARE
  kst_now timestamptz;
  kst_today_start timestamptz;
BEGIN
  -- 현재 시간을 한국 시간대로 변환
  kst_now := (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
  
  -- 오늘 00:00:00 KST
  kst_today_start := date_trunc('day', kst_now);
  
  -- KST를 UTC로 변환하여 반환
  RETURN kst_today_start AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. 한국 시간 기준 오늘 날짜의 끝 시간 (23:59:59.999 KST)을 UTC로 반환
CREATE OR REPLACE FUNCTION today_end_kst_utc()
RETURNS timestamptz AS $$
DECLARE
  kst_now timestamptz;
  kst_today_end timestamptz;
BEGIN
  -- 현재 시간을 한국 시간대로 변환
  kst_now := (NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
  
  -- 오늘 23:59:59.999 KST
  kst_today_end := date_trunc('day', kst_now) + INTERVAL '1 day' - INTERVAL '1 millisecond';
  
  -- KST를 UTC로 변환하여 반환
  RETURN kst_today_end AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. UTC timestamptz를 한국 시간 문자열로 포맷팅하는 함수
CREATE OR REPLACE FUNCTION format_kst(timestamp_utc timestamptz, format_pattern text DEFAULT 'YYYY-MM-DD HH24:MI:SS')
RETURNS text AS $$
BEGIN
  -- UTC를 한국 시간대로 변환하여 포맷팅
  RETURN to_char(timestamp_utc AT TIME ZONE 'Asia/Seoul', format_pattern);
END;
$$ LANGUAGE plpgsql STABLE;

-- 사용 예시:
-- SELECT now_kst(); -- 현재 한국 시간
-- SELECT today_start_kst_utc(); -- 오늘 00:00:00 KST (UTC로 변환)
-- SELECT today_end_kst_utc(); -- 오늘 23:59:59.999 KST (UTC로 변환)
-- SELECT format_kst(created_at) FROM swipes; -- 한국 시간으로 포맷팅

-- 참고: 
-- - Supabase는 여전히 UTC로 저장됩니다 (이것이 표준입니다)
-- - 이 함수들은 쿼리 시 한국 시간 기준으로 필터링하거나 포맷팅할 때 사용합니다
-- - 클라이언트에서도 한국 시간을 UTC로 변환하여 저장할 수 있습니다

