import { getSupabaseClient } from './supabaseClient';

export type CardStats = {
  likeCount: number;
  nopeCount: number;
  commentCount: number;
};

export async function fetchCardStats(cardId: string): Promise<{ data: CardStats | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };

  try {
    // 좋아요 개수 조회 (정확한 count 사용)
    const { count: likeCount, error: likeError } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('card_id', cardId)
      .eq('direction', 'like');

    if (likeError) throw likeError;

    // 싫어요 개수 조회 (정확한 count 사용)
    const { count: nopeCount, error: nopeError } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('card_id', cardId)
      .eq('direction', 'nope');

    if (nopeError) throw nopeError;

    // 댓글 개수 조회
    const { count: commentCount, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('card_id', cardId);

    if (commentsError) throw commentsError;

    return {
      data: {
        likeCount: likeCount || 0,
        nopeCount: nopeCount || 0,
        commentCount: commentCount || 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

