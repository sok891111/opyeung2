import { getSupabaseClient } from './supabaseClient';

export type UserPreference = {
  id: string;
  user_id: string;
  device_id: string;
  preference_text: string;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
};

export async function fetchUserPreference(
  userId: string,
  deviceId: string
): Promise<{ data: UserPreference | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };

  try {
    // userId로 먼저 조회, 없으면 deviceId로 조회
    let query = supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();

    const { data, error } = await query;

    if (error) throw error;

    if (!data) {
      // deviceId로 재조회
      const { data: deviceData, error: deviceError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (deviceError) throw deviceError;
      return { data: deviceData, error: null };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function saveUserPreference(
  userId: string,
  deviceId: string,
  preferenceText: string
): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: new Error('Supabase client not configured') };

  try {
    // 기존 preference 확인
    const { data: existing, error: fetchError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러이므로 무시
      throw fetchError;
    }

    if (existing) {
      // 업데이트
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
          preference_text: preferenceText,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else {
      // 새로 생성
      const { error: insertError } = await supabase.from('user_preferences').insert({
        user_id: userId,
        device_id: deviceId,
        preference_text: preferenceText,
        analyzed_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

