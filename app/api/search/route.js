// Unified search endpoint — proxies to Railway backend if available,
// otherwise falls back to local eBay-only scraping.
import { scrapeEbay } from '@/lib/ebayScraper';

export const maxDuration = 60;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const platformParam = searchParams.get('platform')?.toLowerCase();
    const backendUrl = process.env.SCRAPER_BACKEND_URL?.trim();

    if (!query) {
      return Response.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (backendUrl) {
      const proxyParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        platform: platformParam || 'all',
      });
      const targetUrl = `${backendUrl.replace(/\/$/, '')}/search?${proxyParams.toString()}`;

      const proxyResponse = await fetch(targetUrl, {
        signal: AbortSignal.timeout(50000),
      });

      const body = await proxyResponse.json();
      return Response.json(body, { status: proxyResponse.status });
    }

    // Local fallback (only eBay works without Playwright)
    const validLimit = Math.min(Math.max(limit, 1), 50);
    const ebayResults = await scrapeEbay(query, validLimit).catch(() => []);

    return Response.json({
      query,
      limit: validLimit,
      platform: platformParam || 'all',
      results: {
        ebay: ebayResults,
        grailed: [],
        depop: [],
        poshmark: [],
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json(
      { error: 'Failed to search products', detail: error?.message },
      { status: 500 }
    );
  }
}
