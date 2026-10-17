-- Project Zero control plane schema.
-- Applied to project nyfqpnjtsfjhrsjrnlhl (eu-west-1) through create_migration.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_no bigint generated always as identity unique,
  email citext not null unique,
  username citext not null unique check (username::text ~ '^[A-Za-z0-9_]{3,20}$'),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  name text not null default 'Xbox',
  platform text not null default 'xbox',
  console_id text,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.link_codes (
  id uuid primary key default gen_random_uuid(),
  code char(6) not null unique,
  device_id uuid not null references public.devices(id) on delete cascade,
  poll_token_hash text not null,
  status text not null default 'pending' check (status in ('pending','claimed','expired')),
  claimed_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz
);
create index if not exists link_codes_device_idx on public.link_codes(device_id, created_at desc);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  token_hash text not null unique,
  kind text not null default 'web' check (kind in ('web','console','game')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists sessions_account_idx on public.sessions(account_id);

create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  season int not null,
  channel text not null,
  version text not null,
  cl text not null,
  build_label text not null,
  download_url text,
  mirror_url text,
  archive_url text,
  package_family_name text,
  launch_uri text not null default 'projectzero-game://launch',
  active boolean not null default true,
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (version, cl)
);

create table if not exists public.game_tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  ticket_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  event text not null,
  account_id uuid,
  device_id uuid,
  ip text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);

-- RLS: every domain table is closed to the anon key. Only the service role
-- (server-side Next.js routes) reads or writes. Builds are public read.
alter table public.accounts enable row level security;
alter table public.devices enable row level security;
alter table public.link_codes enable row level security;
alter table public.sessions enable row level security;
alter table public.builds enable row level security;
alter table public.game_tickets enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.accounts, public.devices, public.link_codes, public.sessions,
  public.game_tickets, public.audit_events from anon, authenticated;
grant select on public.builds to anon, authenticated;
create policy "builds public read" on public.builds for select to anon, authenticated using (active);

insert into public.builds (season, channel, version, cl, build_label, download_url, mirror_url, archive_url, sort_order, notes) values
 (6,'season6','6.31','CL-4573279','Season 6 · 6.31','https://public.simplyblk.xyz/6.31.rar','https://builds.rebootfn.org/6.31.rar','https://github.com/llamaqwerty/fortnite-builds-archive',1,'Reference client for Season 6. Not redistributed by Project Zero.'),
 (6,'season6','6.30','CL-4579044','Season 6 · 6.30','https://public.simplyblk.xyz/6.30.rar','https://builds.rebootfn.org/6.30.rar','https://github.com/llamaqwerty/fortnite-builds-archive',2,'Reference client for Season 6.'),
 (6,'season6','6.21','CL-4526925','Season 6 · 6.21','https://public.simplyblk.xyz/6.21.rar','https://builds.rebootfn.org/6.21.rar','https://github.com/llamaqwerty/fortnite-builds-archive',3,'Reference client for Season 6.'),
 (7,'season7','7.40.3','CL-5046157','Season 7 · 7.40.3','https://public.simplyblk.xyz/7.40.zip','https://builds.rebootfn.org/7.40.rar','https://github.com/llamaqwerty/fortnite-builds-archive',4,'Reference client for Season 7.'),
 (7,'season7','7.30.1','CL-4834550','Season 7 · 7.30.1','https://public.simplyblk.xyz/7.30.zip','https://builds.rebootfn.org/7.30.zip','https://github.com/llamaqwerty/fortnite-builds-archive',5,'Reference client for Season 7.'),
 (7,'season7','7.20.1','CL-4727874','Season 7 · 7.20.1','https://public.simplyblk.xyz/7.20.rar','https://builds.rebootfn.org/7.20.rar','https://github.com/llamaqwerty/fortnite-builds-archive',6,'Reference client for Season 7.'),
 (7,'season7','7.10','CL-4667333','Season 7 · 7.10','https://public.simplyblk.xyz/7.10.rar','https://builds.rebootfn.org/7.10.rar','https://github.com/llamaqwerty/fortnite-builds-archive',7,'Reference client for Season 7.')
on conflict (version, cl) do nothing;
