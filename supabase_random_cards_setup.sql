-- 랜덤 카드 조회 함수
-- 본 상품을 제외하고 랜덤하게 카드를 조회합니다.

CREATE OR REPLACE FUNCTION get_random_cards(
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
  ai_tags TEXT
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
    c.ai_tags
  FROM public.cards c
  WHERE 
    -- 본 상품 제외
    (p_viewed_card_ids IS NULL OR array_length(p_viewed_card_ids, 1) IS NULL 
     OR c.id::TEXT != ALL(p_viewed_card_ids))
  ORDER BY RANDOM()  -- PostgreSQL의 RANDOM() 함수 사용
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

