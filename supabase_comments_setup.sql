-- Comments 테이블 생성
-- card_id는 cards 테이블의 id와 동일한 타입이어야 합니다 (UUID 또는 text)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id text not null, -- cards 테이블의 id 타입에 맞춰 조정 (UUID인 경우 uuid로 변경)
  user_id uuid,
  device_id text not null,
  content text not null,
  like_count int default 0,
  nope_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Foreign key 제약조건은 cards 테이블이 존재하고 id가 UUID인 경우에만 추가
-- 필요시 아래 주석을 해제하고 card_id 타입을 uuid로 변경하세요
-- alter table public.comments add constraint comments_card_id_fkey 
--   foreign key (card_id) references public.cards(id) on delete cascade;

-- Comment reactions 테이블 (사용자별 좋아요/싫어요 기록)
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

-- RLS 활성화
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;

-- Comments 정책 (읽기/쓰기 모두 허용)
create policy "comments open access" on public.comments
  for all using (true) with check (true);

-- Comment reactions 정책 (읽기/쓰기 모두 허용)
create policy "comment_reactions open access" on public.comment_reactions
  for all using (true) with check (true);

-- 좋아요/싫어요 카운트를 자동으로 업데이트하는 함수
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

-- 트리거 생성
drop trigger if exists comment_reactions_count_trigger on public.comment_reactions;
create trigger comment_reactions_count_trigger
  after insert or update or delete on public.comment_reactions
  for each row execute function update_comment_reaction_counts();

