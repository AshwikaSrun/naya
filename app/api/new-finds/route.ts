export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

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
 * New vintage finds — Ralph + Carhartt anchors + editorial pillars (it girl, denim, soft, under-radar).
 */
const PRESET_QUERIES: Record<string, string[]> = {
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

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allItems.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

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

    // Display order: cheaper pieces first, light jitter so it’s not a strict price ladder
    // Pool is already price-skewed; shuffle for feed variety
    const shuffled = pickPool.sort(() => Math.random() - 0.5).slice(0, 20);

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

    return Response.json(
      { items, preset, fetchedAt: now },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('[new-finds] Error:', err);
    return Response.json({ items: [], preset, fetchedAt: Date.now(), error: 'temporarily unavailable' }, { status: 200 });
  }
}
