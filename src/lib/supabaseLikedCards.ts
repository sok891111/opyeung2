import { getSupabaseClient } from './supabaseClient';
import { SwipeCard } from '../components/PageTurnCardStack';

export async function fetchLikedCards(userId: string, deviceId: string): Promise<{ data: SwipeCard[]; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: new Error('Supabase client not configured') };

  try {
    // 모든 좋아요한 카드 ID 목록 가져오기 (userId 우선, 없으면 deviceId 사용)
    let query = supabase
      .from('swipes')
      .select('card_id')
      .eq('direction', 'like')
      .order('created_at', { ascending: false });

    // userId가 있으면 userId로 필터링, 없으면 deviceId로 필터링
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data: swipes, error: swipesError } = await query;

    if (swipesError) throw swipesError;

    if (!swipes || swipes.length === 0) {
      return { data: [], error: null };
    }

    const cardIds = swipes.map((s) => s.card_id);

    // 카드 정보 가져오기
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('id,name,age,city,about,image,tag,instagram_url,description,ai_tags')
      .in('id', cardIds);

    if (cardsError) throw cardsError;

    // 원래 순서 유지
    const cardMap = new Map(cards?.map((c) => [String(c.id), c]) || []);
    const orderedCards = cardIds
      .map((id) => cardMap.get(String(id)))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .map((row) => ({
        id: String(row.id),
        name: row.name ?? '',
        age: Number(row.age ?? 0),
        city: row.city ?? '',
        about: row.about ?? '',
        image: row.image ?? '',
        tag: row.tag ?? undefined,
        instagramUrl: row.instagram_url ?? undefined,
        description: row.description ?? undefined,
        aiTags: row.ai_tags ?? undefined,
      }));

    return { data: orderedCards, error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

