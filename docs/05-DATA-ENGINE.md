# Data Engine & Analytics

## The Data Advantage

naya doesn't just aggregate listings — it collects and structures resale market data with every search. This turns naya into a **fashion analytics engine** that owns valuable datasets:

- **Resale Price Index** — median prices, trends, and ranges for any brand/item across platforms
- **Trend Intelligence** — what people are searching for, broken down by campus and time
- **Platform Price Comparison** — which platform is cheapest for what categories

This data is collected passively through normal user searches and stored in Supabase (PostgreSQL).

---

## Database Schema

### Supabase (PostgreSQL)

#### Table: `price_observations`

Stores individual listing data points collected from search results.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | bigint (identity) | PK | Auto-incrementing primary key |
| `query` | text | NOT NULL | The search query that found this item |
| `item_title` | text | NOT NULL | Listing title |
| `brand` | text | yes | Extracted brand name (Nike, Carhartt, etc.) |
| `item_type` | text | yes | Extracted item type (jacket, tee, denim, etc.) |
| `price` | numeric(10,2) | NOT NULL | Listing price in USD |
| `original_price` | numeric(10,2) | yes | Retail/original price if known |
| `source` | text | NOT NULL | Platform (ebay, grailed, depop, poshmark) |
| `image_url` | text | yes | Product image URL |
| `listing_url` | text | yes | Direct link to listing |
| `created_at` | timestamptz | default now() | When this observation was recorded |

**Indexes:**
- `idx_price_obs_brand_type` — on `(brand, item_type)` for brand/category queries
- `idx_price_obs_created` — on `(created_at)` for time-range queries
- `idx_price_obs_query` — on `(query)` for query-based lookups

#### Table: `search_events`

Tracks every search performed on naya.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | bigint (identity) | PK | Auto-incrementing primary key |
| `query` | text | NOT NULL | What the user searched for |
| `campus_slug` | text | yes | Which campus page they searched from (null = main site) |
| `result_count` | int | NOT NULL, default 0 | How many results were returned |
| `platforms_hit` | text[] | NOT NULL, default '{}' | Which platforms returned results |
| `created_at` | timestamptz | default now() | When the search happened |

**Indexes:**
- `idx_search_events_query` — on `(query)` for trending queries
- `idx_search_events_created` — on `(created_at)` for time-range queries
- `idx_search_events_campus` — on `(campus_slug)` for campus-specific analytics

**Row Level Security:** Disabled on both tables (service key writes from scraper, anon key reads from frontend).

---

## Data Ingestion Pipeline

**File:** `scraper-api/lib/dataIngestion.js`

