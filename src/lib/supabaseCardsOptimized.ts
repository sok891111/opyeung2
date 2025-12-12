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
  
  // 마지막 줄에서 쉼표로 구분된 태그 추출
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
 * TF-IDF 기반 PostgreSQL 함수를 사용한 최적화된 카드 조회
 * supabase_tfidf_setup.sql을 먼저 실행해야 합니다.
 * TF-IDF 함수가 없으면 기본 매칭 함수로 폴백합니다.
 */
export const fetchCardsOptimized = async (
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
  let hasPreference = false;
  if (userId && deviceId) {
    try {
      const { data: preference } = await fetchUserPreference(userId, deviceId);
      if (preference?.preference_text) {
        hasPreference = true;
        userTags = extractUserTags(preference.preference_text);
        console.log('[fetchCardsOptimized] User has preference analysis. Tags:', userTags);
      } else {
        console.log('[fetchCardsOptimized] No user preference found. Using default card order.');
      }
    } catch (err) {
      console.warn("Failed to fetch user preference:", err);
    }
  }

  // 본 상품 ID 목록 가져오기
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

  // 사용자 취향이 있는 경우: TF-IDF 기반 PostgreSQL 함수 사용
  if (userTags.length > 0) {
    console.log(`[fetchCardsOptimized] Fetching preference-based cards for user with ${userTags.length} preference tags`);
    try {
      // 먼저 TF-IDF 기반 함수 시도
      const { data: tfidfData, error: tfidfError } = await client.rpc('get_tfidf_based_cards', {
        p_user_tags: userTags,
        p_viewed_card_ids: viewedCardIds.length > 0 ? viewedCardIds : null,
        p_limit: 30
      });

      if (!tfidfError && tfidfData && tfidfData.length > 0) {
        const mapped: SwipeCard[] = tfidfData.map((row: any) => ({
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

        console.log(`[fetchCardsOptimized] ✅ Retrieved ${mapped.length} preference-based cards using TF-IDF (sorted by match score)`);
        return { data: mapped, error: null };
      }

      // TF-IDF 함수가 없거나 에러 발생 시 기존 함수로 폴백
      console.warn('TF-IDF function not available, falling back to basic preference matching:', tfidfError?.message);
      const { data, error } = await client.rpc('get_preference_based_cards', {
        p_user_tags: userTags,
        p_viewed_card_ids: viewedCardIds.length > 0 ? viewedCardIds : null,
        p_limit: 30
      });

      if (error) {
        console.error('RPC function error:', error);
        // 함수가 없으면 기존 방식으로 폴백
        return await fetchCardsFallback(userId, deviceId);
      }

      if (!data || data.length === 0) {
        return { data: [], error: null };
      }

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

      console.log(`[fetchCardsOptimized] ✅ Retrieved ${mapped.length} preference-based cards using basic PostgreSQL function (sorted by match score)`);
      return { data: mapped, error: null };
    } catch (err) {
      console.error('Error calling RPC function:', err);
      // 에러 발생 시 기존 방식으로 폴백
      return await fetchCardsFallback(userId, deviceId);
    }
  }

  // 사용자 취향이 없는 경우: 랜덤 순서로 조회
  console.log('[fetchCardsOptimized] No user preference found. Fetching cards in random order.');
  return await fetchCardsFallback(userId, deviceId);
};

/**
 * 기존 방식으로 폴백 (PostgreSQL 함수가 없거나 에러 발생 시)
 */
async function fetchCardsFallback(
  userId?: string,
  deviceId?: string
): Promise<{ data: SwipeCard[]; error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: [], error: new Error("Supabase client not configured") };
  }

  // 본 상품 ID 목록 가져오기
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

  // PostgreSQL RPC 함수를 사용하여 랜덤하게 조회
  try {
    const { data: randomCards, error: rpcError } = await client.rpc('get_random_cards', {
      p_viewed_card_ids: viewedCardIds.length > 0 ? viewedCardIds : null,
      p_limit: 30
    });

    if (!rpcError && randomCards && randomCards.length > 0) {
      const mapped: SwipeCard[] = randomCards.map((row: any) => ({
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

      console.log(`[fetchCardsFallback] Retrieved ${mapped.length} random cards from database`);
      return { data: mapped, error: null };
    }

    // RPC 함수가 없거나 에러 발생 시 기존 방식으로 폴백
    if (rpcError) {
      console.warn('RPC function get_random_cards not available, falling back to client-side random:', rpcError.message);
    }
  } catch (err) {
    console.warn('Error calling get_random_cards RPC, falling back to client-side random:', err);
  }

  // 폴백: 클라이언트 측에서 랜덤하게 섞기
  let query = client
    .from("cards")
    .select("id,name,age,city,about,image,tag,instagram_url,description,ai_tags")
    .limit(1000);

  const { data: allCards, error } = await query;

  if (error || !allCards) {
    return { data: [], error: error ? new Error(error.message) : new Error("No data") };
  }

  // 본 상품 제외
  const filteredCards = viewedCardIds.length > 0
    ? allCards.filter((card) => !viewedCardIds.includes(String(card.id)))
    : allCards;

  // 랜덤하게 섞기 (Fisher-Yates shuffle 알고리즘)
  const shuffled = [...filteredCards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 최대 30개로 제한
  const data = shuffled.slice(0, 30);

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
}

