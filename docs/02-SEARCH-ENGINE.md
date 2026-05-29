# Search Engine & Scraping System

## How Search Works

When a user types a query on naya, the request flows through three layers of caching and processing before results appear.

### Request Flow

```
User types "vintage carhartt jacket"
        │
        ▼
useNayaSearch hook (client)
        │
        ├── Check sessionStorage cache (key: naya-sc-vintage carhartt jacket|all|25)
        │   └── HIT (< 5 min old) → return cached results immediately
        │
        ▼ MISS
        │
        ▼ GET /api/search?q=vintage+carhartt+jacket&limit=25&platform=all
        │
Next.js API Route (app/api/search/route.js)
        │
        ├── Check in-memory Map cache (2 min TTL, max 100 entries)
        │   └── HIT → return cached
        │
        ▼ MISS
        │
        ▼ fetch(SCRAPER_BACKEND_URL/search?q=...)
        │
Scraper API (Railway)
        │
        ├── Check server-side search cache (5 min TTL, max 200 entries)
        │   └── HIT → return cached
        │
        ▼ MISS
        │
        ├── Parallel: retail price lookup (Google Shopping, 5s grace period)
        ├── Parallel: scrapeEbay()      ─┐
        ├── Parallel: scrapeGrailed()    │ Each with 25s timeout
        ├── Parallel: scrapeDepop()      │ via Promise.race
        └── Parallel: scrapePoshmark()  ─┘
                │
                ▼
        Relevance filtering (lib/relevance.js)
                │
                ▼
        Data pipeline (lib/dataPipeline.js)
          ├── Clean titles (remove SKUs, normalize whitespace)
          ├── Validate items (require title, price > 0, valid URL)
          ├── Cross-platform deduplication (fuzzy title matching)
          └── Quality ranking (curated sources weighted higher)
                │
                ▼
        Enrich with retail prices (originalPrice, discountPercent)
                │
                ▼
        Fire-and-forget: Supabase ingestion
          ├── Insert into price_observations
          └── Insert into search_events
                │
                ▼
        Cache result → return to Next.js → cache → return to client
```

### Fallback Behavior

If the Railway scraper backend is unreachable (timeout, crash, network error), the Next.js API falls back to a **local eBay scraper** (`lib/ebayScraper.js`) running directly in the Vercel serverless function. This returns eBay-only results with a `_fallback: true` flag.

### Two-Phase Loading

The client uses a two-phase approach:

1. **Phase 1:** Fetch with `limit=25` — fast initial results
2. **Phase 2:** Fetch with `limit=200` in background — fills in more results as they arrive

This gives users near-instant initial results while loading the full dataset behind the scenes.

---

## Platform Scrapers

### eBay Scraper


| Property              | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| **File**              | `scraper-api/lib/ebayScraper.js`                          |
| **Method**            | Axios (HTTP GET) + Cheerio (HTML parsing)                 |
| **No browser needed** | eBay serves static HTML                                   |
| **Selectors**         | `ul.srp-results li.s-card` → title, price, image, URL     |
| **Fallback copy**     | `lib/ebayScraper.js` (runs in Next.js if backend is down) |


eBay is the most reliable scraper because it serves fully rendered HTML without requiring JavaScript execution. It parses the search results page (`/sch/i.html?_nkw=...`) using CSS selectors.

### Grailed Scraper


| Property              | Value                                                        |
| --------------------- | ------------------------------------------------------------ |
| **File**              | `scraper-api/lib/grailedScraper.js`                          |
| **Method**            | Algolia API (direct)                                         |
| **No browser needed** | Uses Grailed's public Algolia search index                   |
| **API**               | Algolia `*/queries` endpoint with Grailed's app ID           |
| **Key caching**       | Algolia API key fetched from Grailed homepage, cached 1 hour |


Grailed uses Algolia for search. The scraper fetches Grailed's public Algolia API key from their homepage HTML, then queries Algolia directly. This is fast and reliable — no browser rendering needed.

### Depop Scraper


| Property           | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| **File**           | `scraper-api/lib/depopScraper.js`                            |
| **Method**         | Playwright (headless Chromium)                               |
| **Browser needed** | Yes — Depop is a heavy SPA                                   |
| **Behavior**       | Launches page, scrolls to load more items, extracts from DOM |
| **Timeout**        | 25 seconds max                                               |


Depop is a React SPA that requires full JavaScript execution. The scraper uses Playwright to load the page, scroll to trigger lazy loading, then extract product data from the rendered DOM.

### Poshmark Scraper


