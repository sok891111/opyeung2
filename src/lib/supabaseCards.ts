import { getSupabaseClient } from "./supabaseClient";
import { SwipeCard } from "../components/PageTurnCardStack";

export const fetchCards = async (
  userId?: string,
  deviceId?: string
): Promise<{ data: SwipeCard[]; error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: new Error("Supabase client not configured") };

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

  // 카드 조회
  const { data: allCards, error } = await client
    .from("cards")
    .select("id,name,age,city,about,image,tag,instagram_url")
    .order("created_at", { ascending: false })
    .limit(100); // 본 상품 제외를 위해 더 많이 가져옴

  if (error || !allCards) {
    return { data: [], error: error ? new Error(error.message) : new Error("No data") };
  }

  // 본 상품 제외 (JavaScript에서 필터링)
  const filteredCards = viewedCardIds.length > 0
    ? allCards.filter((card) => !viewedCardIds.includes(String(card.id)))
    : allCards;

  // 최대 30개로 제한
  const data = filteredCards.slice(0, 30);

  const mapped: SwipeCard[] = data.map((row) => ({
    id: String(row.id),
    name: row.name ?? "",
    age: Number(row.age ?? 0),
    city: row.city ?? "",
    about: row.about ?? "",
    image: row.image ?? "",
    tag: row.tag ?? undefined,
    instagramUrl: row.instagram_url ?? undefined
  }));

  return { data: mapped, error: null };
};


