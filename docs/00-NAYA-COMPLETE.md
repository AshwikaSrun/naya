# naya — complete, super-detailed documentation

This document is the **single source of truth** for what **naya** is, how it works end-to-end, and how the repository is structured. It consolidates and extends the focused docs in `docs/01-OVERVIEW.md` through `docs/07-API-REFERENCE.md`, plus implementation details verified against the code in `app/` and `scraper-api/`.

If you want “shorter but still detailed” versions, start with:

- `docs/01-OVERVIEW.md` (product + architecture summary)
- `docs/02-SEARCH-ENGINE.md` (search + caching + scrapers)
- `docs/05-DATA-ENGINE.md` (Supabase + analytics primitives)
- `docs/07-API-REFERENCE.md` (endpoint reference)

---

## 1) What is naya?

**naya is a resale search engine + price-intelligence layer** for second-hand fashion.

- **Not a marketplace**: naya does not hold inventory, manage sellers, process payments, or handle shipping.
- **It is a discovery layer**: search once and see results from multiple resale marketplaces in one curated interface.
- **It is an intelligence layer**: as searches happen, naya can compute market medians, ranges, and “deal context” to help users judge if a listing price is good.

In practice, naya is a system of three major “product surfaces” backed by a scraper + data pipeline:

- **Web app / PWA**: a Next.js app (App Router) that provides the core search experience and editorial discovery UI.
- **Chrome extension**: overlays price intelligence directly on marketplace pages (listing pages + search pages).
- **Scraper API**: an Express backend (Docker on Railway) that runs scrapers, quality filters, deduplication, ranking, and fire-and-forget ingestion to Supabase.

---

## 2) Who is it for?

naya is primarily built for **college students** and **cross-platform resale shoppers**:

- **Deal hunters**: want quick judgment of price fairness and access to cheaper equivalents across platforms.
- **Style + discovery shoppers**: want a “Pinterest-like” browsing experience for second-hand items.
- **Campus communities**: naya includes campus mode for localized discovery and, in at least one case, campus-specific inventory sources.

---

## 3) What naya does (core capabilities)

### 3.1 Unified multi-platform search

From one query, naya returns results from multiple sources and presents them together in a curated UI:

- Web app search: `GET /api/search?q=...`
- Backend search: `GET /search?q=...` (Scraper API)

Supported platforms in the current backend include:

- **Global platforms**: `ebay`, `grailed`, `depop`, `poshmark`
- **Campus-specific platforms**: currently, `purdue` can add `boiler_vintage` when `campus=purdue` is passed to the backend (`scraper-api/server.js`).

### 3.2 Data quality pipeline (clean → validate → dedupe → rank)

naya intentionally avoids being “just a raw scrape dump.” Search results are processed before they reach the UI:

- **Title cleaning**: strips common listing cruft, normalizes whitespace, fixes platform-specific quirks.
- **Validation**: drops items missing required fields or with invalid prices/images.
- **Cross-platform deduplication**: removes duplicates across marketplaces and prefers the cheaper listing when two are likely the same item.
- **Quality ranking**: scores items using relevance signals, image quality signals, platform bias (e.g., photo quality tendencies), price sanity, and junk penalties.

This pipeline primarily lives in `scraper-api/lib/dataPipeline.js` and is applied server-side before results are returned to the Next.js app.

### 3.3 Price intelligence endpoints (stored + live fallback)

naya can estimate what something “should” cost using observed listings:

- **Stored path**: use Supabase `price_observations` if there’s sufficient recent data.
- **Live path**: if stored data is sparse, do a live multi-platform scrape and compute medians/ranges on the fly.

This is what powers the extension overlay and the Insights UI.

### 3.4 Campus mode

naya can alter content and/or sources based on a campus selection:

- The frontend has campus pages: `/college` and `/campus/[slug]`.
- The backend can include campus-specific scrapers when a campus query param is provided.

### 3.5 PWA installability + extension install CTA

naya is designed to feel like a “real app”:

- PWA manifest + service worker for install + caching.
- Install prompt logic in the UI.
- Desktop users are steered toward the Chrome extension for in-market overlays.

---

## 4) High-level architecture (what talks to what)

### 4.1 Core runtime components

**Frontend** (Vercel):

- Next.js App Router pages in `app/`
- Serverless API routes in `app/api/`
- PWA static assets in `public/`

**Backend** (Railway, Docker):

- Express app in `scraper-api/server.js`
- Scrapers in `scraper-api/lib/`*
- Pipeline in `scraper-api/lib/dataPipeline.js`
- Relevance filtering in `scraper-api/lib/relevance`
- Supabase ingestion in `scraper-api/lib/dataIngestion`

**Database / analytics store** (Supabase, Postgres):

