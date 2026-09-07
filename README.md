# Wax Melter

Personal eBay watchlist for sports cards. You save searches (watches). Once an hour the app looks those up on eBay, compares live price + shipping to a 130point sold median, and shows hits on Alerts.

No email. No AI. Nothing is bought.

## Local

```bash
cp .env.example .env.local
# set SITE_PASSWORD
npm install
npm run dev
```

Without Supabase or eBay keys, the UI runs on mock alerts and watches (`SITE_PASSWORD=devpassword` in `.env.local`).

## Deploy

1. Push to [spensersembrat/waxmelter](https://github.com/spensersembrat/waxmelter)
2. Import the repo on Vercel
3. Set env vars: `SITE_PASSWORD`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. After eBay developer approval, add `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` (Production keyset)
5. GitHub repo secrets: `APP_URL` (Vercel URL), `CRON_SECRET` (same as Vercel)

Apply `supabase/migrations/20260907120000_init.sql` on project `srldhasqgwnbhyxfohlk` only.

## Pages

- `/alerts` — under-comp listings
- `/watches` — what to search
- `/login` — site password
