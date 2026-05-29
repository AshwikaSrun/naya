# Frontend — Pages, Components & Features

## Pages

### Homepage (`/`)
**File:** `app/page.tsx`

The homepage has two modes:

**Discovery Mode (no active search):**
- Hero section with full-viewport background image, naya logo, and search bar
- 5-link navigation: deals · campus · insights · concierge · profile
- Trending searches (suggestion chips with curated queries)
- "New Finds" section — recent listings from the last 30 minutes
- Brand spotlight — featured brands with images
- Featured categories — vintage denim, outerwear, graphic tees, accessories
- Campus preview — shows user's selected campus or default
- Daily finds — randomly refreshed picks
- Recently viewed items
- Get Naya banner (PWA install on mobile, extension CTA on desktop)
- Footer with editorial, brands, privacy, terms, contact links

**Search Results Mode (active search):**
- Sticky header with naya logo, 3 nav links, search count badge, cart icon
- Bottom search bar (mobile-friendly)
- ResultsGrid with platform filters, sort options, pagination
- Get Naya inline banner
- Cart panel (slide-out)

### Deals Page (`/deals`)
**File:** `app/deals/page.tsx`

- Header with naya logo and 5-link nav
- Hero: "biggest discounts right now." with subtitle showing minimum discount threshold
- Category pill filters: All deals, Nike, Levi's, Adidas, Ralph Lauren, Designer bags, Vintage tees, Jordans, Carhartt, Vintage denim, Outerwear, Accessories
- Results grid showing products with 30%+ discount
- Pinterest-style quality filter applied
- Product detail panel on click

### Campus Selection (`/college`)
**File:** `app/college/page.tsx`

- Collage header with vintage college merch images (hoodies + crewnecks)
- Grid of 10 campus cards (Purdue, Indiana, Michigan, etc.)
- Each card links to `/campus/[slug]`
- Get Naya inline banner

### Campus Landing (`/campus/[slug]`)
**File:** `app/campus/[slug]/page.tsx`

- Same structure as homepage but campus-specific
- School-colored accents (Purdue gold, Michigan blue, etc.)
- Campus-specific trending searches
- Campus vintage merch grid
- Campus-specific new finds

### Insights (`/insights`)
**File:** `app/insights/page.tsx`

- Header with naya logo and 5-link nav
- Price index search — enter a brand/item to see market median, 30-day trend, price range
- Platform breakdown — median price per platform (eBay, Grailed, Depop, Poshmark)
- Trending searches — global and per-campus
- Price movers — items with biggest price changes
- Get Naya inline banner

### Concierge / AI Assistant (`/app`)
**File:** `app/app/page.tsx`

- Header with naya logo and 5-link nav
- AI chat interface powered by OpenRouter (DeepSeek R1)
- Streaming responses
- Prompt chips for quick queries ("find me a vintage jacket under $50")
- Chat history persisted in localStorage

### Profile (`/profile`)
**File:** `app/profile/page.tsx`

- Header with naya logo and 5-link nav
- Preferences section: size, budget, style, alert email
- Preferences saved to localStorage
- Saved items (wishlist) displayed in masonry grid
- Empty state with guidance message

### Affiliate Redirect (`/go`)
**File:** `app/go/page.tsx`

- 3-second countdown before redirecting to the original listing URL
- Shows product image, title, price, source
- "Taking you to [source]..." messaging
- Query params: `url`, `title`, `price`, `source`, `image`

### Product Detail (`/product/[slug]`)
**File:** `app/product/[slug]/page.tsx`

- Server component
- Displays product info from URL search params
- Large product image via Next.js Image optimization

### Editorial (`/editorial`)
**File:** `app/editorial/page.tsx`

- Campus-ready essentials guide
- Style notes and editorial content
- Accessible from footer

### Brands (`/brands`)
**File:** `app/brands/page.tsx`

- Directory of 60+ brands
- Each brand links to a search for that brand
- Accessible from footer