- `price_observations` and `search_events` (see `docs/05-DATA-ENGINE.md`)

### 4.2 The most important data flows

#### A) Web search flow (the “main” naya experience)

1. User searches from the homepage (`app/page.tsx`).
2. Client calls `GET /api/search` with `q`, `limit`, `platform`, and optional `campus`.
3. Next.js API route (`app/api/search/route.js`) proxies to the Scraper API:
  - In-memory cache on Vercel function (2-minute TTL, max ~100 entries).
  - Proxy timeout: 55 seconds.
4. Scraper API (`scraper-api/server.js`) runs:
  - Multi-platform scrapers (HTTP scrapers parallel; Playwright scrapers sequential to reduce memory pressure).
  - Relevance filter.
  - Pipeline: clean/validate/dedupe/rank.
  - Optional retail reference lookup (cached).
5. Scraper API returns results to Next.js, which returns to the browser.
6. Scraper API performs **fire-and-forget ingestion** to Supabase (does not block the user response).

If the Scraper API is down or times out, the Next.js API route falls back to a local **eBay-only** scraper (`lib/ebayScraper`) and returns `_fallback: true`.

#### B) Price intelligence flow (extension + insights)

1. Client calls `GET /api/price-check?query=...`.
2. Next.js tries Supabase for recent observations (last ~7 days).
3. If too few observations exist, it calls the Scraper API live and computes median/range and platform breakdown from the live results.

#### C) Cross-listings flow (find “same item elsewhere”)

1. Client calls `GET /api/cross-listings?query=...&source=...&price=...`.
2. Next.js calls the Scraper API live (limit 15).
3. It filters out the current source platform, sorts by price, returns up to 6 listings and a `cheaperCount`.

---

## 5) Repository structure (mental model)

This is the “how to find things fast” map:

### 5.1 `app/` (Next.js pages + API routes)

- **Pages**: `app/page.tsx` (home + results mode), plus `app/deals`, `app/college`, `app/campus/[slug]`, `app/insights`, `app/app` (concierge), `app/profile`, etc.
- **Global layout**: `app/layout.tsx` sets fonts, metadata, PWA settings, and includes analytics + service worker registration + install prompt UI components.
- **API routes**: `app/api/**/route.`* includes:
  - `search`, `new-finds`, `price-check`, `cross-listings`
  - insights endpoints like `insights/trending` and `insights/price-index`
  - concierge and try-on
  - auth/waitlist/feedback
  - additional telemetry endpoints (see `app/api/analytics/*` and `app/api/click-through/route.ts`)

### 5.2 `components/` (UI building blocks)

Key components include:

- `SearchBar.tsx` and `BottomSearchBar.tsx`: primary search entrypoints.
- `ResultsGrid.tsx`: results layout, filtering, sorting, and display.
- `ProductCard.tsx` + detail panels: listing display.
- `GetNayaBanner.tsx`, `InstallPrompt.tsx`: install/extension CTAs.

### 5.3 `lib/` (frontend hooks + helpers)

The key piece is `lib/useNayaSearch.ts`, which behaves like the app’s “state machine”:

- manages query state
- triggers `/api/search`
- handles caching and persistence (sessionStorage/localStorage)
- handles search limits / gating behaviors (when enabled)
- coordinates cart/wishlist/recently viewed, etc.

### 5.4 `scraper-api/` (Express backend)

- `scraper-api/server.js`: endpoint logic, caching, orchestration.
- `scraper-api/lib/*Scraper.js`: platform scrapers (mix of Cheerio/Axios and Playwright).
- `scraper-api/lib/dataPipeline.js`: cleaning + validation + dedupe + ranking.
- `scraper-api/lib/dataIngestion.js`: Supabase inserts for observations and search events.

---

## 6) The web app in detail (what users see)

### 6.1 Homepage vs results mode (single page with two modes)

`app/page.tsx` implements two main UI states:

- **Hero/discovery mode**: shown when there are no active results.
  - Full-bleed hero with search input.
  - New finds feed (calls `GET /api/new-finds?preset=default`).
  - Trending searches section.
  - Brand spotlight, featured categories, campus mode CTA, daily finds, recently viewed, install banners.
- **Results mode**: shown when a search is active.
  - Sticky header, cart badge, nav.
  - Loading status per platform.
  - Results grid once done.
  - Bottom search bar for mobile.

This “single page, two modes” approach keeps the experience fast: users stay on `/` while searching and iterating.

### 6.2 Campus pages

Campus mode is both a **content surface** and potentially a **backend source modifier**:

- UI: `/college` to choose, `/campus/[slug]` for localized discovery.
- Backend: can add extra platforms when `campus=` is supplied.

### 6.3 Deals page

Deals is a curated view that emphasizes discount percentages when `originalPrice` / retail reference enrichment is available.

