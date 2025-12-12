import { getSupabaseClient } from "./supabaseClient";
import { SwipeCard } from "../components/PageTurnCardStack";

/**
 * 랜덤한 상품 5개를 가져옵니다 (취향 재분석용)
 */
export const fetchRandomCards = async (
  userId?: string,
  deviceId?: string,
  count: number = 5
): Promise<{ data: SwipeCard[]; error: Error | null }> => {
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

  // 충분한 수의 카드 가져오기 (랜덤 선택을 위해)
  const { data: allCards, error } = await client
    .from("cards")
    .select("id,name,age,city,about,image,tag,instagram_url,description,ai_tags")
    .limit(1000); // 충분한 수를 가져와서 랜덤 선택

  if (error || !allCards) {
    return { data: [], error: error ? new Error(error.message) : new Error("No data") };
  }

  // 본 상품 제외
  const filteredCards = viewedCardIds.length > 0
    ? allCards.filter((card) => !viewedCardIds.includes(String(card.id)))
    : allCards;

  // 랜덤하게 섞기
  const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);

  // 요청한 개수만큼 선택
  const selectedCards = shuffled.slice(0, count);

  const mapped: SwipeCard[] = selectedCards.map((row: any) => ({
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

  console.log(`[fetchRandomCards] Retrieved ${mapped.length} random cards for preference re-analysis`);
  return { data: mapped, error: null };
};

