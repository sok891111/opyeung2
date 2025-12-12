-- ============================================
-- Step 1: 테이블 생성
-- 이 SQL을 먼저 실행하세요
-- ============================================

-- Comments 테이블 생성
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  user_id uuid,
  device_id text not null,
  content text not null,
  like_count int default 0,
  nope_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comment reactions 테이블 생성
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid,
  device_id text not null,
  reaction text not null check (reaction in ('like', 'nope')),
  created_at timestamptz default now(),
  unique (comment_id, user_id, device_id)
);

-- 인덱스 생성
create index if not exists comments_card_idx on public.comments(card_id);
create index if not exists comments_created_idx on public.comments(created_at desc);
create index if not exists comment_reactions_comment_idx on public.comment_reactions(comment_id);
create index if not exists comment_reactions_user_device_idx on public.comment_reactions(device_id);




