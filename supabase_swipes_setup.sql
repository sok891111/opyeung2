-- Swipes 테이블이 이미 있다면 이 SQL은 실행하지 않아도 됩니다.
-- 이미 테이블이 있는지 확인 후 필요시에만 실행하세요.

-- Swipes 테이블 생성 (이미 있다면 무시됨)
create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id text not null,
  card_id text not null,
  direction text not null check (direction in ('like','nope')),
  session_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint swipes_user_card_unique unique (user_id, card_id),
  constraint swipes_device_card_unique unique (device_id, card_id)
);

-- 인덱스 생성
create index if not exists swipes_card_idx on public.swipes(card_id);
create index if not exists swipes_user_idx on public.swipes(user_id);
create index if not exists swipes_device_idx on public.swipes(device_id);
create index if not exists swipes_created_idx on public.swipes(created_at desc);

-- RLS 활성화
alter table public.swipes enable row level security;

-- Swipes 정책 (읽기/쓰기 모두 허용)
create policy if not exists "swipes open access" on public.swipes
  for all using (true) with check (true);

-- 테스트용 샘플 데이터 삽입 (cards 테이블의 카드 ID를 사용)
-- 실제 카드 ID로 변경해서 사용하세요
-- 예시:
-- insert into public.swipes (device_id, card_id, direction, session_id) values
-- ('test-device-1', '카드UUID1', 'like', 'test-session-1'),
-- ('test-device-1', '카드UUID2', 'like', 'test-session-1'),
-- ('test-device-2', '카드UUID1', 'nope', 'test-session-2'),
-- ('test-device-2', '카드UUID3', 'like', 'test-session-2');




