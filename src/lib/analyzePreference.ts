import { getSupabaseClient } from './supabaseClient';
import { analyzeUserPreference, SwipeData } from './groqClient';
import { saveUserPreference, fetchUserPreference } from './supabaseUserPreferences';

/**
 * 사용자의 스와이프 데이터를 수집하고 취향을 분석합니다.
 * 최초 5번의 스와이프에서만 분석을 수행합니다.
 */
export async function analyzeUserPreferenceFromSwipes(
  userId: string,
  deviceId: string,
  groqApiKey: string
): Promise<{ preference: string | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { preference: null, error: new Error('Supabase client not configured') };

  try {
    // 이미 분석했는지 확인
    const { data: existingPreference } = await fetchUserPreference(userId, deviceId);
    if (existingPreference) {
      console.log('[Preference Analysis] Already analyzed, skipping.');
      return { preference: existingPreference.preference_text, error: null };
    }

    // 사용자의 모든 스와이프 데이터 가져오기
    let query = supabase
      .from('swipes')
      .select('card_id, direction')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // 최근 10개만 사용

    const { data: swipes, error: swipesError } = await query;

    if (swipesError) throw swipesError;

    // 정확히 5번일 때만 분석 (최초 5번의 스와이프)
    if (!swipes || swipes.length !== 5) {
      return { preference: null, error: null };
    }

    // 카드 정보 가져오기
    const cardIds = swipes.map((s) => s.card_id);
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('id, name, tag, city')
      .in('id', cardIds);

    if (cardsError) throw cardsError;

    // 스와이프 데이터와 카드 정보 매칭
    const cardMap = new Map(cards?.map((c) => [String(c.id), c]) || []);
    const swipeData: SwipeData[] = swipes
      .map((swipe) => {
        const card = cardMap.get(String(swipe.card_id));
        if (!card) return null;
        return {
          name: card.name ?? '',
          tag: card.tag ?? undefined,
          city: card.city ?? undefined,
          direction: swipe.direction === 'like' ? 'like' : 'nope',
        } as SwipeData;
      })
      .filter((item): item is SwipeData => item !== null);

    if (swipeData.length === 0) {
      return { preference: null, error: new Error('No alid swipve data found') };
    }

    // Groq API로 취향 분석
    const { preference, error: groqError } = await analyzeUserPreference(swipeData, groqApiKey);

    if (groqError || !preference) {
      return { preference: null, error: groqError };
    }

    // Supabase에 저장
    const { error: saveError } = await saveUserPreference(userId, deviceId, preference);

    if (saveError) {
      return { preference, error: saveError };
    }

    return { preference, error: null };
  } catch (err) {
    return { preference: null, error: err as Error };
  }
}

