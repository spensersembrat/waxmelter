# Database

Use **only** project [`srldhasqgwnbhyxfohlk`](https://supabase.com/dashboard/project/srldhasqgwnbhyxfohlk).

Do not run this SQL on the poker/events Supabase project.

In the SQL editor, paste and run:

1. [`migrations/20260907120000_init.sql`](migrations/20260907120000_init.sql)
2. [`migrations/20260909160000_cl_cache.sql`](migrations/20260909160000_cl_cache.sql)
3. [`migrations/20260909173000_purge_sample.sql`](migrations/20260909173000_purge_sample.sql)

Then set on Vercel:

- `SUPABASE_URL=https://srldhasqgwnbhyxfohlk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API
