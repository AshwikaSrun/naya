# API Reference

## Next.js API Routes

All API routes are under `app/api/` and deployed as Vercel serverless functions.

---

### `GET /api/search`

Multi-platform resale search.

**File:** `app/api/search/route.js`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | — | Search query |
| `limit` | number | No | 10 | Results per platform (max 50) |
| `platform` | string | No | `all` | `all` or comma-separated: `ebay,grailed,depop,poshmark` |

**Response:**
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
    "grailed": [],
    "depop": [],
    "poshmark": []
  },
  "meta": {
    "timing": {
      "ebay": 1200,
      "grailed": 800,
      "depop": 3400,
      "poshmark": 1100
    },
    "retailMedian": 89.99
  },
  "_fallback": false
}
```

**Caching:** In-memory, 2 min TTL, max 100 entries.

**Fallback:** If scraper backend is unreachable, falls back to local eBay-only scraper with `_fallback: true`.

**Config:** `maxDuration: 60`, `dynamic: 'force-dynamic'`, `fetchCache: 'force-no-store'`

---

### `GET /api/new-finds`

Curated recent listings from preset categories.

**File:** `app/api/new-finds/route.ts`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `preset` | string | No | `default` | Category: `default`, `carhartt`, `nike`, `y2k`, `denim`, `streetwear` |
| `campus` | string | No | — | Campus slug for campus-specific finds |

**Response:**
```json
{
  "items": [
    {
      "title": "Vintage Nike Crewneck",
      "price": 28.00,
      "image": "https://...",
      "url": "https://...",
      "source": "depop"
    }
  ],
  "preset": "default",
  "fetchedAt": 1710000000000
}
```

**Behavior:** Fetches 3 random queries from the selected preset, deduplicates, shuffles, returns up to 20 items.

**Config:** `maxDuration: 60`, `dynamic: 'force-dynamic'`, `fetchCache: 'force-no-store'`

---

### `GET /api/price-check`

Price intelligence with stored data + live fallback.

**File:** `app/api/price-check/route.ts`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | Item to check prices for |

**Response:**
```json
{
  "query": "carhartt jacket",
  "medianPrice": 52.00,
  "count": 47,
  "trend30d": -3,
  "priceRange": { "min": 18.00, "max": 145.00 },
  "byPlatform": {
    "ebay": { "median": 45, "count": 20 },
    "grailed": { "median": 65, "count": 12 },
    "depop": { "median": 55, "count": 10 },
    "poshmark": { "median": 48, "count": 5 }
  },
  "_source": "stored"
}
```

**`_source` values:**
- `stored` — data from Supabase (>= 3 observations in last 7 days)
- `live` — real-time search results (< 3 stored observations)
- `none` — no data found (medianPrice will be null)

**Config:** `maxDuration: 30`

---

### `GET /api/cross-listings`

Find the same item on other platforms.

**File:** `app/api/cross-listings/route.ts`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | Item search query |
| `source` | string | No | — | Current platform to exclude |
| `price` | number | No | 0 | Current listing price (for cheaper count) |

**Response:**
```json
{
  "query": "carhartt detroit jacket",
  "currentSource": "ebay",
  "currentPrice": 45.00,
  "cheaperCount": 2,
  "listings": [
    {
      "title": "Carhartt Detroit Jacket Vintage",
      "price": 38.00,
      "source": "depop",
      "url": "https://www.depop.com/products/...",
      "image": "https://..."
    }
  ]
}
```

**Config:** `maxDuration: 30`

---

### `GET /api/insights/price-index`

Detailed price analytics for brand/item combinations.

**File:** `app/api/insights/price-index/route.ts`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `brand` | string | No* | — | Brand name |
| `item` | string | No | — | Item type |
| `query` | string | No* | — | Free-text query |

*At least one of `brand` or `query` required.

**Response:**
```json
{
  "brand": "Nike",
  "itemType": "sneakers",
  "medianPrice": 65.00,
  "count": 234,
  "trend30d": 5,
  "priceRange": { "min": 15.00, "max": 350.00 },
  "byPlatform": {
    "ebay": { "median": 55, "count": 100 },
    "grailed": { "median": 80, "count": 50 },
    "depop": { "median": 60, "count": 60 },
    "poshmark": { "median": 65, "count": 24 }
  }
}
```

---

### `GET /api/insights/trending`

Trending search queries.

**File:** `app/api/insights/trending/route.ts`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `campus` | string | No | — | Campus slug (omit for global) |
| `limit` | number | No | 10 | Max results (max 50) |

**Response:**
```json
{
  "campus": "purdue",
  "period": "7d",
  "trending": [
    {
      "query": "vintage nike crewneck",
      "label": "vintage nike crewneck",
      "searchCount": 47,
      "avgResults": 82
    }
  ]
}
```

---

### `POST /api/concierge`

AI shopping assistant (streaming).

**File:** `app/api/concierge/route.ts`

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "Find me a vintage jacket under $50" }
  ]
}
```

