-- ============================================
-- 댓글 기능을 위한 Supabase 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- 1. Comments 테이블 생성
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

-- 2. Comment reactions 테이블 생성
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid,
  device_id text not null,
  reaction text not null check (reaction in ('like', 'nope')),
  created_at timestamptz default now(),
  unique (comment_id, user_id, device_id)
);

-- 3. 인덱스 생성
create index if not exists comments_card_idx on public.comments(card_id);
create index if not exists comments_created_idx on public.comments(created_at desc);
create index if not exists comment_reactions_comment_idx on public.comment_reactions(comment_id);
create index if not exists comment_reactions_user_device_idx on public.comment_reactions(device_id);

-- 4. RLS 활성화
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;

-- 5. RLS 정책 설정 (모든 사용자 접근 허용)
drop policy if exists "comments open access" on public.comments;
create policy "comments open access" on public.comments
  for all using (true) with check (true);

drop policy if exists "comment_reactions open access" on public.comment_reactions;
create policy "comment_reactions open access" on public.comment_reactions
  for all using (true) with check (true);

-- 6. 좋아요/싫어요 카운트 자동 업데이트 함수
create or replace function update_comment_reaction_counts()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.reaction = 'like' then
      update public.comments set like_count = like_count + 1 where id = new.comment_id;
    elsif new.reaction = 'nope' then
      update public.comments set nope_count = nope_count + 1 where id = new.comment_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.reaction = 'like' then
      update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    elsif old.reaction = 'nope' then
      update public.comments set nope_count = greatest(nope_count - 1, 0) where id = old.comment_id;
    end if;
  elsif tg_op = 'UPDATE' then
    -- 기존 reaction 제거
    if old.reaction = 'like' then
      update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    elsif old.reaction = 'nope' then
      update public.comments set nope_count = greatest(nope_count - 1, 0) where id = old.comment_id;
    end if;
    -- 새로운 reaction 추가
    if new.reaction = 'like' then
      update public.comments set like_count = like_count + 1 where id = new.comment_id;
    elsif new.reaction = 'nope' then
      update public.comments set nope_count = nope_count + 1 where id = new.comment_id;
    end if;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

-- 7. 트리거 생성
drop trigger if exists comment_reactions_count_trigger on public.comment_reactions;
create trigger comment_reactions_count_trigger
  after insert or update or delete on public.comment_reactions
  for each row execute function update_comment_reaction_counts();

