export type Comment = {
  id: string;
  card_id: string;
  user_id?: string;
  device_id: string;
  content: string;
  like_count: number;
  nope_count: number;
  created_at: string;
  updated_at: string;
  user_reaction?: 'like' | 'nope';
};

export type CommentReaction = {
  id: string;
  comment_id: string;
  user_id?: string;
  device_id: string;
  reaction: 'like' | 'nope';
  created_at: string;
};