### 6.4 Insights page

Insights is where naya’s “data engine” is exposed:

- price index-like computations (median/range/platform breakdowns)
- trending searches (global or campus-scoped)

### 6.5 Concierge and try-on

naya includes two “AI differentiated” features:

- **Concierge**: conversational interface powered by OpenRouter (DeepSeek model by default).
- **Virtual try-on**: image generation/compositing powered by fal.ai.

Both are exposed via API routes under `app/api/`.

---

## 7) Search engine + scraping backend (deep dive)

### 7.1 Why there is a separate scraper backend

Headless browser automation (Playwright + Chromium) is heavy and constrained in serverless environments.

naya uses a dedicated backend (Railway + Docker) so it can:

- run Chromium reliably
- control memory and concurrency
- keep consistent scraping behavior over time

### 7.2 Scraper orchestration and timeouts

In `scraper-api/server.js`:

- each scraper is wrapped with a timeout
- HTTP scrapers run in parallel
- Playwright scrapers run sequentially (intentionally) to reduce memory pressure

### 7.3 Caching layers (multi-tier)

naya uses multiple caches, each designed for a different bottleneck:

- **Client**: sessionStorage caching in `useNayaSearch` (documented in `docs/02-SEARCH-ENGINE.md`)
- **Next.js API**: in-memory `Map` cache in `app/api/search/route.js` (2-minute TTL)
- **Scraper API**: in-memory caches for:
  - search results (5-minute TTL)
  - retail reference lookup (30-minute TTL)

These caches reduce load and keep repeated searches snappy.

### 7.4 Data pipeline and ranking (what “curated” means)

The pipeline in `scraper-api/lib/dataPipeline.js` implements:

- **Title normalization** (platform cruft removal; Depop slug normalization; Poshmark category prefix removal)
- **Item validation** (price bounds, URL/image sanity; drop “lot of/bundle/wholesale”)
- **Cross-platform dedupe** (token overlap ≥ 0.7 and price proximity ≤ 0.2; keep cheaper)
- **Quality ranking** (composite score from relevance, image presence, price sanity, title quality, junk penalties, platform boosts, hi-res image bonuses, and discount presence)

The result: the UI gets fewer “spammy” items and more high-signal listings.

### 7.4.1 Relevance filtering (before the pipeline)

Before the data pipeline runs, the Scraper API applies **relevance scoring** (`scraper-api/lib/relevance.js`):

- Tokenizes the query (with stop-word removal) and scores matches in each listing title.
- Brand tokens get heavier weight (brand tokens are worth more than generic tokens).
- Applies small bonuses for phrase match and consecutive token matches.
- Applies an item-type mismatch penalty (e.g., searching “jacket” and getting “shoes”).
- Default threshold is **0.4** (tight matching).

There is an intentional bypass: if a scraper marks results as `_platformSearched` (meaning “the platform’s own search already did the relevance work”), relevance filtering is skipped for that item to avoid false negatives caused by truncated/slug-like titles.

### 7.5 Retail reference enrichment (what `originalPrice` means)

naya may attach an `originalPrice` and `discountPercent` to items when a retail reference median is found:

- The Scraper API performs a retail lookup (Google Shopping logic exists) and caches it.
- If median retail exists and is greater than the listing price, it adds:
  - `originalPrice: medianRetailPrice`
  - `discountPercent: round((median - price)/median * 100)`

This is used heavily by Deals and discount-centric UX.

---

## 8) API layer (what endpoints exist and why)

The complete reference is in `docs/07-API-REFERENCE.md`. The core endpoints are:

- **Search**: `GET /api/search`
- **New finds**: `GET /api/new-finds`
- **Price check**: `GET /api/price-check`
- **Cross listings**: `GET /api/cross-listings`
- **Insights**:
  - `GET /api/insights/trending`
  - `GET /api/insights/price-index`
- **Concierge**: `POST /api/concierge`
- **Try-on**: `POST /api/try-on`
- **Auth / access**: `POST /api/auth`
- **Waitlist**: `POST /api/waitlist`
- **Feedback**: `POST /api/feedback`

Plus additional telemetry/engagement endpoints that support analytics and lifecycle flows (e.g., install notifications/push).

### 8.1 “New finds” feed behavior (how it stays interesting)

The homepage “new finds” section is powered by `GET /api/new-finds` (`app/api/new-finds/route.ts`) and works like this:

- Choose a **preset** (defaults to `default`) which maps to an internal list of editorial-ish search queries.
- Randomly pick **3 queries** from that preset.
- For each query, call the Scraper API with `limit=12` and combine the results across platforms.
- Deduplicate by URL.
- Apply a **price-aware selection**:
  - Prefer items under **$165** (keeps it “cheap good finds” vs grails).
  - Exclude extreme outliers above **$320** in normal flow.
  - If the feed is thin, allow a “stretch” up to **$580**, and as an absolute last resort up to **$750**.