**Response:** Server-Sent Events (SSE) stream of text chunks.

**Content-Type:** `text/plain; charset=utf-8`

**Model:** DeepSeek R1 via OpenRouter (configurable via `OPENROUTER_MODEL`).

---

### `POST /api/try-on`

Virtual try-on via fal.ai.

**File:** `app/api/try-on/route.ts`

**Request body:**
```json
{
  "userImage": "data:image/jpeg;base64,...",
  "garmentImage": "https://i.ebayimg.com/...",
  "garmentTitle": "Vintage Carhartt Jacket"
}
```

**Response:**
```json
{
  "resultImage": "https://v3.fal.media/...",
  "width": 768,
  "height": 1024,
  "model": "fal-ai/idm-vton"
}
```

---

### `POST /api/auth`

Invite code authentication.

**File:** `app/api/auth/route.ts`

**Request body:**
```json
{
  "code": "INVITE123"
}
```

Or with Purdue email:
```json
{
  "code": "student@purdue.edu"
}
```

**Response:**
```json
{ "success": true }
```

**Side effect:** Sets `naya-token` cookie (30 days, httpOnly).

---

### `POST /api/waitlist`

Email waitlist signup.

**File:** `app/api/waitlist/route.ts`

**Request body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "you're on the list..."
}
```

**Side effect:** POSTs email to Google Sheet webhook.

---

### `POST /api/feedback`

User feedback submission.

**File:** `app/api/feedback/route.ts`

**Request body:**
```json
{
  "category": "bug",
  "message": "Search results are slow",
  "email": "user@example.com",
  "page": "/",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**
```json
{ "success": true }
```

---

## Scraper API Endpoints

Base URL: `https://scraper-api-production-d197.up.railway.app`

### `GET /health`

Health check.

**Response:**
```json
{
  "status": "ok",
  "platforms": ["ebay", "grailed", "depop", "poshmark"],
  "uptime": 123456
}
```

### `GET /search`

Multi-platform search (same as Next.js proxy).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | — | Search query |
| `limit` | number | No | 10 | Results per platform (1–50) |
| `platform` | string | No | `all` | Platform filter |
| `campus` | string | No | — | Campus slug |

**Response:** Same shape as `/api/search` but includes additional `meta` with timing data.

**Caching:** In-memory, 5 min TTL, max 200 entries.

### `GET /retail-lookup`

Retail price lookup via Google Shopping.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | — | Product query |
| `limit` | number | No | 10 | Max prices (1–30) |

**Response:**
```json
{
  "query": "carhartt detroit jacket",
  "prices": [89.99, 95.00, 79.99],
  "medianRetailPrice": 89.99,
  "meta": { "source": "google_shopping", "count": 3 }
}
```

**Caching:** In-memory, 30 min TTL.

---

## Error Handling

All API routes follow a consistent error pattern:

```json
{
  "error": "Descriptive error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Missing or invalid parameters |
| 500 | Server error (scraper failure, API timeout) |

Scraper failures are handled gracefully — if one platform fails, results from other platforms are still returned. The response will simply have an empty array for the failed platform.
