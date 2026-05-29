# naya — Product Documentation

## What is naya?

naya is a **resale search engine** that aggregates listings from eBay, Grailed, Depop, and Poshmark into a single, aesthetically curated interface. Instead of checking four apps individually, users search once and see results from every platform — ranked by relevance, quality, and deal potential.

naya is not a marketplace. It does not hold inventory, process payments, or ship products. It is a **discovery and intelligence layer** on top of existing resale marketplaces. When a user finds something they want, naya redirects them to the original listing via an affiliate-ready redirect flow.

---

## Who is it for?

- **College students** looking for affordable second-hand fashion
- **Resale enthusiasts** who shop across multiple platforms
- **Deal hunters** who want price intelligence before buying
- **Anyone** who wants the Pinterest-like discovery experience applied to resale

naya has a campus-specific mode with curated content for universities including Purdue, Indiana, Michigan, Michigan State, Illinois, Wisconsin, Ohio State, Penn State, Texas, and Arizona State.

---

## Core Value Propositions

| Value | How naya delivers it |
|-------|---------------------|
| **Search once, see everything** | Aggregates eBay, Grailed, Depop, Poshmark in one search |
| **Price intelligence** | Shows market median prices, deal scores, 30-day trends |
| **Aesthetic curation** | Pinterest-inspired UI, quality filtering, junk removal |
| **Campus-specific** | Tailored trending items and vintage college merch per school |
| **Zero cost to user** | Free to use; monetization through affiliate redirects |
| **Cross-platform** | PWA (mobile), Chrome extension (desktop), web app |

---

## Product Surface Area

naya ships as three products:

### 1. Web App (nayaeditorial.shop)
- Next.js 16 application deployed on Vercel
- Full search engine with results from 4 platforms
- Deals page, insights page, campus pages, AI concierge, profile
- PWA-capable: installable on mobile home screens

### 2. Chrome Extension
- Manifest V3 extension for Chrome/Chromium browsers
- Overlays price intelligence on eBay, Grailed, Depop, Poshmark listing pages
- Deal scanner that badges search results with savings percentages
- Cross-platform listing detection

### 3. Scraper API (Backend)
- Express.js server deployed on Railway via Docker
- Runs headless Chromium (Playwright) for JS-heavy sites
- Cheerio + Axios for lighter scraping
- Feeds data into Supabase for analytics

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                │
│  Mobile (PWA)  ·  Desktop (Web)  ·  Chrome Extension        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS APP (Vercel)                      │
│                                                             │
│  Pages:  / · /deals · /college · /campus/[slug] · /insights │
│          /app (concierge) · /profile · /go (redirect)       │
│          /editorial · /brands · /product/[slug]             │
│                                                             │
│  API Routes:                                                │
│    /api/search        → proxies to scraper backend          │
│    /api/new-finds     → curated recent listings             │
│    /api/price-check   → price intelligence (stored + live)  │
│    /api/cross-listings→ same item on other platforms        │
│    /api/concierge     → AI chat (OpenRouter / DeepSeek)     │
│    /api/try-on        → virtual try-on (fal.ai)            │
│    /api/insights/*    → trending, price index               │
│    /api/auth          → invite code authentication          │
│    /api/waitlist      → email signup                        │
│    /api/feedback      → user feedback                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────┐
│  SCRAPER API     │ │ SUPABASE │ │ EXTERNAL APIs│
│  (Railway)       │ │ (Postgres)│ │              │
│                  │ │          │ │ OpenRouter   │
│  eBay scraper    │ │ price_   │ │ fal.ai       │
│  Grailed scraper │ │ observa- │ │ Google Sheets│
│  Depop scraper   │ │ tions    │ │ Algolia      │
│  Poshmark scraper│ │          │ │ (Grailed)    │
│  Google Shopping │ │ search_  │ │              │
│                  │ │ events   │ │              │
│  Playwright pool │ │          │ │              │
│  Data pipeline   │ │          │ │              │
└──────────────────┘ └──────────┘ └──────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend framework** | Next.js (App Router) | 16.1.4 |
| **UI library** | React | 19.2.3 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Fonts** | Cormorant Garamond (serif), DM Sans (sans) | Google Fonts |
| **Backend framework** | Express.js | 4.19.2 |
| **Scraping (heavy)** | Playwright (headless Chromium) | 1.57.0 |
| **Scraping (light)** | Cheerio + Axios | 1.1.2 / 1.13.2 |
| **Database** | Supabase (PostgreSQL) | — |
| **AI chat** | OpenRouter (DeepSeek R1) | — |
| **Virtual try-on** | fal.ai (IDM-VTON) | — |
| **Analytics** | Vercel Analytics | 1.6.1 |
| **Frontend hosting** | Vercel | — |
| **Backend hosting** | Railway (Docker) | — |
| **Extension** | Chrome Manifest V3 | — |
| **PWA** | Service Worker + Web App Manifest | — |

---

## Repository Structure

```
naya/
├── app/                    # Next.js App Router pages + API routes
│   ├── page.tsx            # Homepage / search
│   ├── layout.tsx          # Root layout (fonts, meta, PWA)
│   ├── globals.css         # Theme, Tailwind config
│   ├── deals/              # Deals page
│   ├── college/            # Campus selection
│   ├── campus/[slug]/      # Per-campus landing
│   ├── insights/           # Price index & trending
│   ├── app/                # AI concierge
│   ├── profile/            # User profile & wishlist
│   ├── editorial/          # Editorial content
│   ├── brands/             # Brand directory
│   ├── featured/           # Featured categories
│   ├── product/[slug]/     # Product detail
│   ├── go/                 # Affiliate redirect
│   ├── privacy/            # Privacy policy
│   ├── terms/              # Terms of service
│   ├── waitlist/           # Waitlist signup
│   └── api/                # API routes
│       ├── search/         # Multi-platform search
│       ├── new-finds/      # Curated recent listings
│       ├── price-check/    # Price intelligence
│       ├── cross-listings/ # Cross-platform duplicates
│       ├── concierge/      # AI chat
│       ├── try-on/         # Virtual try-on
│       ├── insights/       # Trending + price index
│       ├── auth/           # Authentication
│       ├── waitlist/       # Email signup
│       └── feedback/       # User feedback
├── components/             # React components
├── lib/                    # Utilities, hooks, scrapers
├── public/                 # Static assets, PWA files
│   ├── finds/              # Curated product images
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── extension/              # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── scanner.js
│   ├── popup.html
│   ├── popup.js
│   ├── overlay.css
│   └── icons/
├── scraper-api/            # Backend scraper service
│   ├── server.js           # Express server
│   ├── Dockerfile          # Docker config
│   └── lib/                # Scrapers + pipeline
├── docs/                   # This documentation
├── package.json            # Root dependencies
└── next.config.ts          # Next.js configuration
```

---

## Key Metrics & Limits

| Metric | Value |
|--------|-------|
| Platforms searched | 4 (eBay, Grailed, Depop, Poshmark) |
| Campuses supported | 10 |
| Max search results per platform | 50 |
| Default search limit | 10 |
| Free search limit (non-Purdue) | 20 per session |
| Purdue .edu emails | Unlimited searches |
| Extension wishlist max | 200 items |
| Extension view history max | 500 items |
| Search cache TTL (client) | 5 minutes |
| Search cache TTL (Next.js API) | 2 minutes |
| Search cache TTL (scraper API) | 5 minutes |
| Retail price cache TTL | 30 minutes |
| Extension price cache TTL | 10 minutes |
| Scraper timeout per platform | 25 seconds |
| API route max duration | 60 seconds (search), 30 seconds (price-check) |