| Property              | Value                                             |
| --------------------- | ------------------------------------------------- |
| **File**              | `scraper-api/lib/poshmarkScraper.js`              |
| **Method**            | Axios + Cheerio                                   |
| **No browser needed** | Poshmark serves enough in initial HTML            |
| **Selectors**         | `a[href*="/listing/"]` → title, price, image, URL |


### Google Shopping Scraper (Retail Lookup)


| Property    | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| **File**    | `scraper-api/lib/googleShoppingScraper.js`                                   |
| **Method**  | Playwright                                                                   |
| **Purpose** | Not for search results — used to find retail prices for discount calculation |
| **Status**  | Disabled for direct user searches; only used internally for retail median    |


---

## Playwright Browser Pool

**File:** `scraper-api/lib/playwrightManager.js`

The scraper API maintains a **persistent Chromium instance** that's shared across requests to avoid the overhead of launching a new browser for every search.

- Max concurrent pages: managed via pool
- Browser launched at server startup ("pre-warming")
- Headless Chromium with minimal args for Docker compatibility
- Auto-restart if browser crashes

---

## Data Pipeline

**File:** `scraper-api/lib/dataPipeline.js`

Every search result goes through a processing pipeline before being returned:

### Per-Platform Pipeline

1. **Title cleaning** — Remove SKU numbers, excessive whitespace, HTML entities
2. **Validation** — Require non-empty title, price > 0, valid URL, valid image URL
3. **Price normalization** — Parse price strings to numbers

### Global Pipeline (Cross-Platform)

1. **Deduplication** — Fuzzy match titles across platforms to remove duplicate listings of the same item
2. **Quality ranking** — Depop and Grailed items ranked higher (curated sellers), eBay items ranked by listing quality signals
3. **Retail price enrichment** — If Google Shopping found a retail price, calculate `originalPrice` and `discountPercent`

---

## Relevance Filtering

**File:** `scraper-api/lib/relevance.js`

Not every result from a marketplace is relevant. The relevance filter scores each result based on:

- **Query token matching** — How many words from the search query appear in the result title
- **Brand detection** — Recognizes 60+ brands (Nike, Carhartt, Ralph Lauren, etc.)
- **Item type detection** — Categorizes as jacket, tee, denim, sneaker, etc.
- **Junk filtering** — Removes bulk lots, wholesale listings, SKU-only titles, items with extremely short titles

Results below a relevance threshold are dropped.

---

## Caching Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │     │  Next.js    │     │  Scraper API │
│ sessionStore│     │  in-memory  │     │  in-memory   │
│             │     │             │     │              │
│  5 min TTL  │────▶│  2 min TTL  │────▶│  5 min TTL   │
│  per query  │     │  max 100    │     │  max 200     │
│             │     │  entries    │     │  entries     │
└─────────────┘     └─────────────┘     └──────────────┘

                                        ┌──────────────┐
                                        │ Retail cache │
                                        │ 30 min TTL   │
                                        └──────────────┘

                                        ┌──────────────┐
                                        │ Grailed key  │
                                        │ 1 hour TTL   │
                                        └──────────────┘
```

All caches are in-memory `Map` objects with TTL-based expiration. There is no Redis or external cache layer.

---

## Search API Parameters

### `GET /api/search`


| Parameter  | Type   | Default  | Description                                             |
| ---------- | ------ | -------- | ------------------------------------------------------- |
| `q`        | string | required | Search query                                            |
| `limit`    | number | 10       | Max results per platform (1–50)                         |
| `platform` | string | `all`    | `all` or comma-separated: `ebay,grailed,depop,poshmark` |


### Response Shape

```json
{
  "query": "vintage carhartt jacket",
  "limit": 25,
  "platform": "all",
  "results": {
    "ebay": [
      {
        "title": "Vintage Carhartt Detroit Jacket XL",
        "price": 45.99,
        "originalPrice": 89.99,
        "discountPercent": 49,
        "image": "https://i.ebayimg.com/...",
        "url": "https://www.ebay.com/itm/...",
        "source": "ebay"
      }
    ],
    "grailed": [...],
    "depop": [...],
    "poshmark": [...]
  },
  "meta": {
    "timing": { "ebay": 1200, "grailed": 800, "depop": 3400, "poshmark": 1100 },
    "retailMedian": 89.99
  },
  "_fallback": false
}
```

---

## Pinterest-Style Curation

naya applies an aesthetic quality filter (`isPinteresty`) to ensure results feel curated rather than like a raw marketplace dump:

**Included:** Items with fashion keywords (vintage, leather, denim, silk, streetwear, y2k, etc.) or from curated platforms (Depop, Grailed)

**Excluded:**

- Bulk lots and wholesale listings
- SKU-only titles (e.g., "ABC12345XYZ")
- Titles shorter than 12 characters
- Items that don't match any fashion category

