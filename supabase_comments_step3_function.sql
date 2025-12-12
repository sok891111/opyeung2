-- ============================================
-- Step 3: 함수 및 트리거 생성
-- Step 2 실행 후 이 SQL을 실행하세요
-- ============================================

-- 좋아요/싫어요 카운트 자동 업데이트 함수
create or replace function public.update_comment_reaction_counts()
returns trigger
language plpgsql
as $$
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
$$;

-- 트리거 생성
drop trigger if exists comment_reactions_count_trigger on public.comment_reactions;
create trigger comment_reactions_count_trigger
  after insert or update or delete on public.comment_reactions
  for each row execute function public.update_comment_reaction_counts();




