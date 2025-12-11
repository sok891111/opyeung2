-- ============================================
-- Step 2: RLS 정책 설정
-- Step 1 실행 후 이 SQL을 실행하세요
-- ============================================

-- RLS 활성화
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;

-- RLS 정책 설정 (모든 사용자 접근 허용)
drop policy if exists "comments open access" on public.comments;
create policy "comments open access" on public.comments
  for all using (true) with check (true);

drop policy if exists "comment_reactions open access" on public.comment_reactions;
create policy "comment_reactions open access" on public.comment_reactions
  for all using (true) with check (true);

