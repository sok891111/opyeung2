import { getSupabaseClient } from './supabaseClient';
import { Comment } from '../types/comment';

export async function fetchUserComments(
  userId: string,
  deviceId: string
): Promise<{ data: Comment[]; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: new Error('Supabase client not configured') };

  try {
    // userId가 있으면 userId로 필터링, 없으면 deviceId로 필터링
    let query = supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data: comments, error: commentsError } = await query;

    if (commentsError) throw commentsError;

    if (!comments || comments.length === 0) {
      return { data: [], error: null };
    }

    const commentIds = comments.map((c) => c.id);

    // 댓글의 좋아요/싫어요 반응 가져오기
    const { data: reactions, error: reactionsError } = await supabase
      .from('comment_reactions')
      .select('*')
      .in('comment_id', commentIds);

    if (reactionsError) throw reactionsError;

    const reactionMap = new Map<string, 'like' | 'nope'>();
    (reactions || []).forEach((r) => {
      reactionMap.set(r.comment_id, r.reaction);
    });

    return {
      data: comments.map((c) => ({
        id: c.id,
        card_id: c.card_id,
        user_id: c.user_id,
        device_id: c.device_id,
        content: c.content,
        like_count: c.like_count || 0,
        nope_count: c.nope_count || 0,
        created_at: c.created_at,
        updated_at: c.updated_at,
        user_reaction: reactionMap.get(c.id),
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}




