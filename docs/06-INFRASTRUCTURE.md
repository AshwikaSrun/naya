# Infrastructure & Deployment

## Deployment Architecture

```
┌───────────────────────────────────┐
│           VERCEL                  │
│                                   │
│  Next.js 16 App                  │
│  ├── Server-side rendering       │
│  ├── API routes (serverless)     │
│  ├── Static assets               │
│  └── Edge network (CDN)          │
│                                   │
│  Domain: nayaeditorial.shop      │
│  Git: pushes to main auto-deploy │
└───────────────┬───────────────────┘
                │ proxies search requests to
                ▼
┌───────────────────────────────────┐
│           RAILWAY                 │
│                                   │
│  Express.js + Playwright         │
│  ├── Docker container            │
│  ├── Headless Chromium           │
│  ├── 4 scrapers                  │
│  └── Data ingestion              │
│                                   │
│  URL: scraper-api-production-    │
│       d197.up.railway.app        │
│  Git: separate deploy or manual  │
└───────────────┬───────────────────┘
                │ writes to
                ▼
┌───────────────────────────────────┐
│          SUPABASE                 │
│                                   │
│  PostgreSQL                      │
│  ├── price_observations table    │
│  ├── search_events table         │
│  └── 6 indexes                   │
│                                   │
│  2 clients:                      │
│  ├── Anon key (reads, frontend)  │
│  └── Service key (writes, API)   │
└───────────────────────────────────┘
```

---

## Vercel (Frontend)

### Configuration

**No `vercel.json`** — uses Next.js defaults.

**`next.config.ts`:**
- Image optimization configured for remote domains:
  - `i.ebayimg.com` (eBay product images)
  - `media-photos.depop.com`, `**.depop.com` (Depop images)
  - `v3.fal.media`, `**.fal.media`, `fal.media` (virtual try-on results)

### Deployment
- **Trigger:** `git push` to `main` branch on GitHub
- **Build:** `next build`
- **Runtime:** Node.js serverless functions for API routes
- **CDN:** Vercel Edge Network for static assets
- **Domain:** `nayaeditorial.shop`

### Environment Variables (Vercel Dashboard)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SCRAPER_BACKEND_URL` | Railway scraper API URL |
| `OPENROUTER_API_KEY` | AI concierge API key |
| `OPENROUTER_MODEL` | AI model (default: `deepseek/deepseek-r1-0528:free`) |
| `FAL_KEY` | fal.ai API key for virtual try-on |
| `FAL_TRYON_MODEL` | Try-on model (default: `fal-ai/idm-vton`) |
| `GOOGLE_SHEET_WEBHOOK` | Webhook for waitlist/feedback |
| `FEEDBACK_WEBHOOK` | Feedback webhook (fallback) |
| `INVITE_CODES` | Comma-separated invite codes |

### API Route Limits

| Route | `maxDuration` | Notes |
|-------|--------------|-------|
| `/api/search` | 60s | Scraper calls can be slow |
| `/api/new-finds` | 60s | Multiple scraper calls |
| `/api/price-check` | 30s | May do live search fallback |
| `/api/cross-listings` | 30s | Live search to find duplicates |
| `/api/concierge` | default | Streaming response |
| `/api/try-on` | default | fal.ai call |

---

## Railway (Scraper Backend)

### Docker Configuration

**`scraper-api/Dockerfile`:**

```dockerfile
FROM node:20-bullseye-slim

# System dependencies for headless Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libatk-bridge2.0-0 libgtk-3-0 \
    libx11-6 libxcomposite1 libxrandr2 libxdamage1 libxfixes3 \
    libgbm1 libasound2 libatk1.0-0 libpangocairo-1.0-0 \
    libpango-1.0-0 libcairo2 libdrm2 libxkbcommon0 libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
RUN npx playwright install chromium
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
```

### Environment Variables (Railway Dashboard)

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (Railway assigns this) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (write access) |

### Server Details

- **Framework:** Express.js 4.19.2
- **Port:** `process.env.PORT` or 3005
- **CORS:** Enabled for all origins
- **URL:** `https://scraper-api-production-d197.up.railway.app`

### Health Check

```
GET /health
→ { status: "ok", platforms: ["ebay","grailed","depop","poshmark"], uptime: 12345 }
```

### Playwright Browser Pool

