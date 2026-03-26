-- ─── Users table (mirrors Firebase auth user) ────────────────────────────────
create table if not exists public.profiles (
  id          text primary key,  -- Firebase UID
  email       text,
  name        text,
  unit_system text default 'imperial',
  height      text,
  height_ft   text,
  height_in   text,
  age         text,
  sex         text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Check-ins table ──────────────────────────────────────────────────────────
create table if not exists public.checkins (
  id              text primary key,       -- matches existing CheckIn.id (uuid)
  user_id         text references public.profiles(id) on delete cascade,
  date            timestamptz not null,
  unit_system     text not null,
  inputs          jsonb not null,         -- SharedInputs object
  activity_level  text not null,
  dashboard       jsonb not null,         -- Dashboard object (bmi/bmr/tdee/bodyFat)
  created_at      timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Users can only read/write their own data
alter table public.profiles enable row level security;
alter table public.checkins  enable row level security;

-- Profiles: user can only touch their own row
create policy "profiles: own row only" on public.profiles
  for all using (id = current_setting('app.user_id', true));

-- Check-ins: user can only touch their own rows
create policy "checkins: own rows only" on public.checkins
  for all using (user_id = current_setting('app.user_id', true));

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists checkins_user_id_idx on public.checkins(user_id);
create index if not exists checkins_date_idx    on public.checkins(date desc);
