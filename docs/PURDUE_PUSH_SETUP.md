# Discovery push notifications (PWA)

Daily Web Push alerts with **rotating discovery copy** (e.g. “check this deal”, “Purdue students are wearing…”, campus-style leads). Listings are pulled from Purdue new-finds, Boiler Vintage, and multi-marketplace campus searches (`vintage purdue hoodie`, Carhartt, Nike). Click-through uses `push_discovery` / `push_purdue_style` for analytics.

## 1. Supabase

Run the new tables from `supabase-schema.sql` (`push_subscriptions`, `push_campaign_log`) in the SQL editor, or paste:

- `push_subscriptions` — stores browser push endpoints
- `push_campaign_log` — one row per day so the cron doesn’t double-send

## 2. VAPID keys

Generate keys (one-time):

```bash
npx web-push generate-vapid-keys
```

Add to **Vercel** (or `.env.local`):

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | Public key from the command above |
| `VAPID_PRIVATE_KEY` | Private key (secret) |
| `VAPID_SUBJECT` | Optional. Default: `mailto:nayaeditorialshop@gmail.com` |

## 3. Cron security

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Random string; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |

## 4. Site URL (recommended)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.nayaeditorial.shop` — used when the cron job calls your own `/api` routes |

If unset, `VERCEL_URL` is used.

## 5. Vercel Cron

`vercel.json` schedules **`/api/cron/purdue-deals`** daily at **14:00 UTC** (~9–10am US Eastern). Adjust the schedule in `vercel.json` if you want a different time.

**Manual test** (with server env loaded):

```text
GET https://yoursite.com/api/cron/purdue-deals?secret=YOUR_CRON_SECRET
```

## 6. User flow

- Opt-in: **Profile** → app notifications, or **Campus / Purdue** page.
- Requires **installed PWA** (or supported browser). **iOS**: user must add to Home Screen first, then enable notifications.

## 7. Service worker

`public/sw.js` handles `push` and `notificationclick`. Cache version is `naya-v2` so existing installs pick up the new worker.
