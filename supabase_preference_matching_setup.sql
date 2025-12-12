-- ============================================
-- 사용자 취향 기반 상품 매칭을 위한 PostgreSQL 함수 및 인덱스 설정
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- 1. ai_tags 컬럼에 대한 GIN 인덱스 생성 (태그 검색 성능 향상)
-- ai_tags가 텍스트 타입인 경우를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_cards_ai_tags_gin ON public.cards USING gin(to_tsvector('simple', coalesce(ai_tags, '')));

-- ai_tags가 배열 타입으로 변경된 경우를 위한 인덱스 (선택사항)
-- ALTER TABLE public.cards ALTER COLUMN ai_tags TYPE text[] USING string_to_array(ai_tags, ',');
-- CREATE INDEX IF NOT EXISTS idx_cards_ai_tags_array ON public.cards USING gin(ai_tags);

-- 2. 매칭 점수를 계산하는 PostgreSQL 함수
-- 이 함수는 사용자 태그 배열과 카드의 ai_tags를 비교하여 매칭 점수를 반환합니다
CREATE OR REPLACE FUNCTION calculate_tag_match_score(
  card_tags TEXT,
  user_tags TEXT[]
) RETURNS FLOAT AS $$
DECLARE
  card_tag_array TEXT[];
  matched_count INT := 0;
  total_user_tags INT;
BEGIN
  -- NULL 체크
  IF card_tags IS NULL OR array_length(user_tags, 1) IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- 카드 태그를 배열로 변환 (쉼표로 구분)
  card_tag_array := string_to_array(lower(trim(card_tags)), ',');
  
  -- 각 태그의 공백 제거 및 소문자 변환
  card_tag_array := array(
    SELECT lower(trim(unnest(card_tag_array)))
  );
  
  total_user_tags := array_length(user_tags, 1);
  
  -- 매칭되는 태그 수 계산
  SELECT COUNT(*) INTO matched_count
  FROM unnest(user_tags) AS user_tag
  WHERE EXISTS (
    SELECT 1
    FROM unnest(card_tag_array) AS card_tag
    WHERE lower(trim(user_tag)) = card_tag
       OR card_tag LIKE '%' || lower(trim(user_tag)) || '%'
       OR lower(trim(user_tag)) LIKE '%' || card_tag || '%'
  );
  
  -- 매칭 점수 반환 (매칭된 태그 수 / 전체 사용자 태그 수)
  IF total_user_tags > 0 THEN
    RETURN matched_count::FLOAT / total_user_tags::FLOAT;
  ELSE
    RETURN 0.0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. 사용자 취향 기반으로 카드를 조회하는 함수
-- 이 함수는 사용자 태그와 본 상품 ID 목록을 받아서 매칭 점수 순으로 정렬된 카드를 반환합니다
CREATE OR REPLACE FUNCTION get_preference_based_cards(
  p_user_tags TEXT[],
  p_viewed_card_ids TEXT[],
  p_limit INT DEFAULT 30
) RETURNS TABLE (
  id TEXT,
  name TEXT,
  age INT,
  city TEXT,
  about TEXT,
  image TEXT,
  tag TEXT,
  instagram_url TEXT,
  description TEXT,
  ai_tags TEXT,
  match_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id::TEXT,
    c.name,
    c.age,
    c.city,
    c.about,
    c.image,
    c.tag,
    c.instagram_url,
    c.description,
    c.ai_tags,
    calculate_tag_match_score(c.ai_tags, p_user_tags) AS match_score
  FROM public.cards c
  WHERE 
    -- 본 상품 제외
    (p_viewed_card_ids IS NULL OR array_length(p_viewed_card_ids, 1) IS NULL 
     OR c.id::TEXT != ALL(p_viewed_card_ids))
    -- 매칭 점수가 0보다 큰 경우만 (선택사항)
    -- AND calculate_tag_match_score(c.ai_tags, p_user_tags) > 0
  ORDER BY 
    match_score DESC,
    c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. 성능 최적화를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON public.cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cards_id ON public.cards(id);

-- 5. 함수 사용 예시 (주석 처리됨)
-- SELECT * FROM get_preference_based_cards(
--   ARRAY['데일리', '캐주얼', '미니멀']::TEXT[],  -- 사용자 태그
--   ARRAY['card1', 'card2']::TEXT[],              -- 본 상품 ID 목록
--   30                                             -- 반환할 카드 수
-- );

