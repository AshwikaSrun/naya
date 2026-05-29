export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

// Stale-while-error cache. Keyed by `${preset}|${campus}`. When Railway
// returns 5xx, the hero feed serves the last good payload instead of an
// empty page so the site stays useful through a backend outage.
// 30 min is long enough to ride out a typical Railway restart/redeploy
// without showing users empty results.
interface FeedSnapshot {
  body: { items: unknown[]; preset: string; fetchedAt: number };
  ts: number;
}
const feedSnapshots = new Map<string, FeedSnapshot>();
const FEED_STALE_TTL_MS = 30 * 60 * 1000;

function saveSnapshot(key: string, body: FeedSnapshot['body']) {
  if (!body || !Array.isArray(body.items) || body.items.length === 0) return;
  feedSnapshots.set(key, { body, ts: Date.now() });
  if (feedSnapshots.size > 50) {
    const oldest = feedSnapshots.keys().next().value;
    if (oldest !== undefined) feedSnapshots.delete(oldest);
  }
}

function loadStaleSnapshot(key: string): { body: FeedSnapshot['body']; ageMs: number } | null {
  const snap = feedSnapshots.get(key);
  if (!snap) return null;
  const ageMs = Date.now() - snap.ts;
  if (ageMs > FEED_STALE_TTL_MS) { feedSnapshots.delete(key); return null; }
  return { body: snap.body, ageMs };
}

interface RawProduct {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: string;
}

/** Prefer listings in this range; keeps the feed “cheap good finds” not Grailed grails */
const PREFERRED_MAX_USD = 165;
/** Never surface luxury outliers if we have enough cheaper options */
const ABSOLUTE_MAX_USD = 320;