### Other Pages
- `/featured` — Featured categories (vintage denim, outerwear, graphic tees, accessories) — categories merged into deals page
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/waitlist` — Email signup with invite code support

---

## Components

### Search Components

| Component | File | Purpose |
|-----------|------|---------|
| **SearchBar** | `components/SearchBar.tsx` | Primary search input. Autocomplete suggestions, platform tabs, search history. Props: `onSearch`, `disabled`, `value`, `onValueChange`, `showTabs`, `suggestions` |
| **BottomSearchBar** | `components/BottomSearchBar.tsx` | Fixed-bottom search bar for mobile in results view. Props: `onSearch`, `disabled` |

### Product Display

| Component | File | Purpose |
|-----------|------|---------|
| **ProductCard** | `components/ProductCard.tsx` | Product card with image, title, price, discount badge, wishlist heart button, source icon. Used across homepage, deals, profile, campus. Props: `product`, `onSelect` |
| **ProductDetailPanel** | `components/ProductDetailPanel.tsx` | Slide-out panel with full product details: large image, price, source, virtual try-on button, add to cart, share link. Props: `product`, `onClose` |
| **ResultsGrid** | `components/ResultsGrid.tsx` | Search results grid. Platform filter toggles (eBay, Grailed, Depop, Poshmark), sort options (relevance, price low/high), column layout, Get Naya inline banner. Props: `results`, `filters`, `onSearch`, `relatedSearches` |
| **CampusProductGrid** | `components/CampusProductGrid.tsx` | Product grid optimized for campus previews with configurable column count. Props: `products`, `columns` (4, 5, or 6) |
| **SearchPromptCard** | `components/SearchPromptCard.tsx` | Clickable card that triggers a search. Used for trending/featured items. Props: `title`, `query`, `price`, `image`, `onSearch` |
| **NewFindsSection** | `components/NewFindsSection.tsx` | "New in the last 30 min" section. Filter preset tabs (default, carhartt, nike, y2k, denim, streetwear). Auto-refreshes. Props: `campus`, `onSearch` |
| **PriceIndexBadge** | `components/PriceIndexBadge.tsx` | Small badge showing market price data inline with search results. Props: `query` |

### Shopping Features

| Component | File | Purpose |
|-----------|------|---------|
| **CartPanel** | `components/CartPanel.tsx` | Slide-out cart with saved items, total price, clear button. Props: `open`, `onClose` |
| **CompareBar** | `components/CompareBar.tsx` | Floating bar that appears when items are in the compare basket. Props: `onOpen` |
| **ComparePanel** | `components/ComparePanel.tsx` | Side-by-side comparison of up to 3 items. Props: `open`, `onClose` |

### App Install & Extension

| Component | File | Purpose |
|-----------|------|---------|
| **GetNayaBanner** | `components/GetNayaBanner.tsx` | Smart install banner. Detects mobile vs desktop. Mobile: promotes PWA install with stats (4 platforms, 1 search, 0 cost). Desktop: promotes Chrome extension with feature cards (deal scores, find cheaper, price alerts). Variants: `full` (large section), `inline` (compact), `sticky` (fixed bottom mobile) |
| **InstallPrompt** | `components/InstallPrompt.tsx` | PWA install prompt handling. Android: uses `beforeinstallprompt` API. iOS: shows manual "Add to Home Screen" instructions. Desktop: shows extension download prompt with puzzle piece icon |
| **ServiceWorkerRegistration** | `components/ServiceWorkerRegistration.tsx` | Registers service worker in production |

### Other

| Component | File | Purpose |
|-----------|------|---------|
| **ConciergeChat** | `components/ConciergeChat.tsx` | AI chat interface. Streams responses from OpenRouter. Prompt chips for common queries. Chat history in localStorage |
| **FeedbackWidget** | `components/FeedbackWidget.tsx` | Floating feedback button. Opens form with category selector, message field, email field. Sends to webhook |
| **LoadingSpinner** | `components/LoadingSpinner.tsx` | Animated loading spinner |

---

## Client-Side State Management

naya uses **no external state library** (no Redux, Zustand, etc.). All state is managed through:

1. **React hooks** — `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`
2. **Custom hook** — `useNayaSearch` (the main search state machine)
3. **localStorage** — Persistent data across sessions
4. **sessionStorage** — Search result caching within a session

### useNayaSearch Hook

**File:** `lib/useNayaSearch.ts`

This is the core state manager for the app. It handles:

- Search query state and execution
- Multi-platform API calls with two-phase loading
- Client-side search result caching (sessionStorage, 5 min TTL)
- Email gate (requires email before searching)
- Purdue detection (`@purdue.edu` emails get unlimited searches)
- Search count tracking and limits (20 free searches for non-Purdue)
- Cart management (add, remove, count)
- Trending search data
- Saved search history
- Results clearing

### localStorage Keys

| Key | Data | Purpose |
|-----|------|---------|
| `naya-user-email` | string | User's email address |
| `naya-search-count` | number | Searches performed (for non-Purdue limit) |
| `naya-campus` | string | Selected campus slug |
| `wishlistItems` | Product[] | Saved/wishlisted items |
| `profilePrefs` | object | Profile preferences (size, budget, style, alertEmail) |
| `alertEmail` | string | Price alert email |
| `naya-cart` | Product[] | Cart items |
| `naya-compare` | Product[] | Compare basket (max 3) |
| `naya-price-alerts` | Alert[] | Price alert subscriptions |
| `naya-impact-stats` | object | Usage stats (listings viewed, searches run) |
| `conciergeMessages` | Message[] | AI chat history |
| `naya-install-dismissed` | boolean | Whether install prompt was dismissed |
| `savedSearches` | string[] | Recent search queries |
| `recentlyViewed` | Product[] | Recently viewed products |
| `naya-trending` | object | Cached trending data |
| `naya-trending-{campus}` | object | Campus-specific trending data |

---

## Styling System

### Fonts

| Font | Usage | CSS Class |
|------|-------|-----------|
| **Cormorant Garamond** | Headings, logos, prices, editorial text | `font-naya-serif` |
| **DM Sans** | Body text, labels, buttons, navigation | `font-naya-sans` |

Both loaded via Google Fonts `<link>` in `layout.tsx`.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `night-bg` | `#faf9f7` | Page backgrounds |
| `night-surface` | `#ffffff` | Surface/card backgrounds |
| `text-primary` | `#1a1a1a` | Primary text |
| `text-secondary` | `#2d2d2d` | Secondary text |
| `text-muted` | `#8a8a8a` | Muted/label text |
| `border-dark` | `#e5e2de` | Borders |
| `accent-navy` | `#1a1a2e` | Accent color |
| `orange-glow` / `orange-accent` | `#a68b5b` | Warm accent |
| `warm-amber` | `#ece6df` | Warm background |
| `soft-orange` | `#f4efe9` | Soft background |

