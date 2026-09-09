-- Remove Fill mock data rows. Apply only to project srldhasqgwnbhyxfohlk.

delete from public.alerts where point130_url = 'sample';
delete from public.watch_comps where source_url = 'sample';
delete from public.watches
where name in (
  'Mahomes Prizm PSA 10',
  'Elly De La Cruz Chrome 1st PSA 10',
  'Nabers Optic Rated Rookie PSA 10',
  'Wembanyama Prizm PSA 10',
  'Ohtani Topps Chrome PSA 10',
  'Lamar Downtown PSA 10'
);
