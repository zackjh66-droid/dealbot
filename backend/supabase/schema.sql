create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  created_at timestamptz not null default now()
);

create type public.device_link_status as enum ('pending','claimed','consumed','expired');

create table if not exists public.device_links (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  device_token_hash text not null unique,
  status public.device_link_status not null default 'pending',
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  consumed_at timestamptz
);
create index if not exists device_links_expires_idx on public.device_links(expires_at);

create table if not exists public.launcher_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_link_id uuid not null references public.device_links(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.device_links enable row level security;
alter table public.launcher_sessions enable row level security;

create policy "profile owner read" on public.profiles for select using (auth.uid() = id);
create policy "profile owner update" on public.profiles for update using (auth.uid() = id);

-- device_links and launcher_sessions are intentionally service-role only.
-- Never expose SUPABASE_SERVICE_ROLE_KEY to the Xbox client or browser.
