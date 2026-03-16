const express = require('express');
const cors = require('cors');

const { scrapeEbay } = require('./lib/ebayScraper');
const { scrapeDepop } = require('./lib/depopScraper');
const { scrapePoshmark } = require('./lib/poshmarkScraper');
const { scrapeEtsy } = require('./lib/etsyScraper');
const { scrapeGrailed } = require('./lib/grailedScraper');
const { scrapeGoogleShopping, lookupRetailPrices } = require('./lib/googleShoppingScraper');
const { filterByRelevance } = require('./lib/relevance');
const { runPipeline, runGlobalPipeline } = require('./lib/dataPipeline');

const app = express();
app.use(cors());

const SCRAPER_TIMEOUT_MS = 25000;

// ── In-memory cache ──
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const RETAIL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const searchCache = new Map();
const retailCache = new Map();

function getCached(cache, key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(cache, key, data) {
  // Don't cache empty search results
  if (data && data.results) {
    const totalItems = Object.values(data.results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    if (totalItems === 0) return;
  }
  cache.set(key, { data, ts: Date.now() });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

const allPlatforms = [
  'ebay',
  'grailed',
  'depop',
  'poshmark',
];

// Etsy and Google Shopping are disabled — they block headless browsers from
// cloud IPs. Re-enable once API keys or a residential proxy are set up.
const disabledPlatforms = ['etsy', 'google_shopping'];

const scraperMap = {
  ebay: scrapeEbay,
  grailed: scrapeGrailed,
  depop: scrapeDepop,
  poshmark: scrapePoshmark,
  etsy: scrapeEtsy,
  google_shopping: scrapeGoogleShopping,
};

function withTimeout(fn, name, timeoutMs) {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await Promise.race([
        fn(...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
      const elapsed = Date.now() - start;
      console.log(`[scraper] ${name} returned ${result.length} items in ${elapsed}ms`);
      return result;
    } catch (err) {
      const elapsed = Date.now() - start;
      console.error(`[scraper] ${name} failed in ${elapsed}ms: ${err.message}`);
      return [];
    }
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', platforms: allPlatforms, uptime: process.uptime() });
});

app.get('/search', async (req, res) => {
  const requestStart = Date.now();
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit || '10', 10);
    const platformParam = String(req.query.platform || 'all').toLowerCase();

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const validLimit = Math.min(Math.max(limit, 1), 50);

    let platforms = allPlatforms;
    if (platformParam !== 'all' && platformParam !== 'both') {
      platforms = platformParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    const invalidPlatforms = platforms.filter(
      (value) => !allPlatforms.includes(value)
    );
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        error:
          'Invalid platform parameter. Use "all" or a comma-separated list of: ' +
          allPlatforms.join(', '),
      });
    }

    const selectedPlatforms = new Set(platforms);

    const cacheKey = `${query.toLowerCase().trim()}|${[...selectedPlatforms].sort().join(',')}|${validLimit}`;

    console.log(`[search] q="${query}" limit=${validLimit} platforms=${[...selectedPlatforms].join(',')}`);

    // Check search cache
    const cached = getCached(searchCache, cacheKey, SEARCH_CACHE_TTL);
    if (cached) {
      const totalElapsed = Date.now() - requestStart;
      console.log(`[search] CACHE HIT in ${totalElapsed}ms for q="${query}"`);
      return res.json({ ...cached, meta: { ...cached.meta, elapsed_ms: totalElapsed, cached: true } });
    }

    const results = {};
    const timings = {};

    // Check retail cache first, only look up if not cached
    const retailCacheKey = query.toLowerCase().trim();
    let retailData = getCached(retailCache, retailCacheKey, RETAIL_CACHE_TTL) || { prices: [], medianRetailPrice: null };
    const needsRetail = !retailData.medianRetailPrice;

    const retailLookupPromise = needsRetail
      ? lookupRetailPrices(query, 10)
          .then((data) => {
            retailData = data;
            setCache(retailCache, retailCacheKey, data);
          })
          .catch((err) => { console.error(`[search] retail lookup failed: ${err.message}`); })
      : Promise.resolve();

    const entries = allPlatforms
      .filter((p) => selectedPlatforms.has(p))
      .map((name) => {
        const wrappedScraper = withTimeout(scraperMap[name], name, SCRAPER_TIMEOUT_MS);
        return wrappedScraper(query, validLimit).then((data) => {
          results[name] = data;
          timings[name] = { count: data.length };
        });
      });

    // Don't block on retail lookup — use a race with a 5s grace period
    const retailWithTimeout = Promise.race([
      retailLookupPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);

    await Promise.all([...entries, retailWithTimeout]);

    for (const p of allPlatforms) {
      if (!results[p]) results[p] = [];
      results[p] = filterByRelevance(results[p], query);
    }

    const cleaned = runPipeline(results, query);
    const finalResults = runGlobalPipeline(cleaned, query);

    const median = retailData.medianRetailPrice;
    if (median && median > 0) {
      for (const p of allPlatforms) {
        finalResults[p] = (finalResults[p] || []).map((item) => {
          if (!item.originalPrice && median > item.price) {
            return {
              ...item,
              originalPrice: median,
              discountPercent: Math.round(((median - item.price) / median) * 100),
            };
          }
          return item;
        });
      }
    }

    const totalElapsed = Date.now() - requestStart;
    console.log(`[search] completed in ${totalElapsed}ms | ${JSON.stringify(timings)} | retailMedian=${median}`);

    const responseBody = {
      query,
      limit: validLimit,
      platform: platformParam || 'all',
      results: finalResults,
      meta: {
        elapsed_ms: totalElapsed,
        timings,
        retailReference: {
          medianRetailPrice: median,
          sampleCount: retailData.prices.length,
        },
      },
    };

    setCache(searchCache, cacheKey, responseBody);

    return res.json(responseBody);
  } catch (error) {
    const totalElapsed = Date.now() - requestStart;
    console.error(`[search] fatal error after ${totalElapsed}ms:`, error);
    return res.status(500).json({ error: 'Failed to search products' });
  }
});

app.get('/retail-lookup', async (req, res) => {
  const start = Date.now();
  try {
    const query = req.query.q;
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 30);

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    console.log(`[retail-lookup] q="${query}" limit=${limit}`);

    const result = await Promise.race([
      lookupRetailPrices(query, limit),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Retail lookup timed out')), SCRAPER_TIMEOUT_MS)
      ),
    ]);

    const elapsed = Date.now() - start;
    console.log(`[retail-lookup] completed in ${elapsed}ms | ${result.prices.length} prices, median=${result.medianRetailPrice}`);

    return res.json({
      query,
      ...result,
      meta: { elapsed_ms: elapsed },
    });
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error(`[retail-lookup] failed in ${elapsed}ms: ${err.message}`);
    return res.json({ query: req.query.q, prices: [], medianRetailPrice: null, meta: { elapsed_ms: elapsed, error: err.message } });
  }
});

const port = process.env.PORT || 3005;
app.listen(port, () => {
  console.log(`Scraper API listening on ${port}`);
  console.log(`Platforms: ${allPlatforms.join(', ')}`);
  console.log(`Per-scraper timeout: ${SCRAPER_TIMEOUT_MS}ms`);
  console.log('Grailed: Algolia | Poshmark: Cheerio | eBay: Cheerio | Depop: Playwright');

  const { playwrightManager } = require('./lib/playwrightManager');
  playwrightManager.init()
    .catch((err) => {
      console.error('[warmup] Playwright init failed:', err.message);
    });
});