- Shuffle before returning up to **20** items.
- Add a `discoveredAt` timestamp (simulated recency for display; listings themselves are live).

---

## 9) Data engine (Supabase)

The “data advantage” is that naya can accumulate structured observations via normal usage.

### 9.1 Tables (conceptual)

See `docs/05-DATA-ENGINE.md` for schema details. At a minimum:

- `price_observations`: each listing price observation (query, title, price, source, created_at, etc.)
- `search_events`: each search event (query, campus_slug, result_count, platforms_hit, created_at)

### 9.2 Ingestion behavior

In the Scraper API, ingestion is designed to be:

- **best-effort**: doesn’t break search if Supabase is down
- **non-blocking**: does not add latency to the response path

That’s why ingestion is called “fire-and-forget.”

---

## 10) Chrome extension (how it fits in)

The extension is documented in `docs/04-CHROME-EXTENSION.md`. Its role is:

- bring naya’s price intelligence into the user’s existing browsing flow
- reduce friction (don’t require switching to the naya site)
- create a “closed loop” between browsing on a marketplace and discovering cheaper alternatives via naya search

High-level behaviors:

- On listing pages: extract title/price/image → call naya `/api/price-check` → show overlay.
- On search pages: scan listing cards → compute “deal badges” using market medians → annotate the marketplace UI.
- Save wishlist/history in extension storage.

---

## 11) Infrastructure + deployment (how it runs in production)

See `docs/06-INFRASTRUCTURE.md` for the canonical deployment map and env vars.

### 11.1 Frontend deployment

- hosted on **Vercel**
- builds the Next.js app
- runs API routes as serverless functions

### 11.2 Backend deployment

- hosted on **Railway**
- runs Dockerized Express + Playwright for scrapers

### 11.3 Key environment variables (conceptual)

Frontend (Vercel):

- `SCRAPER_BACKEND_URL` (optional; default is hardcoded fallback)
- Supabase public keys for reading insights
- OpenRouter keys/models for concierge
- fal.ai keys/models for try-on
- waitlist/feedback webhooks
- invite codes (if gating is turned on)

Backend (Railway):

- Supabase service role key for writes
- port

---

## 12) System qualities, constraints, and design choices

### 12.1 Reliability strategy

naya is built to degrade gracefully:

- If a platform scraper fails, other platforms can still return results.
- If the backend is down, Next.js can fall back to eBay-only scraping.
- Caches reduce repeated calls and smooth bursts.

### 12.2 Anti-bot reality

Scraping is adversarial. Some marketplaces employ anti-bot protections (e.g., Cloudflare behavior changes, SPA changes).

naya’s mitigation patterns include:

- mixed scraping methods (HTTP parsing where possible, Playwright where required)
- timeouts and fallback behaviors
- avoiding global outages by isolating failures per platform

### 12.3 Performance strategy

The system balances latency vs completeness:

- return results as fast as possible (and avoid doing heavy work client-side)
- keep expensive scrapers controlled (sequential Playwright on backend)
- multi-tier caching

---

## 13) Glossary (common terms in this codebase)

- **Platform**: a resale marketplace source (`ebay`, `grailed`, `depop`, `poshmark`) or a campus source (`boiler_vintage`).
- **Scraper API**: the Express backend that scrapes, filters, ranks, and ingests.
- **Observation**: one listing price datapoint stored in `price_observations`.
- **Search event**: one user query stored in `search_events`.
- **Retail reference / originalPrice**: a reference price used to compute discounts; not always a true MSRP, but a median “retail-like” price estimate from external lookup.
- **Deduplication**: removing likely duplicates across platforms to avoid showing the “same item” multiple times.
- **Curated**: “cleaned + validated + de-junked + ranked,” not necessarily human editorial curation.
- **Auth event**: a record written to Supabase `auth_events` when someone authenticates via Purdue email or invite code (`app/api/auth/route.ts`).

---

## Appendix A) Where to look for answers (quick index)

- **What pages exist?**: `app/`
- **What endpoints exist?**: `app/api/**/route.`* and `docs/07-API-REFERENCE.md`
- **How search works?**: `app/api/search/route.js`, `scraper-api/server.js`, `scraper-api/lib/dataPipeline.js`, `docs/02-SEARCH-ENGINE.md`
- **How price-check works?**: `app/api/price-check/route.ts`
- **How cross-listings works?**: `app/api/cross-listings/route.ts`
- **How ingestion works?**: `scraper-api/lib/dataIngestion.js` and `docs/05-DATA-ENGINE.md`
- **How deployment works?**: `docs/06-INFRASTRUCTURE.md`

