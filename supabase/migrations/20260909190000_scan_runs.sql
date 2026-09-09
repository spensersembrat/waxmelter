-- Last scan history so a finished scan is visible even with 0 alerts.
-- Apply only to project srldhasqgwnbhyxfohlk.

create table if not exists public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  watch_id uuid references public.watches(id) on delete set null,
  watch_name text,
  scanned_watches integer not null default 0,
  listings_checked integer not null default 0,
  new_alerts integer not null default 0,
  ebay_source text not null default 'none',
  parse_credits integer not null default 0,
  errors text[] not null default '{}'::text[],
  ok boolean not null default true
);

create index if not exists scan_runs_created_at_idx on public.scan_runs (created_at desc);

alter table public.scan_runs enable row level security;
