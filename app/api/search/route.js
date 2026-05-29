import { scrapeEbay } from '@/lib/ebayScraper';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

const apiCache = new Map();
const API_CACHE_TTL = 2 * 60 * 1000; // 2 minutes — fresh-cache window
// Stale-while-error window: keep last-good response usable for ~30 min so a
// Railway backend burp (502s, OOM restarts, deploy gaps) doesn't immediately
// turn the search page into an empty/broken UI for warm Vercel instances.
const STALE_TTL = 30 * 60 * 1000;

function getApiCached(key) {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > API_CACHE_TTL) return null; // expired-fresh, keep for stale lookup
  return entry.data;
}

function getApiStale(key) {
  const entry = apiCache.get(key);
  if (!entry) return null;
  const ageMs = Date.now() - entry.ts;
  if (ageMs > STALE_TTL) { apiCache.delete(key); return null; }
  return { data: entry.data, ageMs };
}

function setApiCache(key, data) {
  if (data && data.results) {
    const totalItems = Object.values(data.results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    if (totalItems === 0) return;
  }
  apiCache.set(key, { data, ts: Date.now() });
  if (apiCache.size > 100) {
    const oldest = apiCache.keys().next().value;
    apiCache.delete(oldest);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const platformParam = searchParams.get('platform')?.toLowerCase() || 'all';

  if (!query) {
    return Response.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const campusParam = searchParams.get('campus') || '';

  const cacheKey = `${query.toLowerCase().trim()}|${platformParam}|${limit}|${campusParam}`;
  const cached = getApiCached(cacheKey);
  if (cached) {
    return Response.json(cached, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=120', 'X-Cache': 'HIT' },
    });
  }

  const backendUrl = (process.env.SCRAPER_BACKEND_URL || BACKEND_URL).replace(/\/$/, '');

  const proxyParams = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    platform: platformParam,
  });
  if (campusParam) proxyParams.set('campus', campusParam);
  const targetUrl = `${backendUrl}/search?${proxyParams}`;

  try {
    const proxyRes = await fetch(targetUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(55000),
    });

    if (!proxyRes.ok) {
      console.error(`[search] Railway returned ${proxyRes.status} for q="${query}"`);
      throw new Error(`Backend ${proxyRes.status}`);
    }

    const body = await proxyRes.json();
    setApiCache(cacheKey, body);
    return Response.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=120', 'X-Cache': 'MISS' },
    });
  } catch (proxyErr) {
    console.error(`[search] Railway proxy failed for q="${query}": ${proxyErr.message}`);

    // Tier 1: serve last-good result for this exact key, even if past its
    // fresh-cache window. Almost always the right thing during a backend
    // outage — same query, same recent data, just minutes old.
    const stale = getApiStale(cacheKey);
    if (stale) {
      const staleBody = { ...stale.data, _stale: true, _staleAgeMs: stale.ageMs };
      return Response.json(staleBody, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Cache': 'STALE' },
      });
    }

    // Tier 2: try the in-process eBay scrape. Note: from Vercel cloud IPs
    // eBay returns 403 ~100% of the time (this is exactly why the Railway
    // backend was migrated to the official Browse API in 4898dae). We keep
    // this path so a self-hosted/local Vercel run still degrades gracefully,
    // but in production it almost always returns []. Better than a 502.
    try {
      const validLimit = Math.min(Math.max(limit, 1), 50);
      const ebayResults = await scrapeEbay(query, validLimit).catch(() => []);

      const fallbackBody = {
        query,
        limit: validLimit,
        platform: platformParam,
        results: { ebay: ebayResults, grailed: [], depop: [], poshmark: [] },
        _fallback: true,
      };
      return Response.json(fallbackBody, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    } catch (fallbackErr) {
      console.error(`[search] eBay fallback also failed: ${fallbackErr.message}`);
      return Response.json(
        { error: 'Search temporarily unavailable' },
        { status: 502 }
      );
    }
  }
}