Data is ingested on every search, as a fire-and-forget operation (doesn't block the response):

```
Search completed
      │
      ▼
ingestSearchResults(query, results, campus)
      │
      ├── For each listing in results:
      │     ├── Extract brand (60+ known brands)
      │     ├── Extract item type (jacket, tee, denim, sneaker, etc.)
      │     └── INSERT INTO price_observations
      │           (query, item_title, brand, item_type, price,
      │            original_price, source, image_url, listing_url)
      │
      └── INSERT INTO search_events
            (query, campus_slug, result_count, platforms_hit)
```

### Brand Extraction

The data ingestion module recognizes 60+ brands including:

**Streetwear & Sportswear:** Nike, Adidas, Jordan, New Balance, Puma, Reebok, Converse, Vans, Champion, Carhartt, Dickies, Stussy, Supreme, BAPE, Palace, Kith

**Designer:** Gucci, Louis Vuitton, Prada, Burberry, Versace, Balenciaga, Saint Laurent, Givenchy, Fendi, Dior, Valentino, Bottega Veneta, Alexander McQueen, Comme des Garcons, Rick Owens

**Heritage & Outdoor:** Ralph Lauren, Tommy Hilfiger, Lacoste, The North Face, Patagonia, Columbia, Arc'teryx, Canada Goose

**Denim:** Levi's, Wrangler, Lee, True Religion, Diesel, Acne Studios, APC

**Contemporary:** Zara, H&M, Uniqlo, COS, & Other Stories

### Item Type Extraction

Items are categorized into types:
- jacket, coat, hoodie, sweater, crewneck
- tee, shirt, polo, tank
- jeans, pants, shorts, skirt, dress
- sneaker, boot, shoe, sandal
- bag, backpack, hat, cap, belt, watch, jewelry, sunglasses, scarf

---

## Price Intelligence APIs

### Price Check (`/api/price-check`)

The primary price intelligence endpoint used by both the web app and Chrome extension.

**Strategy: Stored data first, live fallback**

```
GET /api/price-check?query=carhartt+jacket
      │
      ├── Query price_observations (last 7 days)
      │   WHERE query ILIKE '%carhartt%' AND query ILIKE '%jacket%'
      │
      ├── If count >= 3 → return stored data
      │     ├── medianPrice: median of all prices
      │     ├── count: total observations
      │     ├── priceRange: { min, max }
      │     ├── byPlatform: { ebay: { median, count }, ... }
      │     ├── trend30d: null (from stored data)
      │     └── _source: 'stored'
      │
      └── If count < 3 → live search fallback
            ├── Call scraper API: /search?q=carhartt+jacket&limit=15&platform=all
            ├── Extract prices from all results
            ├── Calculate median, range, platform breakdown
            └── Return with _source: 'live'
```

This solves the **cold start problem**: even if no one has searched for a specific item before, the extension can still show real-time market data by running a live search.

### Price Index (`/api/insights/price-index`)

Deeper analytics endpoint for the Insights page.

```
GET /api/insights/price-index?brand=Nike&item=sneakers
      │
      ├── Query price_observations
      │   WHERE brand = 'Nike' AND item_type = 'sneakers'
      │   AND created_at >= NOW() - INTERVAL '30 days'
      │
      └── Return:
            ├── medianPrice
            ├── count
            ├── trend30d (compare last 7 days vs previous 7 days)
            ├── priceRange: { min, max }
            └── byPlatform: { ebay: { median, count }, ... }
```

### Trending Searches (`/api/insights/trending`)

```
GET /api/insights/trending?campus=purdue&limit=10
      │
      ├── Query search_events
      │   WHERE created_at >= NOW() - INTERVAL '7 days'
      │   AND (campus_slug = 'purdue' OR campus_slug IS NULL)
      │   GROUP BY query
      │   ORDER BY COUNT(*) DESC
      │   LIMIT 10
      │
      └── Return:
            └── trending: [{ query, label, searchCount, avgResults }]
```

### Cross-Listings (`/api/cross-listings`)

```
GET /api/cross-listings?query=carhartt+jacket&source=ebay&price=45
      │
      ├── Call scraper API: /search?q=carhartt+jacket&limit=15&platform=all
      ├── Filter out listings from current source (ebay)
      ├── Sort by price (cheapest first)
      ├── Take top 6
      ├── Count how many are cheaper than current price ($45)
      │
      └── Return:
            ├── cheaperCount: 3
            └── listings: [{ title, price, source, url, image }]
```

---

## Data Growth Model

Data accumulates organically through user searches:

| Action | Data Generated |
|--------|---------------|
| 1 search with 25 results per platform | ~100 price_observations + 1 search_event |
| 100 daily searches | ~10,000 price observations per day |
| Price check (extension) with live fallback | ~60 price observations per check |

Over time, this builds a comprehensive dataset of resale market prices that powers increasingly accurate price intelligence.

---

## Supabase Client Configuration

### Next.js App (`lib/supabase.ts`)
- Uses **anon key** (public, safe for client-side)
- Reads from both tables
- Singleton pattern (one client instance)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Scraper API (`scraper-api/lib/supabaseClient.js`)
- Uses **service role key** (private, server-side only)
- Writes to both tables (data ingestion)
- Singleton pattern
- Environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

---

## Future Data Opportunities

The current schema supports building:

1. **Price drop alerts** — notify users when an item drops below a threshold
2. **Price history charts** — show 30/60/90 day price trends for any item/brand
3. **Market reports** — "Carhartt jackets are 15% cheaper this week"
4. **Demand signals** — which items are being searched most (trend intelligence)
5. **Platform arbitrage** — which platform consistently has the lowest prices for each category
6. **Seasonal patterns** — price fluctuations by season/month
7. **Campus-specific trends** — what's hot at each university
