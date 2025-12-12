-- ============================================
-- Vector DB (pgvector)를 사용한 상품 추천 시스템 설정
-- Supabase는 pgvector 확장을 지원합니다
-- ============================================

-- 1. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ai_tags를 벡터로 변환하기 위한 임베딩 컬럼 추가
-- 주의: 실제 임베딩은 애플리케이션 레벨에서 생성해야 합니다
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS ai_tags_embedding vector(1536); -- OpenAI embedding dimension (text-embedding-ada-002)

-- 3. 벡터 인덱스 생성 (HNSW 인덱스 - 빠른 유사도 검색)
CREATE INDEX IF NOT EXISTS idx_cards_ai_tags_embedding_hnsw 
ON public.cards 
USING hnsw (ai_tags_embedding vector_cosine_ops);

-- 4. 사용자 취향 임베딩을 저장할 컬럼 추가 (user_preferences 테이블)
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS preference_embedding vector(1536);

-- 5. 코사인 유사도를 사용한 상품 추천 함수
CREATE OR REPLACE FUNCTION get_vector_similarity_cards(
  p_user_embedding vector(1536),
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
  similarity FLOAT
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
    1 - (c.ai_tags_embedding <=> p_user_embedding) AS similarity  -- 코사인 거리를 유사도로 변환
  FROM public.cards c
  WHERE 
    c.ai_tags_embedding IS NOT NULL
    AND (p_viewed_card_ids IS NULL OR array_length(p_viewed_card_ids, 1) IS NULL 
         OR c.id::TEXT != ALL(p_viewed_card_ids))
  ORDER BY 
    c.ai_tags_embedding <=> p_user_embedding  -- 벡터 거리 기준 정렬
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. 사용 예시 (주석 처리됨)
-- 임베딩은 애플리케이션에서 생성해야 합니다:
-- 1. 사용자 취향 텍스트를 OpenAI API로 임베딩 생성
-- 2. 생성된 임베딩을 user_preferences.preference_embedding에 저장
-- 3. 상품의 ai_tags를 OpenAI API로 임베딩 생성
-- 4. 생성된 임베딩을 cards.ai_tags_embedding에 저장
-- 5. get_vector_similarity_cards 함수로 유사한 상품 조회

