-- Keep a single live search phrase. Apply only to project srldhasqgwnbhyxfohlk.

delete from public.alerts
where watch_id in (
  select id from public.watches where name <> 'Topps Chrome Update Orange'
);
delete from public.watch_comps
where watch_id in (
  select id from public.watches where name <> 'Topps Chrome Update Orange'
);
delete from public.watches where name <> 'Topps Chrome Update Orange';

update public.watches
set
  must_include = array['Topps', 'Chrome', 'Update', 'Orange']::text[],
  must_exclude = '{}'::text[],
  year = null,
  max_price = null,
  alert_below_pct = 30,
  buying = array['FIXED_PRICE']::text[],
  enabled = true
where name = 'Topps Chrome Update Orange';