### Design Language

- **Lowercase everything** — all text is lowercase (brand identity)
- **Thin typography** — font-weight 300–400 predominant
- **Generous tracking** — letter-spacing 0.08em–0.2em on labels
- **Minimal borders** — `border-black/5` to `border-black/10`
- **Muted accents** — no bright colors; all muted, editorial tones
- **Rounded corners** — `rounded-2xl` on cards, `rounded-full` on buttons/pills
- **Black & white** — primary palette is black text on warm white

---

## PWA (Progressive Web App)

### Manifest (`public/manifest.json`)
- Name: "naya — second-hand shopping, simplified"
- Display: standalone (full-screen, no browser chrome)
- Orientation: portrait
- Theme: `#faf9f7`
- Icons: 192px, 512px (regular + maskable), SVG
- Shortcuts: Search, Concierge, Deals

### Service Worker (`public/sw.js`)
- Cache name: `naya-v1`
- Precaches: `/`, `/icon.svg`, `/manifest.json`
- **Network-first** for API calls and HTML pages
- **Cache-first** for static assets (JS, CSS, fonts, images)
- Caches Google Fonts responses

### Install Flow
1. On Android: browser fires `beforeinstallprompt` event → naya shows custom install banner
2. On iOS: naya shows manual instructions (Share → Add to Home Screen)
3. On desktop: naya shows Chrome extension promotion instead

---

## Navigation Structure

### Main Nav (5 links)
```
deals · campus · insights · concierge · profile
```

### Footer Links
```
editorial · brands · privacy · terms · contact
```

### Mobile Nav
- Bottom search bar in results mode
- Sticky install banner (PWA)
- No hamburger menu — pages accessible via footer and homepage sections
