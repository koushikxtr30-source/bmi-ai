-- Drop existing policies
drop policy if exists "profiles: own row only" on public.profiles;
drop policy if exists "checkins: own rows only" on public.checkins;

-- Disable RLS temporarily to allow our app to read/write
-- (We rely on Firebase Auth + anon key for security at this stage)
alter table public.profiles disable row level security;
alter table public.checkins  disable row level security;
