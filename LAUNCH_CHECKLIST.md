# Naya Launch Checklist — Final Review

**Target: Launch tomorrow**

---

## ✅ Ready

| Item | Status |
|------|--------|
| **Build** | ✓ `npm run build` succeeds |
| **Search** | ✓ Proxies to Railway; eBay fallback if Railway down |
| **Auth** | ✓ Invite codes + Purdue @purdue.edu free access |
| **Waitlist** | ✓ Purdue callout visible; collects emails |
| **Data quality** | ✓ Pipeline: clean titles, validate, dedupe, rank |
| **Depop images** | ✓ CDN width param upgraded to 640px |
| **Nav links** | ✓ All routes exist: editorial, brands, deals, featured, college, app, profile |
| **Product detail** | ✓ Panel + product page with "view on seller" |
| **Virtual try-on** | ✓ Uses FAL_KEY (optional feature) |
| **AI Concierge** | ✓ Uses OPENROUTER_API_KEY (optional feature) |

---

## ⚠️ Pre-Launch To-Do

### 1. **Environment variables (Vercel)**

| Variable | Required? | Notes |
|----------|------------|-------|
| `SCRAPER_BACKEND_URL` | Recommended | Defaults to Railway URL in code; set explicitly for clarity |
| `INVITE_CODES` | Yes (for non-Purdue) | Comma-separated invite codes for early access |
| `GOOGLE_SHEET_WEBHOOK` | Optional | Webhook URL to log waitlist signups |
| `OPENROUTER_API_KEY` | Optional | For AI Concierge; 500 if missing |
| `FAL_KEY` | Optional | For virtual try-on; 500 if missing |

**Action:** Set `INVITE_CODES` in Vercel Production env. Without it, only Purdue emails get in.

### 2. **metadataBase URL**

`app/layout.tsx` uses `metadataBase: new URL("https://www.nayaeditorial.shop")`.

**Action:** Confirm this is your production domain. If you use `naya.app` or `naya-three.vercel.app`, update it so Open Graph/Twitter cards resolve correctly.

### 3. **Brand assets**

✓ `public/brands/` contains: `browser.png`, `naya-og.png`, `coll2.jpg`, `purdue.jpg`, `Ralph Lauren.png`, `Polo Sport.png`, `Pacsun.png`, `Princess Polly.png`, `Carhartt.png`, `zara.jpg` — all good.

---

## 🔧 Non-Blocking (Post-Launch)

| Item | Notes |
|------|-------|
| Viewport warning | Next.js warns about `viewport` in metadata; move to `viewport` export when convenient |
| Middleware deprecation | Next.js suggests "proxy" instead of "middleware"; no impact on launch |
| Grailed/Poshmark images | `next.config` has eBay + Depop; Grailed/Poshmark use `unoptimized` so no config change needed |

---

## 🚀 Launch Day Checklist

1. [ ] Push latest code; confirm Vercel + Railway deploy
2. [ ] Set `INVITE_CODES` in Vercel (or rely on Purdue-only for soft launch)
3. [ ] Test: waitlist signup, Purdue email auth, search, product click-through
4. [ ] Test: share link on Twitter/Discord — OG image loads
5. [ ] Monitor Railway logs for scraper errors
6. [ ] Share with Purdue students first (free access)

---

## Quick Test Commands

```bash
# Local
npm run build && npm run start

# Railway health
curl https://scraper-api-production-d197.up.railway.app/health

# Search test
curl "https://scraper-api-production-d197.up.railway.app/search?q=nike&limit=3&platform=all"
```
