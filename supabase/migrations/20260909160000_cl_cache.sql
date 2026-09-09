-- Card Ladder lookup cache (per watch + eBay title). Apply only to project srldhasqgwnbhyxfohlk.

create table if not exists public.cl_cache (
  query_key text primary key,
  median numeric,
  sale_count integer not null default 0,
  samples jsonb not null default '[]'::jsonb,
  source_url text,
  fetched_at timestamptz not null default now(),
  status text not null default 'unavailable'
);

alter table public.cl_cache enable row level security;