function parsePriceUsd(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Upgrade low-res marketplace thumbnails to full-size when we can safely
 * guess the larger URL. Known patterns:
 *   eBay:   s-l64.jpg / s-l140.jpg / s-l225.jpg → s-l1600.jpg
 *   Depop:  "P0/..." with ?width=128 → bump to 640
 */
function upgradeImageUrl(url: string, source: string): string {
  if (!url) return url;
  if (source === 'ebay') {
    return url.replace(/\/s-l\d+\.(jpg|jpeg|png|webp)/i, '/s-l1600.$1');
  }
  if (source === 'depop') {
    return url.replace(/[?&]width=\d+/, '').replace(/[?&]height=\d+/, '');
  }
  return url;
}

/**
 * Heuristic: is this listing likely a *clean, attractive* product shot?
 * We reject obvious low-quality cases: missing image, suspiciously small
 * CDN sizes, obvious bulk-lot titles, or placeholder URLs.
 */
function looksAttractive(item: RawProduct): boolean {
  if (!item.image || typeof item.image !== 'string') return false;
  // Tiny eBay thumbs — usually means the full image never loaded
  if (/s-l(64|80|96)\./i.test(item.image)) return false;
  // Placeholder or broken URLs
  if (item.image.endsWith('.svg')) return false;
  if (item.image.includes('no-image')) return false;

  const t = (item.title || '').toLowerCase();
  // Bulk / wholesale / "lot of" listings photograph poorly
  if (/\b(lot of|bulk|wholesale|reseller|bundle of|\d+\s*pc|assorted|mystery)\b/.test(t)) return false;
  // Worn-out resale filler
  if (/\b(damaged|stained|broken|for parts|as is|aaa|replica|fake)\b/.test(t)) return false;

  return true;
}

/**
 * New vintage finds — Ralph + Carhartt anchors + editorial pillars (it girl, denim, soft, under-radar).
 */
const PRESET_QUERIES: Record<string, string[]> = {
  /**
   * Hand-picked designer + niche-archival pool used by the home hero.
   * The goal here is clean flat-lay photography + real brand recognition:
   * Miu Miu / Prada / Marithe + Francois Girbaud / Isabel Marant / JPG, etc.
   */
  curated: [
    // archival / niche designer (flat-lay heavy on Depop + Grailed)
    'marithe francois girbaud vintage',
    'jean paul gaultier vintage',
    'cop copine vintage',
    'miss sixty y2k',
    'vintage dior saddle',
    'vintage miu miu',
    'vintage prada bag',
    'fendi baguette vintage',
    'vintage chloe paddington',
    'balenciaga city bag vintage',
    'isabel marant etoile vintage',
    'vintage jean paul gaultier mesh',
    'vivienne westwood vintage',
    'helmut lang archive',
    'vintage maison margiela',
    // strong anchors that photograph well
    'vintage ralph lauren sweater',
    'polo ralph lauren vintage',
    'vintage carhartt detroit jacket',
    'levis orange tab',
    'diesel y2k jeans',
  ],

  /** Broad mix: what already performs + full brand map */
  default: [
    // anchors (high hit rate)
    'vintage ralph lauren',
    'polo ralph lauren vintage',
    'vintage ralph lauren sweater',
    'vintage carhartt jacket',
    'carhartt double knee',
    'carhartt detroit jacket',
    'vintage carhartt hoodie',
    // it girl / viral
    'vintage miu miu',
    'vintage prada bag',
    'vintage dior',
    'vintage dior saddle',
    'fendi baguette vintage',
    'vintage chloe bag',
    'balenciaga city bag vintage',
    // denim / street
    'diesel y2k jeans',
    'levis orange tab',
    'levis 550 baggy',
    'vintage levi 569',
    'wrangler vintage denim',
    // soft / pinterest
    'brandy melville aesthetic',
    'reformation vintage dress',
    'urban outfitters y2k',
    'free people vintage',
    'realisation par dress',
    // under the radar
    'marithe francois girbaud vintage',
    'jean paul gaultier vintage',
    'cop copine vintage',
    'miss sixty y2k',
    'dkny vintage 90s',
    'esprit vintage sweater',
    'vintage stussy big logo',
    // always-moving extras
    'vintage nike crewneck',
    'y2k zip hoodie',
    'vintage girbaud',
    // isabel marant (correct spelling; listings often typo “marrant”)
    'isabel marant vintage',
    'isabel marant etoile vintage',
  ],
  /** Ralph Lauren + Carhartt only — same energy as before, deeper */
  anchors: [
    'vintage ralph lauren',
    'polo ralph lauren vintage',
    'vintage ralph lauren jacket',
    'ralph lauren quarter zip vintage',
    'vintage carhartt jacket',
    'carhartt double knee',
    'carhartt detroit jacket',
    'vintage carhartt hoodie',
    'carhartt active jacket vintage',
    'vintage ralph lauren pants',
  ],
  itgirl: [
    'vintage miu miu',
    'vintage prada bag',
    'vintage prada',
    'vintage dior saddle',
    'vintage dior',
    'fendi baguette vintage',
    'vintage chloe paddington',
    'vintage chloe bag',
    'balenciaga city bag vintage',
    'balenciaga vintage pre 2018',
  ],
  /** Isabel Marant — boho / parisian designer secondhand */
  isabelmarant: [
    'isabel marant vintage',
    'isabel marant etoile vintage',
    'vintage isabel marant dress',
    'isabel marant boots vintage',
    'isabel marant sweater vintage',
    'isabel marant jacket vintage',
    'isabel marrant vintage',
  ],
  denimstreet: [
    'diesel y2k jeans',
    'diesel vintage denim',
    'levis orange tab',
    'levis 550 baggy',
    'vintage levi 569',
    'carhartt double knee',
    'vintage carhartt pants',
    'wrangler vintage denim',
    'vintage denim carpenter',
  ],
  soft: [
    'brandy melville aesthetic',
    'reformation vintage dress',
    'urban outfitters y2k',
    'urban outfitters vintage',
    'free people vintage',
    'realisation par dress',
  ],
  elite: [
    'marithe francois girbaud vintage',
    'jean paul gaultier vintage',
    'cop copine vintage',
    'miss sixty y2k',
    'dkny vintage 90s',
    'esprit vintage sweater',
    'vintage stussy big logo',
    'vintage stussy hoodie',
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const preset = searchParams.get('preset') || 'default';
  const campus = searchParams.get('campus');

  const backendUrl = (process.env.SCRAPER_BACKEND_URL || BACKEND_URL).replace(/\/$/, '');
  const snapshotKey = `${preset}|${campus || ''}`;

  let queries = PRESET_QUERIES[preset] || PRESET_QUERIES.default;

  if (campus) {
    queries = [...queries.slice(0, 4), `vintage ${campus} hoodie`, `vintage ${campus} crewneck`];
  }

  const picked = queries.sort(() => Math.random() - 0.5).slice(0, 3);

  try {
    const fetches = picked.map(async (q) => {
      const params = new URLSearchParams({ q, limit: '12', platform: 'all' });
      const res = await fetch(`${backendUrl}/search?${params}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results = data.results || {};
      const all: RawProduct[] = [
        ...(results.ebay || []),
        ...(results.grailed || []),
        ...(results.depop || []),
        ...(results.poshmark || []),
      ];
      return all.map((item) => ({ ...item, _query: q }));
    });

    const batches = await Promise.allSettled(fetches);
    const allItems: (RawProduct & { _query: string })[] = [];
    for (const batch of batches) {
      if (batch.status === 'fulfilled') allItems.push(...batch.value);
    }

    // Deduplicate by URL + reject obviously low-quality listings so the
    // hero/feed shows clean, attractive product shots only.
    const seen = new Set<string>();
    const unique = allItems
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .filter(looksAttractive)
      .map((item) => ({
        ...item,
        image: upgradeImageUrl(item.image, item.source),
      }));

    // Price-aware mix: prefer under PREFERRED_MAX_USD; fill up to ABSOLUTE_MAX_USD only if thin
    const withPrice = unique
      .map((item) => ({ item, usd: parsePriceUsd(item.price) }))
      .filter(({ usd }) => usd > 0 && usd <= ABSOLUTE_MAX_USD);

    const preferred = withPrice.filter(({ usd }) => usd <= PREFERRED_MAX_USD);
    const filler = withPrice
      .filter(({ usd }) => usd > PREFERRED_MAX_USD)
      .sort((a, b) => a.usd - b.usd);

    const pickPool: (RawProduct & { _query: string })[] = [];
    const preferredShuffled = preferred.sort(() => Math.random() - 0.5);
    for (const { item } of preferredShuffled) {
      if (pickPool.length >= 20) break;
      pickPool.push(item);
    }
    for (const { item } of filler) {
      if (pickPool.length >= 20) break;
      pickPool.push(item);
    }

    // Rare: every hit was above ABSOLUTE_MAX — add next-cheapest up to a higher cap (still skip absurd grails)
    if (pickPool.length < 6) {
      const stretchMax = 580;
      const extra = unique
        .map((item) => ({ item, usd: parsePriceUsd(item.price) }))
        .filter(
          ({ item, usd }) =>
            usd > ABSOLUTE_MAX_USD &&
            usd <= stretchMax &&
            !pickPool.some((p) => p.url === item.url)
        )
        .sort((a, b) => a.usd - b.usd);
      for (const { item } of extra) {
        if (pickPool.length >= 20) break;
        pickPool.push(item);
      }
    }

    // Still empty (bad prices / parse issues): cheapest valid listings, last-resort cap
    if (pickPool.length === 0) {
      const any = unique
        .map((item) => ({ item, usd: parsePriceUsd(item.price) }))
        .filter(({ usd }) => usd > 0 && usd <= 750)
        .sort((a, b) => a.usd - b.usd)
        .slice(0, 20);
      pickPool.push(...any.map(({ item }) => item));
    }

    // Display order:
    //   - for the `curated` preset, lean hard on platforms with editorial
    //     photography (Depop, Grailed). eBay/Poshmark photos are often busy
    //     closet-shots which look cheap at hero size.
    //   - for everything else, shuffle for feed variety.
    const platformRank: Record<string, number> = {
      depop: 0,
      grailed: 1,
      ebay: 2,
      poshmark: 3,
      boiler_vintage: 1,
    };
    const shuffled =
      preset === 'curated'
        ? pickPool
            .slice()
            .sort((a, b) => {
              const ra = platformRank[a.source] ?? 9;
              const rb = platformRank[b.source] ?? 9;
              if (ra !== rb) return ra - rb;
              return Math.random() - 0.5;
            })
            .slice(0, 20)
        : pickPool.sort(() => Math.random() - 0.5).slice(0, 20);

    // Assign simulated recency — items are live listings, so they genuinely are recent
    const now = Date.now();
    const items = shuffled.map((item, i) => ({
      title: item.title,
      price: item.price,
      originalPrice: item.originalPrice,
      discountPercent: item.discountPercent,
      image: item.image,
      url: item.url,
      source: item.source,
      discoveredAt: now - (i * 2 + Math.floor(Math.random() * 4)) * 60 * 1000,
    }));

    const responseBody = { items, preset, fetchedAt: now };

    // Save a stale-while-error snapshot if we actually got items, so the
    // next request during a backend outage can fall back to this payload
    // instead of returning an empty feed.
    if (items.length > 0) saveSnapshot(snapshotKey, responseBody);
    // Also serve stale-fallback if every backend fetch failed and we ended
    // up with zero items, before returning an empty feed.
    if (items.length === 0) {
      const stale = loadStaleSnapshot(snapshotKey);
      if (stale) {
        return Response.json(
          { ...stale.body, _stale: true, _staleAgeMs: stale.ageMs, fetchedAt: now },
          { headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Cache': 'STALE' } }
        );
      }
    }

    return Response.json(responseBody, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('[new-finds] Error:', err);
    // Hard failure (network blew up, all fetches rejected). Serve the most
    // recent good snapshot if we have one — better than an empty feed.
    const stale = loadStaleSnapshot(snapshotKey);
    if (stale) {
      return Response.json(
        { ...stale.body, _stale: true, _staleAgeMs: stale.ageMs, fetchedAt: Date.now() },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Cache': 'STALE' } }
      );
    }
    return Response.json({ items: [], preset, fetchedAt: Date.now(), error: 'temporarily unavailable' }, { status: 200 });
  }
}
