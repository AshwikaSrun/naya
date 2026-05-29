# Naya on Vercel

Use this so the site runs on Vercel and **you** can see traffic and performance in the Vercel dashboard (no public analytics page on the site).

## 1. Connect the project

1. Go to [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. **Import** your GitHub repo (`naya`).
3. Framework: **Next.js** (auto-detected). Root directory: repo root.
4. Click **Deploy** (first deploy may work with no env vars; some features stay off until you add them).

## 2. Turn on Vercel Analytics (visitors & page views)

1. In Vercel: open your project → **Analytics** (left sidebar).
2. Enable **Web Analytics** if prompted.

The app already includes `@vercel/analytics` in `app/layout.tsx`. After traffic hits production, you’ll see visitors, top pages, and countries here—**only for your team**, not on the public site.

## 3. Speed Insights (optional)

The app includes `@vercel/speed-insights`. In the project → **Speed Insights**, enable if you want Core Web Vitals in the dashboard.

## 4. Environment variables (Production)

**Project** → **Settings** → **Environment Variables** → add for **Production** (and Preview if you want):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (Table Editor / client) |
| `SCRAPER_BACKEND_URL` | Your Railway scraper base URL (no trailing slash) |
| `ANALYTICS_SECRET` | Long random string; use with `Authorization: Bearer …` on `GET /api/analytics` |
| `CRON_SECRET` | Protects `/api/cron/purdue-deals` (must match Vercel cron auth if configured) |

**Optional** (only if you use those features): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `FAL_KEY`, `OPENROUTER_API_KEY`, `FEEDBACK_WEBHOOK`, `GOOGLE_SHEET_WEBHOOK`, `INVITE_CODES`, `NEXT_PUBLIC_SITE_URL`.

After changing env vars, **Redeploy** (Deployments → … → Redeploy).

## 5. Cron jobs

`vercel.json` schedules `/api/cron/purdue-deals` daily. Crons run only on **production** and may require a **Pro** plan depending on your Vercel tier. Ensure `CRON_SECRET` matches what the route expects.

## 6. Where to look for “how many people”

| What you want | Where |
|----------------|--------|
| Site visits, pages, referrers | **Vercel → your project → Analytics** |
| Performance | **Vercel → Speed Insights** |
| Installs, searches, outbound clicks (your DB) | **Supabase → Table Editor** (`app_installs`, `search_events`, `redirect_events`) |

Supabase data does not appear inside Vercel; use both dashboards together.
