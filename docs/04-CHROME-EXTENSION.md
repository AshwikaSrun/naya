# Chrome Extension

## Overview

The naya Chrome extension brings price intelligence directly into resale marketplace pages. Instead of switching to the naya website, users see deal scores, market prices, and cross-platform listings as an overlay on eBay, Grailed, Depop, and Poshmark.

**Manifest Version:** 3
**Name:** naya — resale price intelligence

---

## Supported Marketplaces

| Platform | Listing Pages | Search Pages |
|----------|--------------|--------------|
| **eBay** | `ebay.com/itm/*` | `ebay.com/sch/*` |
| **Grailed** | `grailed.com/listings/*` | `grailed.com/shop/*`, `grailed.com/designers/*` |
| **Depop** | `depop.com/products/*` | `depop.com/search/*` |
| **Poshmark** | `poshmark.com/listing/*` | `poshmark.com/search*` |

---

## Features

### 1. Price Intelligence Overlay (Listing Pages)

When a user visits a listing page on any supported marketplace, the extension automatically:

1. **Extracts listing info** — title, price, image, source from the page DOM
2. **Queries naya API** — sends `PRICE_CHECK` request to `/api/price-check`
3. **Renders overlay** — floating card in the top-right corner showing:

**Full overlay (when market data available):**
- **Deal verdict** — steal, good, fair, or overpriced with percentage and dollar amount
- **Market price** — median price across all platforms
- **Listing price** — current listing's price
- **30-day trend** — price movement indicator
- **Price range** — min to max across all observed listings
- **Platform breakdown** — prices by platform with pill badges
- **Cross-listings** — same item found on other platforms with prices
- **Actions** — "find cheaper listings" and "save to naya"

**Minimal overlay (no market data):**
- "No market data yet" message
- Actions: search on naya, save to naya

### Deal Verdict Logic

| Condition | Verdict | Visual |
|-----------|---------|--------|
| Listing ≥ 15% below market | **steal** | Black badge, bold text |
| Listing > 0% below market | **good deal** | Light gray badge |
| Listing within 5% of market | **fair price** | Neutral |
| Listing > 5% above market | **overpriced** | Dark muted red badge |

Each verdict includes the specific dollar amount saved or overpaid (e.g., "you save $34 vs. the $89 average").

### 2. Deal Scanner (Search Pages)

On marketplace search results pages, the extension:

1. **Reads the page's search query** from the URL or search input
2. **Fetches market price** via `PRICE_CHECK`
3. **Scans all listing cards** on the page
4. **Injects badges** on individual listings:

| Badge | Condition | Display |
|-------|-----------|---------|
| Green badge | ≥ 20% below market | "🔥 38% below · save $24" |
| Red badge | ≤ -15% above market | "⚠️ $18 overpriced" |
| No badge | Within range | Nothing shown |

The scanner uses a `MutationObserver` to re-scan when results pages load more items (infinite scroll).

### 3. One-Click Save to Wishlist

Every overlay includes a "save to naya" button that:
- Saves the item to `chrome.storage.local` (max 200 items)
- Stores: title, price, image, URL, source, timestamp
- Viewable in the extension popup's Wishlist tab
- Removable from popup

### 4. Find Cheaper Listings

"Find cheaper listings" button opens `nayaeditorial.shop/?q=[item query]` in a new tab, running a full naya search for the same item across all platforms.

### 5. Cross-Listing Detection

After the price check loads, the extension makes a second API call to `/api/cross-listings` to find the same item on other platforms. If found, a "Also listed here" section appears showing:
- Platform name and icon
- Price on that platform
- "save $X" if cheaper than current listing
- Direct link to the other listing

### 6. View Tracking

Every listing page visit is recorded in `chrome.storage.local` (max 500 entries) with title, price, URL, source, and timestamp. Used for the "Items Viewed" stat in the popup.

---

## Extension Architecture

```
┌──────────────────────────────────────────────────┐
│                    POPUP                          │
│  popup.html + popup.js                           │
│  ┌──────────────┐  ┌────────────────┐           │
│  │ Price Check  │  │   Wishlist     │           │
│  │ (active tab) │  │ (saved items)  │           │
│  └──────┬───────┘  └───────┬────────┘           │
│         │                  │                     │
└─────────┼──────────────────┼─────────────────────┘
          │                  │
          ▼                  ▼
┌──────────────────────────────────────────────────┐
│              BACKGROUND SERVICE WORKER            │
│  background.js                                   │
│                                                  │
│  Message handlers:                               │
│    PRICE_CHECK    → GET /api/price-check         │
│    CROSS_LISTINGS → GET /api/cross-listings      │
│    FIND_CHEAPER   → opens new tab                │
│    SAVE_WISHLIST  → chrome.storage.local         │
│    GET_WISHLIST   → chrome.storage.local         │
│    REMOVE_WISHLIST→ chrome.storage.local         │
│    TRACK_VIEW     → chrome.storage.local         │
│                                                  │
│  In-memory cache: price responses (10 min TTL)   │
└──────────────────────────┬───────────────────────┘
          ▲                │
          │                ▼
┌─────────┴────────────────────────────────────────┐
│              CONTENT SCRIPTS                      │
│                                                  │
│  content.js (listing pages)                      │
│    - Extracts listing info from DOM              │
│    - Renders price overlay                       │
│    - Sends PRICE_CHECK, CROSS_LISTINGS           │
│    - Sends SAVE_WISHLIST, TRACK_VIEW             │
│    - Minimizable to floating "n" button          │
│                                                  │
│  scanner.js (search pages)                       │
│    - Reads search query from URL/DOM             │
│    - Scans listing cards for prices              │
│    - Injects deal badges                         │
│    - MutationObserver for infinite scroll         │
└──────────────────────────────────────────────────┘
```

