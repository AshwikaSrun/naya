import { scrapeEbay } from '@/lib/ebayScraper';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

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

  const backendUrl = (process.env.SCRAPER_BACKEND_URL || BACKEND_URL).replace(/\/$/, '');

  const proxyParams = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    platform: platformParam,
  });
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
    return Response.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (proxyErr) {
    console.error(`[search] Railway proxy failed for q="${query}": ${proxyErr.message}`);

    // Local eBay-only fallback
    try {
      const validLimit = Math.min(Math.max(limit, 1), 50);
      const ebayResults = await scrapeEbay(query, validLimit).catch(() => []);

      return Response.json({
        query,
        limit: validLimit,
        platform: platformParam,
        results: { ebay: ebayResults, grailed: [], depop: [], poshmark: [] },
        _fallback: true,
      }, {
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
