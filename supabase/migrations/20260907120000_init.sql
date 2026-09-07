-- Wax Melter tables. Apply only to project srldhasqgwnbhyxfohlk.

create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  must_include text[] not null default '{}',
  must_exclude text[] not null default '{}',
  year integer,
  max_price numeric,
  alert_below_pct numeric not null default 100,
  buying text[] not null default array['AUCTION', 'FIXED_PRICE']::text[],
  enabled boolean not null default true,
  last_median numeric,
  last_comp_count integer,
  last_scanned_at timestamptz,
  hit_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.watch_comps (
  watch_id uuid primary key references public.watches(id) on delete cascade,
  median numeric,
  sale_count integer not null default 0,
  samples jsonb not null default '[]'::jsonb,
  source_url text,
  fetched_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references public.watches(id) on delete cascade,
  item_id text not null unique,
  title text not null,
  image_url text,
  live_price numeric not null,
  shipping numeric not null default 0,
  live_total numeric not null,
  median numeric,
  comp_count integer,
  pct_of_median numeric,
  buying text not null,
  ends_at timestamptz,
  ebay_url text not null,
  point130_url text,
  seller_feedback integer,
  seen boolean not null default false,
  comp_status text not null default 'ok',
  created_at timestamptz not null default now()
);

create index if not exists alerts_created_at_idx on public.alerts (created_at desc);
create index if not exists alerts_watch_id_idx on public.alerts (watch_id);

alter table public.watches enable row level security;
alter table public.watch_comps enable row level security;
alter table public.alerts enable row level security;
