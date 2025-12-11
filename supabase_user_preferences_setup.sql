-- User Preferences 테이블 생성
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  device_id text not null,
  preference_text text not null,
  analyzed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 인덱스 생성
create index if not exists user_preferences_user_idx on public.user_preferences(user_id);
create index if not exists user_preferences_device_idx on public.user_preferences(device_id);

-- RLS 활성화
alter table public.user_preferences enable row level security;

-- RLS 정책 설정 (모든 사용자 접근 허용)
drop policy if exists "user_preferences open access" on public.user_preferences;
create policy "user_preferences open access" on public.user_preferences
  for all using (true) with check (true);

