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

const PRESET_QUERIES: Record<string, string[]> = {
  default: [
    'vintage carhartt jacket',
    'vintage nike crewneck',
    'vintage band tee',
    'y2k zip hoodie',
    'vintage levi jeans',
    'vintage ralph lauren',
  ],
  carhartt: ['vintage carhartt jacket', 'carhartt detroit jacket', 'vintage carhartt hoodie'],
  nike: ['vintage nike crewneck', 'vintage nike windbreaker', 'nike vintage swoosh'],
  y2k: ['y2k zip hoodie', 'y2k cargo pants', 'y2k baby tee'],
  denim: ['vintage levi 501', 'baggy levi 550', 'vintage denim jacket'],
  streetwear: ['vintage stussy', 'vintage supreme', 'vintage bape'],
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
      const params = new URLSearchParams({ q, limit: '8', platform: 'all' });
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

    // Shuffle and take top 20
    const shuffled = unique.sort(() => Math.random() - 0.5).slice(0, 20);

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
