-- ============================================
-- TF-IDF 기반 상품 추천 시스템 설정
-- Term Frequency-Inverse Document Frequency를 사용한 정교한 매칭 점수 계산
-- ============================================

-- 1. 태그별 IDF (Inverse Document Frequency) 테이블 생성
CREATE TABLE IF NOT EXISTS public.tag_idf (
  tag TEXT PRIMARY KEY,
  document_count INT NOT NULL DEFAULT 0,  -- 해당 태그를 가진 카드 수
  idf_score FLOAT NOT NULL DEFAULT 0.0,     -- IDF 점수
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tag_idf_tag ON public.tag_idf(tag);
CREATE INDEX IF NOT EXISTS idx_tag_idf_score ON public.tag_idf(idf_score DESC);

-- 2. 전체 카드 수를 저장하는 테이블 (성능 최적화)
CREATE TABLE IF NOT EXISTS public.card_statistics (
  id INT PRIMARY KEY DEFAULT 1,
  total_cards INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 초기값 설정
INSERT INTO public.card_statistics (id, total_cards)
VALUES (1, (SELECT COUNT(*) FROM public.cards))
ON CONFLICT (id) DO UPDATE SET 
  total_cards = (SELECT COUNT(*) FROM public.cards),
  updated_at = NOW();

-- 3. 카드의 ai_tags를 태그 배열로 분리하는 헬퍼 함수
CREATE OR REPLACE FUNCTION extract_tags_from_text(tag_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  tag_array TEXT[];
  cleaned_tags TEXT[];
BEGIN
  IF tag_text IS NULL OR trim(tag_text) = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  -- 쉼표로 분리
  tag_array := string_to_array(tag_text, ',');
  
  -- 공백 제거, 소문자 변환, 빈 문자열 제거
  SELECT array_agg(DISTINCT lower(trim(tag)))
  INTO cleaned_tags
  FROM unnest(tag_array) AS tag
  WHERE trim(tag) != '';
  
  -- NULL 체크
  IF cleaned_tags IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  RETURN cleaned_tags;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. IDF 점수를 계산하는 함수
CREATE OR REPLACE FUNCTION calculate_idf_score(
  p_tag TEXT,
  p_total_cards INT
) RETURNS FLOAT AS $$
DECLARE
  v_document_count INT;
BEGIN
  -- 해당 태그를 가진 카드 수 계산
  SELECT COUNT(*) INTO v_document_count
  FROM public.cards
  WHERE ai_tags IS NOT NULL
    AND ai_tags != ''
    AND (
      -- 태그가 정확히 일치하거나 포함되는 경우
      lower(ai_tags) LIKE '%' || lower(trim(p_tag)) || '%'
    );
  
  -- IDF 계산: log(전체 카드 수 / (태그를 가진 카드 수 + 1))
  -- +1은 0으로 나누는 것을 방지하기 위함
  IF v_document_count = 0 OR p_total_cards = 0 THEN
    RETURN 0.0;
  END IF;
  
  RETURN ln(p_total_cards::FLOAT / (v_document_count::FLOAT + 1.0));
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. 모든 태그의 IDF 점수를 계산하고 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_all_tag_idf()
RETURNS VOID AS $$
DECLARE
  v_total_cards INT;
  v_tag TEXT;
  v_document_count INT;
  v_idf_score FLOAT;
BEGIN
  -- 전체 카드 수 가져오기
  SELECT COUNT(*) INTO v_total_cards FROM public.cards;
  
  -- 통계 테이블 업데이트
  UPDATE public.card_statistics 
  SET total_cards = v_total_cards, updated_at = NOW()
  WHERE id = 1;
  
  -- 기존 태그 IDF 초기화
  TRUNCATE TABLE public.tag_idf;
  
  -- 모든 카드의 ai_tags에서 고유 태그 추출
  -- 서브쿼리를 사용하여 태그 배열을 먼저 생성한 후 unnest
  FOR v_tag IN
    SELECT DISTINCT tag
    FROM (
      SELECT unnest(extract_tags_from_text(ai_tags)) AS tag
      FROM public.cards
      WHERE ai_tags IS NOT NULL AND ai_tags != ''
    ) AS all_tags
    WHERE tag IS NOT NULL AND tag != ''
  LOOP
    -- 해당 태그를 가진 카드 수 계산
    SELECT COUNT(*) INTO v_document_count
    FROM public.cards
    WHERE ai_tags IS NOT NULL
      AND ai_tags != ''
      AND lower(ai_tags) LIKE '%' || lower(trim(v_tag)) || '%';
    
    -- IDF 점수 계산
    IF v_document_count > 0 AND v_total_cards > 0 THEN
      v_idf_score := ln(v_total_cards::FLOAT / (v_document_count::FLOAT + 1.0));
      
      -- 태그 IDF 테이블에 저장
      INSERT INTO public.tag_idf (tag, document_count, idf_score, updated_at)
      VALUES (lower(trim(v_tag)), v_document_count, v_idf_score, NOW())
      ON CONFLICT (tag) DO UPDATE SET
        document_count = v_document_count,
        idf_score = v_idf_score,
        updated_at = NOW();
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated IDF scores for all tags. Total cards: %, Total tags: %', 
    v_total_cards, (SELECT COUNT(*) FROM public.tag_idf);
END;
$$ LANGUAGE plpgsql;

-- 6. 카드의 TF-IDF 점수를 계산하는 함수
CREATE OR REPLACE FUNCTION calculate_tfidf_score(
  card_tags TEXT,
  user_tags TEXT[]
) RETURNS FLOAT AS $$
DECLARE
  card_tag_array TEXT[];
  user_tag TEXT;
  matched_score FLOAT := 0.0;
  tag_idf FLOAT;
  tag_tf FLOAT;
  total_card_tags INT;
  matched_card_tag TEXT;
BEGIN
  -- NULL 체크
  IF card_tags IS NULL OR array_length(user_tags, 1) IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- 카드 태그를 배열로 변환
  card_tag_array := extract_tags_from_text(card_tags);
  total_card_tags := array_length(card_tag_array, 1);
  
  IF total_card_tags = 0 THEN
    RETURN 0.0;
  END IF;
  
  -- 각 사용자 태그에 대해 TF-IDF 점수 계산
  FOREACH user_tag IN ARRAY user_tags
  LOOP
    user_tag := lower(trim(user_tag));
    matched_card_tag := NULL;
    
    -- 정확 일치 확인
    IF user_tag = ANY(card_tag_array) THEN
      matched_card_tag := user_tag;
    ELSE
      -- 부분 일치 확인 (카드 태그가 사용자 태그를 포함하거나 그 반대)
      SELECT tag INTO matched_card_tag
      FROM unnest(card_tag_array) AS tag
      WHERE tag LIKE '%' || user_tag || '%'
         OR user_tag LIKE '%' || tag || '%'
      LIMIT 1;
    END IF;
    
    -- 매칭된 태그가 있으면 TF-IDF 점수 계산
    IF matched_card_tag IS NOT NULL THEN
      -- TF (Term Frequency): 카드에서 해당 태그의 빈도 (정규화)
      tag_tf := 1.0 / total_card_tags::FLOAT;
      
      -- IDF (Inverse Document Frequency): 태그 IDF 테이블에서 조회
      -- 매칭된 카드 태그의 IDF 사용 (사용자 태그가 아닌)
      SELECT idf_score INTO tag_idf
      FROM public.tag_idf
      WHERE tag = matched_card_tag;
      
      -- IDF가 없으면 사용자 태그로 재시도
      IF tag_idf IS NULL THEN
        SELECT idf_score INTO tag_idf
        FROM public.tag_idf
        WHERE tag = user_tag;
      END IF;
      
      -- IDF가 여전히 없으면 기본값 사용 (매칭은 되지만 IDF가 없는 경우)
      IF tag_idf IS NULL THEN
        tag_idf := 0.1; -- 0 대신 작은 값 사용하여 매칭된 카드가 우선순위를 갖도록
      END IF;
      
      -- TF-IDF 점수 누적
      matched_score := matched_score + (tag_tf * tag_idf);
    END IF;
  END LOOP;
  
  RETURN matched_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. TF-IDF 기반으로 카드를 조회하는 함수
CREATE OR REPLACE FUNCTION get_tfidf_based_cards(
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
  tfidf_score FLOAT
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
    calculate_tfidf_score(c.ai_tags, p_user_tags) AS tfidf_score
  FROM public.cards c
  WHERE 
    -- 본 상품 제외
    (p_viewed_card_ids IS NULL OR array_length(p_viewed_card_ids, 1) IS NULL 
     OR c.id::TEXT != ALL(p_viewed_card_ids))
    -- ai_tags가 있는 카드만 (NULL 체크)
    AND c.ai_tags IS NOT NULL
    AND trim(c.ai_tags) != ''
  ORDER BY 
    calculate_tfidf_score(c.ai_tags, p_user_tags) DESC,
    c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. 카드가 추가/업데이트될 때 IDF를 자동으로 업데이트하는 트리거 함수
CREATE OR REPLACE FUNCTION trigger_update_tag_idf()
RETURNS TRIGGER AS $$
BEGIN
  -- 카드가 추가되거나 ai_tags가 변경된 경우 IDF 업데이트
  -- 성능을 위해 비동기로 처리하거나, 주기적으로 배치 업데이트를 권장
  -- 여기서는 즉시 업데이트하지만, 프로덕션에서는 배치 작업을 권장합니다
  
  -- 배치 업데이트를 위해 주석 처리 (성능 고려)
  -- PERFORM update_all_tag_idf();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (선택사항 - 성능 고려하여 주석 처리)
-- CREATE TRIGGER cards_update_tag_idf_trigger
-- AFTER INSERT OR UPDATE OF ai_tags ON public.cards
-- FOR EACH ROW
-- EXECUTE FUNCTION trigger_update_tag_idf();

-- 9. 초기 IDF 데이터 생성
-- 카드가 이미 있는 경우 실행
DO $$
BEGIN
  PERFORM update_all_tag_idf();
END $$;

-- 10. RLS 정책 설정 (태그 IDF 테이블은 읽기 전용)
ALTER TABLE public.tag_idf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_statistics ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
DROP POLICY IF EXISTS "tag_idf read access" ON public.tag_idf;
CREATE POLICY "tag_idf read access" ON public.tag_idf
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "card_statistics read access" ON public.card_statistics;
CREATE POLICY "card_statistics read access" ON public.card_statistics
  FOR SELECT USING (true);

-- 11. 함수 사용 예시 (주석 처리됨)
-- SELECT * FROM get_tfidf_based_cards(
--   ARRAY['데일리', '캐주얼', '미니멀']::TEXT[],  -- 사용자 태그
--   ARRAY['card1', 'card2']::TEXT[],              -- 본 상품 ID 목록
--   30                                             -- 반환할 카드 수
-- );

-- 12. 디버깅 및 확인 쿼리

-- IDF 점수 확인 쿼리
-- SELECT tag, document_count, idf_score, updated_at
-- FROM public.tag_idf
-- ORDER BY idf_score DESC
-- LIMIT 20;

-- 전체 카드 수 확인
-- SELECT total_cards FROM public.card_statistics WHERE id = 1;

-- ai_tags가 있는 카드 수 확인
-- SELECT COUNT(*) FROM public.cards WHERE ai_tags IS NOT NULL AND trim(ai_tags) != '';

-- 태그 추출 함수 테스트
-- SELECT extract_tags_from_text('데일리,캐주얼,미니멀');

-- TF-IDF 점수 계산 테스트
-- SELECT calculate_tfidf_score('데일리,캐주얼', ARRAY['데일리', '캐주얼']::TEXT[]);

-- TF-IDF 기반 카드 조회 테스트 (본 상품 제외 없이)
-- SELECT * FROM get_tfidf_based_cards(
--   ARRAY['데일리', '캐주얼']::TEXT[],
--   NULL::TEXT[],
--   10
-- );

-- 13. 문제 해결: IDF 데이터가 없거나 부족한 경우를 위한 재생성 함수
CREATE OR REPLACE FUNCTION regenerate_tag_idf()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
BEGIN
  -- 기존 데이터 삭제
  TRUNCATE TABLE public.tag_idf;
  
  -- IDF 재생성
  PERFORM update_all_tag_idf();
  
  -- 결과 확인
  SELECT 'IDF regenerated. Total tags: ' || COUNT(*)::TEXT
  INTO v_result
  FROM public.tag_idf;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 14. IDF 자동 갱신 스케줄 (pg_cron 필요)
-- pg_cron 확장을 먼저 활성화해야 합니다.
-- 매일 새벽 3시 UTC에 IDF 재계산 (필요 시 크론 표현식 수정)
-- 기존 스케줄이 있으면 제거 후 생성
DO $$
BEGIN
  -- pg_cron 확장 확인 (없으면 경고)
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension is not enabled. Please enable pg_cron to schedule jobs.';
    RETURN;
  END IF;

  -- 기존 스케줄이 있으면 해제
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-tag-idf-daily') THEN
    PERFORM cron.unschedule('update-tag-idf-daily');
  END IF;

  -- 새 스케줄 등록: 매일 03:00 UTC
  PERFORM cron.schedule(
    'update-tag-idf-daily',
    '0 3 * * *',
    $cron$SELECT update_all_tag_idf();$cron$
  );
  RAISE NOTICE 'Scheduled update_all_tag_idf() daily at 03:00 UTC (job: update-tag-idf-daily)';
END;
$$;