### Communication Flow

All API calls go through the background service worker. Content scripts and popup communicate with the background via `chrome.runtime.sendMessage`.

```
content.js ──sendMessage──▶ background.js ──fetch──▶ nayaeditorial.shop/api/*
scanner.js ──sendMessage──▶ background.js ──fetch──▶ nayaeditorial.shop/api/*
popup.js   ──sendMessage──▶ background.js ──storage──▶ chrome.storage.local
popup.js   ──direct fetch──▶ nayaeditorial.shop/api/* (for price check)
```

---

## Platform-Specific DOM Extraction

### Listing Pages (content.js)

The extension extracts product information using platform-specific CSS selectors:

**eBay:**
- Title: `h1.x-item-title__mainTitle span`, `h1[itemprop="name"]`, `h1`
- Price: `[itemprop="price"]`, `.x-price-primary span`, `#prcIsum`
- Image: `.ux-image-carousel-item img`, `[itemprop="image"]`

**Grailed:**
- Title: `[class*="ListingTitle"]`, `h1`
- Price: `[class*="Price"]`, `[data-testid="listing-price"]`
- Image: `[class*="ListingImage"] img`, `meta[property="og:image"]`

**Depop:**
- Title: `[data-testid="product__title"]`, `h1`
- Price: `[data-testid="product__price"]`, `[aria-label*="price"]`
- Image: `[data-testid="product__image"] img`, `meta[property="og:image"]`

**Poshmark:**
- Title: `[data-test="listing-title"]`, `h1`
- Price: `[data-test="listing-price"]`, `.listing__ipad-price`
- Image: `.covershot-image img`, `meta[property="og:image"]`

### Search Pages (scanner.js)

**eBay:** `.s-item` → `.s-item__price`
**Grailed:** `[class*="feed-item"]`, `a[href*="/listings/"]` → `[class*="Price"]`
**Depop:** `[data-testid*="product"]`, `a[href*="/products/"]` → `[class*="price"]`
**Poshmark:** `[data-test="tile"]`, `.card` → `[data-test="tile-price"]`

---

## Popup UI

**File:** `extension/popup.html` + `extension/popup.js`

### Layout
- **Header:** Black bar with "n" logo and "naya · price intelligence"
- **Tabs:** Price Check (default) | Wishlist
- **Width:** 340px, max-height: 560px

### Price Check Tab
- Automatically checks the active tab when popup opens
- If on a supported listing page: shows market price, listing price, deal verdict, platform breakdown
- If not on a listing page: "Visit an eBay, Grailed, Depop, or Poshmark listing"
- Stats row: "Items Viewed" and "Saved" counts
- CTA link: "Open naya Insights"

### Wishlist Tab
- Lists all saved items with thumbnail, title, source, time ago, price
- Remove button on each item
- Empty state when no items saved

---

## Styling

### Fonts
- **Cormorant Garamond** — prices, verdicts, logo (serif, editorial)
- **DM Sans** — body text, labels, buttons (sans, clean)
- Imported via Google Fonts `@import` in both `overlay.css` and `popup.html`

### Colors (Muted, Editorial)
| Element | Color |
|---------|-------|
| Steal verdict | Black background, white text |
| Good deal | `#f0f0ee` background, black text |
| Fair price | Light gray |
| Overpriced | `#3d2020` (dark muted wine), soft rose text |
| Search badges (good) | `rgba(0,0,0,0.85)` with `backdrop-filter: blur(4px)` |
| Search badges (bad) | `rgba(61,32,32,0.88)` with `backdrop-filter: blur(4px)` |

---

## Files

```
extension/
├── manifest.json         # Extension manifest (V3)
├── background.js         # Service worker (API calls, storage)
├── content.js            # Listing page overlay
├── scanner.js            # Search page deal badges
├── popup.html            # Popup layout + styles
├── popup.js              # Popup logic
├── overlay.css           # Content script styles
├── gen-icons.js          # Icon generation script (dev tool)
├── generate-icons.html   # Canvas-based icon generator (dev tool)
└── icons/
    ├── icon-16.png       # Toolbar icon
    ├── icon-48.png       # Extensions page icon
    └── icon-128.png      # Chrome Web Store icon
```

---

## Permissions

| Permission | Why |
|------------|-----|
| `activeTab` | Read the active tab's URL and content for price extraction |
| `storage` | Save wishlist, view history, and settings |
| `scripting` | Execute extraction scripts in tabs from popup |

### Host Permissions
- `https://www.ebay.com/*`
- `https://www.grailed.com/*`
- `https://www.depop.com/*`
- `https://poshmark.com/*`
- `https://www.nayaeditorial.shop/*`