- 1 persistent Chromium instance (shared across requests)
- Pre-warmed on server startup
- Auto-restart on crash
- Used by: Depop scraper, Google Shopping (retail lookup)
- Not used by: eBay (Axios+Cheerio), Grailed (Algolia API), Poshmark (Axios+Cheerio)

---

## External Services

### OpenRouter (AI Concierge)

| Property | Value |
|----------|-------|
| **Purpose** | Powers the AI shopping assistant chat |
| **Default model** | `deepseek/deepseek-r1-0528:free` |
| **API** | OpenRouter REST API with SSE streaming |
| **Cost** | Free tier (DeepSeek R1) |
| **Used by** | `/api/concierge` |

### fal.ai (Virtual Try-On)

| Property | Value |
|----------|-------|
| **Purpose** | Virtual try-on feature in product detail panel |
| **Model** | `fal-ai/idm-vton` (IDM-VTON) |
| **Input** | User photo + garment image |
| **Output** | Composited try-on image |
| **Used by** | `/api/try-on` |

### Algolia (Grailed Search)

| Property | Value |
|----------|-------|
| **Purpose** | Searching Grailed listings |
| **Method** | Uses Grailed's public Algolia index |
| **API key** | Fetched from Grailed homepage, cached 1 hour |
| **Cost** | Free (using Grailed's existing index) |

### Google Sheets Webhook

| Property | Value |
|----------|-------|
| **Purpose** | Waitlist signups and user feedback |
| **Method** | POST to webhook URL |
| **Used by** | `/api/waitlist`, `/api/feedback` |

### Vercel Analytics

| Property | Value |
|----------|-------|
| **Purpose** | Page views and web vitals |
| **Package** | `@vercel/analytics` |
| **Auto-configured** | Via Vercel platform |

---

## Complete Environment Variable Reference

### Frontend (Vercel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anon key |
| `SCRAPER_BACKEND_URL` | No | `https://scraper-api-production-d197.up.railway.app` | Scraper API URL |
| `OPENROUTER_API_KEY` | Yes (for concierge) | — | OpenRouter API key |
| `OPENROUTER_MODEL` | No | `deepseek/deepseek-r1-0528:free` | AI model |
| `FAL_KEY` | Yes (for try-on) | — | fal.ai API key |
| `FAL_TRYON_MODEL` | No | `fal-ai/idm-vton` | Try-on model |
| `GOOGLE_SHEET_WEBHOOK` | Yes (for waitlist) | — | Webhook URL |
| `FEEDBACK_WEBHOOK` | No | Falls back to `GOOGLE_SHEET_WEBHOOK` | Feedback webhook |
| `INVITE_CODES` | No | — | Comma-separated codes |

### Backend (Railway)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3005 | Server port |
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | — | Supabase service role key |

---

## Dependencies

### Root `package.json`

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.4 | App framework |
| `react` | 19.2.3 | UI library |
| `react-dom` | 19.2.3 | React DOM rendering |
| `@supabase/supabase-js` | ^2.99.2 | Supabase client |
| `@vercel/analytics` | ^1.6.1 | Analytics |
| `@fal-ai/client` | ^1.9.1 | Virtual try-on |
| `axios` | ^1.13.2 | HTTP client (scraping fallback) |
| `cheerio` | ^1.1.2 | HTML parser (scraping fallback) |
| `playwright` | ^1.57.0 | Browser automation (scraping fallback) |
| `pptxgenjs` | ^4.0.1 | PowerPoint generation (pitch deck) |
| `react-markdown` | ^10.1.0 | Markdown rendering (concierge chat) |
| `tailwindcss` | ^4 | CSS framework (dev) |
| `@tailwindcss/postcss` | ^4 | PostCSS plugin (dev) |
| `typescript` | ^5 | Type checking (dev) |
| `eslint` | ^9 | Linting (dev) |
| `sharp` | ^0.34.5 | Image processing (dev, icon generation) |

### Scraper API `package.json`

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.19.2 | HTTP server |
| `cors` | ^2.8.5 | CORS middleware |
| `playwright` | ^1.57.0 | Browser automation |
| `axios` | ^1.13.2 | HTTP client |
| `cheerio` | ^1.1.2 | HTML parser |
| `@supabase/supabase-js` | ^2.99.2 | Database client |
