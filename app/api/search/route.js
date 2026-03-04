// Unified search endpoint
import { scrapeEbay } from '@/lib/ebayScraper';
import { scrapeDepop } from '@/lib/depopScraper';
import { scrapePoshmark } from '@/lib/poshmarkScraper';
import { scrapeGrailed } from '@/lib/grailedScraper';

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
      try {
        const proxyParams = new URLSearchParams({
          q: query,
          limit: limit.toString(),
          platform: platformParam || 'all',
        });
        const targetUrl = `${backendUrl.replace(/\/$/, '')}/search?${proxyParams.toString()}`;
        console.log(`[proxy] forwarding to: ${targetUrl}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);

        const proxyResponse = await fetch(targetUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const body = await proxyResponse.json();
        body._proxy = true;
        body._backend = backendUrl;
        return Response.json(body, { status: proxyResponse.status });
      } catch (proxyErr) {
        console.error(`[proxy] failed: ${proxyErr.message}, falling back to local scrapers`);
      }
    } else {
      console.log('[search] no SCRAPER_BACKEND_URL set, using local scrapers');
    }

    // Validate limit (max 50 per platform to prevent abuse)
    const validLimit = Math.min(Math.max(limit, 1), 50);

    const allPlatforms = [
      'ebay',
      'grailed',
      'depop',
      'poshmark',
    ];

    // Validate platform filter (comma-separated or "all")
    let platforms = allPlatforms;
    if (platformParam && platformParam !== 'all' && platformParam !== 'both') {
      platforms = platformParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    const invalidPlatforms = platforms.filter(
      (value) => !allPlatforms.includes(value)
    );

    if (invalidPlatforms.length > 0) {
      return Response.json(
        {
          error:
            'Invalid platform parameter. Use "all" or a comma-separated list of: ' +
            allPlatforms.join(', '),
        },
        { status: 400 }
      );
    }

    const selectedPlatforms = new Set(platforms);

    // Scrape platforms in parallel based on filter
    const promises = [
      selectedPlatforms.has('ebay')
        ? scrapeEbay(query, validLimit).catch((err) => {
            console.error('eBay scrape error:', err);
            return [];
          })
        : Promise.resolve([]),
      selectedPlatforms.has('depop')
        ? scrapeDepop(query, validLimit).catch((err) => {
            console.error('Depop scrape error:', err);
            return [];
          })
        : Promise.resolve([]),
      selectedPlatforms.has('grailed')
        ? scrapeGrailed(query, validLimit).catch((err) => {
            console.error('Grailed scrape error:', err);
            return [];
          })
        : Promise.resolve([]),
      selectedPlatforms.has('poshmark')
        ? scrapePoshmark(query, validLimit).catch((err) => {
            console.error('Poshmark scrape error:', err);
            return [];
          })
        : Promise.resolve([]),
    ];

    const [
      ebayResults,
      depopResults,
      grailedResults,
      poshmarkResults,
    ] = await Promise.all(promises);

    return Response.json({
      query,
      limit: validLimit,
      platform: platformParam || 'all',
      results: {
        ebay: selectedPlatforms.has('ebay') ? ebayResults : [],
        depop: selectedPlatforms.has('depop') ? depopResults : [],
        grailed: selectedPlatforms.has('grailed') ? grailedResults : [],
        poshmark: selectedPlatforms.has('poshmark') ? poshmarkResults : [],
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}
