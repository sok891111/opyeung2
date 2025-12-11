import { getSupabaseClient } from './supabaseClient';
import { Comment } from '../types/comment';

export async function fetchComments(cardId: string): Promise<{ data: Comment[]; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: new Error('Supabase client not configured') };
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: (data || []).map((c) => ({
        id: c.id,
        card_id: c.card_id,
        user_id: c.user_id,
        device_id: c.device_id,
        content: c.content,
        like_count: c.like_count || 0,
        nope_count: c.nope_count || 0,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchCommentsWithReactions(
  cardId: string,
  deviceId: string
): Promise<{ data: Comment[]; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: [], error: new Error('Supabase client not configured') };
  
  try {
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false });

    if (commentsError) throw commentsError;

    if (!comments || comments.length === 0) {
      return { data: [], error: null };
    }

    const commentIds = comments.map((c) => c.id);

    const { data: reactions, error: reactionsError } = await supabase
      .from('comment_reactions')
      .select('*')
      .in('comment_id', commentIds)
      .eq('device_id', deviceId);

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

export async function createComment(
  cardId: string,
  content: string,
  deviceId: string,
  userId?: string
): Promise<{ data: Comment | null; error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        card_id: cardId,
        user_id: userId,
        device_id: deviceId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        id: data.id,
        card_id: data.card_id,
        user_id: data.user_id,
        device_id: data.device_id,
        content: data.content,
        like_count: data.like_count || 0,
        nope_count: data.nope_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function toggleCommentReaction(
  commentId: string,
  reaction: 'like' | 'nope',
  deviceId: string,
  userId?: string
): Promise<{ error: Error | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: new Error('Supabase client not configured') };
  
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('comment_reactions')
      .select('*')
      .eq('comment_id', commentId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      if (existing.reaction === reaction) {
        // 같은 reaction이면 제거
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('id', existing.id);

        if (deleteError) throw deleteError;
      } else {
        // 다른 reaction이면 업데이트
        const { error: updateError } = await supabase
          .from('comment_reactions')
          .update({ reaction })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      }
    } else {
      // 새로 추가
      const { error: insertError } = await supabase.from('comment_reactions').insert({
        comment_id: commentId,
        user_id: userId,
        device_id: deviceId,
        reaction,
      });

      if (insertError) throw insertError;
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

