import { getSupabaseClient } from "./supabaseClient";
import { SwipeCard } from "../components/PageTurnCardStack";
import { fetchUserPreference } from "./supabaseUserPreferences";

/**
 * 사용자 취향 텍스트에서 태그 추출
 * #태그 형태 또는 쉼표로 구분된 태그를 추출
 */
function extractUserTags(preferenceText: string): string[] {
  if (!preferenceText) return [];
  
  // #태그 형태 추출
  const hashTags = preferenceText.match(/#([^\s#]+)/g) || [];
  const hashTagList = hashTags.map(tag => tag.replace('#', '').trim());
  
  // 마지막 줄에서 쉼표로 구분된 태그 추출 (일반적으로 마지막 줄에 태그가 있음)
  const lines = preferenceText.split('\n').filter(line => line.trim());
  const lastLine = lines[lines.length - 1] || '';
  
  // #이 없는 경우 마지막 줄을 쉼표로 분리
  if (!lastLine.includes('#')) {
    const commaTags = lastLine.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    return [...hashTagList, ...commaTags];
  }
  
  return hashTagList;
}

/**
 * 카드의 ai_tags와 사용자 태그 매칭 점수 계산
 */
function calculateMatchScore(cardAiTags: string | null | undefined, userTags: string[]): number {
  if (!cardAiTags || userTags.length === 0) return 0;
  
  // ai_tags를 쉼표로 분리하고 정규화 (공백 제거, 소문자 변환)
  const cardTags = cardAiTags
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);
  
  // 사용자 태그도 정규화
  const normalizedUserTags = userTags.map(tag => tag.trim().toLowerCase());
  
  // 매칭되는 태그 수 계산
  const matchedTags = normalizedUserTags.filter(userTag => 
    cardTags.some(cardTag => 
      cardTag.includes(userTag) || userTag.includes(cardTag)
    )
  );
  
  // 매칭 점수: 매칭된 태그 수 / 전체 사용자 태그 수
  return matchedTags.length / userTags.length;
}

export const fetchCards = async (
  userId?: string,
  deviceId?: string
): Promise<{ data: SwipeCard[]; error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn("Supabase client not configured. Please check your .env.local file.");
    return { data: [], error: new Error("Supabase client not configured") };
  }

  // 사용자 취향 정보 가져오기
  let userTags: string[] = [];
  if (userId && deviceId) {
    try {
      const { data: preference } = await fetchUserPreference(userId, deviceId);
      if (preference?.preference_text) {
        userTags = extractUserTags(preference.preference_text);
        console.log('[fetchCards] User preference tags:', userTags);
      }
    } catch (err) {
      console.warn("Failed to fetch user preference:", err);
    }
  }

  // 본 상품 ID 목록 가져오기 (userId 우선, 없으면 deviceId 사용)
  let viewedCardIds: string[] = [];
  if (userId || deviceId) {
    try {
      let query = client
        .from("swipes")
        .select("card_id");

      if (userId) {
        query = query.eq("user_id", userId);
      } else if (deviceId) {
        query = query.eq("device_id", deviceId);
      }

      const { data: swipes, error: swipesError } = await query;

      if (!swipesError && swipes) {
        viewedCardIds = swipes.map((s) => String(s.card_id));
      }
    } catch (err) {
      console.warn("Failed to fetch viewed cards:", err);
    }
  }

  // 사용자 취향이 있는 경우: 전체 상품을 대상으로 선호도 매칭
  // 사용자 취향이 없는 경우: 최신순으로 100개만 가져옴
  const hasUserPreference = userTags.length > 0;
  const fetchLimit = hasUserPreference ? 10000 : 100; // 취향이 있으면 전체 조회, 없으면 100개만

  // 카드 조회 (description과 ai_tags 포함)
  let query = client
    .from("cards")
    .select("id,name,age,city,about,image,tag,instagram_url,description,ai_tags");
  
  // 취향이 없을 때만 최신순 정렬 (취향이 있으면 나중에 매칭 점수로 정렬)
  if (!hasUserPreference) {
    query = query.order("created_at", { ascending: false });
  }
  
  const { data: allCards, error } = await query.limit(fetchLimit);

  if (error || !allCards) {
    return { data: [], error: error ? new Error(error.message) : new Error("No data") };
  }

  // 본 상품 제외 (JavaScript에서 필터링)
  let filteredCards = viewedCardIds.length > 0
    ? allCards.filter((card) => !viewedCardIds.includes(String(card.id)))
    : allCards;

  // 사용자 취향이 있는 경우: 전체 상품 중에서 매칭 점수 계산 및 정렬
  if (hasUserPreference) {
    type CardWithScore = typeof filteredCards[0] & { _matchScore: number };
    const cardsWithScore: CardWithScore[] = filteredCards.map(card => ({
      ...card,
      _matchScore: calculateMatchScore(card.ai_tags, userTags)
    }));
    
    cardsWithScore.sort((a, b) => {
      // 매칭 점수가 높은 순으로 정렬
      if (b._matchScore !== a._matchScore) {
        return b._matchScore - a._matchScore;
      }
      // 매칭 점수가 같으면 최신순
      return 0;
    });
    
    // _matchScore 제거하고 원래 형태로 복원
    filteredCards = cardsWithScore.map(({ _matchScore, ...card }) => card);
    
    console.log(`[fetchCards] Analyzed ${filteredCards.length} cards, sorted by preference match score`);
  }

  // 최대 30개로 제한
  const data = filteredCards.slice(0, 30);

  const mapped: SwipeCard[] = data.map((row: any) => ({
    id: String(row.id),
    name: row.name ?? "",
    age: Number(row.age ?? 0),
    city: row.city ?? "",
    about: row.about ?? "",
    image: row.image ?? "",
    tag: row.tag ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    description: row.description ?? undefined,
    aiTags: row.ai_tags ?? undefined
  }));

  return { data: mapped, error: null };
};


