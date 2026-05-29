const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const { scrapeEbay } = require('./lib/ebayScraper');
const { scrapeDepop } = require('./lib/depopScraper');
const { scrapePoshmark } = require('./lib/poshmarkScraper');
const { scrapeEtsy } = require('./lib/etsyScraper');
const { scrapeGrailed } = require('./lib/grailedScraper');
const { scrapeVinted } = require('./lib/vintedScraper');
const { scrapeGoogleShopping, lookupRetailPrices } = require('./lib/googleShoppingScraper');
const { scrapeBoilerVintage } = require('./lib/boilerVintageScraper');
const { scrapeBeyondRetro, scrapePechugaVintage } = require('./lib/shopifyScraper');
const { filterByRelevance } = require('./lib/relevance');
const { runPipeline, runGlobalPipeline } = require('./lib/dataPipeline');
const { ingestSearchResults } = require('./lib/dataIngestion');
const apiAuth = require('./middleware/apiAuth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const SCRAPER_TIMEOUT_MS = 25000;
const PLAYWRIGHT_SCRAPER_TIMEOUT_MS = 38000; // eBay + Depop need more time for browser

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
  'vinted',
  'etsy',
  // Shopify-backed boutique vintage stores. Added 2026-05-29 to compensate
  // for eBay/Etsy returning 0 (env vars not set yet) and Depop's recurring
  // Playwright flakes. All HTTP-only, no Chromium pressure, no API keys.
  'beyond_retro',
  'pechuga_vintage',
];

// Campus-specific platforms — only included when the matching campus param is sent
const campusPlatforms = {
  purdue: ['boiler_vintage'],
};

// Google Shopping is disabled — blocks headless browsers from cloud IPs.
// eBay and Etsy now use official APIs (EBAY_APP_ID/EBAY_CERT_ID, ETSY_API_KEY)
// so they're back in `allPlatforms` above.
const disabledPlatforms = ['google_shopping'];

const scraperMap = {
  ebay: scrapeEbay,
  grailed: scrapeGrailed,
  depop: scrapeDepop,
  poshmark: scrapePoshmark,
  vinted: scrapeVinted,
  etsy: scrapeEtsy,
  google_shopping: scrapeGoogleShopping,
  boiler_vintage: scrapeBoilerVintage,
  beyond_retro: scrapeBeyondRetro,
  pechuga_vintage: scrapePechugaVintage,
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

// ── eBay Marketplace Account Deletion / Closure Notification endpoint ─────
//
// Required by eBay before they enable any production keyset (since 2022).
// Two responsibilities:
//
//   GET  ?challenge_code=xxx
//     eBay verifies endpoint ownership by sending a challenge_code. We
//     respond with sha256(challengeCode + verificationToken + endpointURL)
//     hex-encoded as { challengeResponse }.
//
//   POST { metadata, notification }
//     eBay calls this when an eBay user deletes their account, telling us
//     to purge any data we've stored about that user. naya doesn't store
//     eBay user PII — we only fetch public listings via the Browse API —
//     so we just acknowledge with 200 and log for audit.
//
// Required env vars on Railway:
//   EBAY_MKT_NOTIF_TOKEN     32–80 alphanumeric. Pick anything random and
//                            paste the SAME value in the eBay developer
//                            UI's "Verification Token" field.
//   EBAY_MKT_NOTIF_ENDPOINT  Full URL of THIS endpoint, e.g.
//                            https://scraper-api-production-d197.up.railway.app/api/ebay/marketplace-notification
//                            Must be exactly the same string you put in
//                            the eBay UI's "Notification Endpoint URL".

const EBAY_MKT_PATH = '/api/ebay/marketplace-notification';

app.get(EBAY_MKT_PATH, (req, res) => {
  const token = process.env.EBAY_MKT_NOTIF_TOKEN || '';
  const endpoint = process.env.EBAY_MKT_NOTIF_ENDPOINT || '';
  const challengeCode = req.query.challenge_code;

  if (!challengeCode) {
    return res.status(400).json({ error: 'challenge_code required' });
  }
  if (!token || !endpoint) {
    return res.status(500).json({
      error: 'EBAY_MKT_NOTIF_TOKEN and EBAY_MKT_NOTIF_ENDPOINT must be set',
    });
  }

  // eBay's documented hash algorithm: sha256(challengeCode + token + endpoint)
  const hash = crypto
    .createHash('sha256')
    .update(challengeCode)
    .update(token)
    .update(endpoint)
    .digest('hex');

  res.set('Content-Type', 'application/json');
  res.json({ challengeResponse: hash });
});

app.post(EBAY_MKT_PATH, (req, res) => {
  // We don't store any eBay user PII, so deletion notices require no action.
  // Log for compliance audit and acknowledge.
  const username = req.body && req.body.notification && req.body.notification.data && req.body.notification.data.username;
  console.log('[eBay] marketplace deletion notification received', username ? `for user=${username}` : '(no username in payload)');
  res.status(200).end();
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

    // Build the effective platform list, including any campus-specific ones
    const campusParam = (req.query.campus || '').toLowerCase();
    const extraPlatforms = campusPlatforms[campusParam] || [];
    const allAvailable = [...allPlatforms, ...extraPlatforms];

    let platforms = allAvailable;
    if (platformParam !== 'all' && platformParam !== 'both') {
      platforms = platformParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    const invalidPlatforms = platforms.filter(
      (value) => !allAvailable.includes(value) && !Object.values(campusPlatforms).flat().includes(value)
    );
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        error:
          'Invalid platform parameter. Use "all" or a comma-separated list of: ' +
          allAvailable.join(', '),
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

    // ── Per-request retail lookup is gated behind ENABLE_RETAIL_LOOKUP ──
    // Why: lookupRetailPrices() launches Chromium via Google Shopping. On
    // Railway Hobby containers the kernel runs out of PIDs/memory when
    // multiple Chromiums boot in parallel (one per Depop scrape + one per
    // retail lookup × N concurrent requests), producing EAGAIN errors and
    // eventually wedging the HTTP server. Production logs showed this path
    // failing with `spawn ... EAGAIN` on every request while returning
    // retailMedian=null anyway, so it was burning Chromium budget for zero
    // user value. Default OFF. Flip ENABLE_RETAIL_LOOKUP=1 once the
    // container has more headroom or once Playwright launches go through
    // a global semaphore.
    const retailEnabled = process.env.ENABLE_RETAIL_LOOKUP === '1';
    const retailLookupPromise = retailEnabled && needsRetail
      ? lookupRetailPrices(query, 10)
          .then((data) => {
            retailData = data;
            setCache(retailCache, retailCacheKey, data);
          })
          .catch((err) => { console.error(`[search] retail lookup failed: ${err.message}`); })
      : Promise.resolve();

    // eBay and Etsy moved to official APIs — pure HTTP now.
    // Only Depop still needs a real browser to bypass its anti-bot.
    const playwrightPlatforms = new Set(['depop']);
    const selected = allAvailable.filter((p) => selectedPlatforms.has(p) && scraperMap[p]);
    const httpPlatforms = selected.filter((p) => !playwrightPlatforms.has(p));
    // Depop first: eBay's Playwright fallback can be heavy on Railway memory; run Depop before eBay.
    const PW_ORDER = ['depop', 'ebay'];
    const pwPlatforms = selected
      .filter((p) => playwrightPlatforms.has(p))
      .sort((a, b) => {
        const ia = PW_ORDER.indexOf(a);
        const ib = PW_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

    const runScraper = (name) => {
      const timeoutMs = playwrightPlatforms.has(name) ? PLAYWRIGHT_SCRAPER_TIMEOUT_MS : SCRAPER_TIMEOUT_MS;
      const wrappedScraper = withTimeout(scraperMap[name], name, timeoutMs);
      return wrappedScraper(query, validLimit).then((data) => {
        results[name] = data;
        timings[name] = { count: data.length };
      });
    };

    // Run HTTP scrapers (grailed, poshmark, boiler_vintage) in parallel
    const httpPromises = httpPlatforms.map(runScraper);

    // Run Playwright scrapers (ebay, depop) sequentially to avoid memory pressure
    const runPlaywrightSequentially = async () => {
      for (let i = 0; i < pwPlatforms.length; i++) {
        const name = pwPlatforms[i];
        await runScraper(name);
        // Let the previous browser fully release memory before launching the next Playwright scraper
        if (i < pwPlatforms.length - 1) {
          // Let Chromium fully exit + free RAM before the next Playwright scraper (eBay after Depop).
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    };

    const retailWithTimeout = Promise.race([
      retailLookupPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);

    await Promise.all([
      ...httpPromises,
      runPlaywrightSequentially(),
      retailWithTimeout,
    ]);

    for (const p of allAvailable) {
      if (!results[p]) results[p] = [];
      results[p] = filterByRelevance(results[p], query);
    }

    const cleaned = runPipeline(results, query);
    const finalResults = runGlobalPipeline(cleaned, query);

    const median = retailData.medianRetailPrice;
    if (median && median > 0) {
      for (const p of allAvailable) {
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

    // Fire-and-forget: persist data to Supabase for analytics
    const campusSlug = req.query.campus || null;
    ingestSearchResults(query, finalResults, campusSlug).catch(() => {});

    return res.json(responseBody);
  } catch (error) {
    const totalElapsed = Date.now() - requestStart;
    console.error(`[search] fatal error after ${totalElapsed}ms:`, error);
    return res.status(500).json({ error: 'Failed to search products' });
  }
});

app.get('/retail-lookup', async (req, res) => {
  // Mirrors the per-search gate. Direct hits to this endpoint can also
  // OOM/EAGAIN the container; require explicit opt-in to use it.
  if (process.env.ENABLE_RETAIL_LOOKUP !== '1') {
    return res.json({ query: req.query.q, prices: [], medianRetailPrice: null, meta: { disabled: true } });
  }
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

// ── B2B / v1 API ──────────────────────────────────────────────────────────
//
// /api/price-check + /api/cross-listings are the unprotected handlers used by
// the consumer Next.js layer. /v1/price-check + /v1/cross-listings are the
// B2B-versioned aliases, gated by apiAuth (key check + monthly rate limit +
// fire-and-forget usage logging).

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function median(sortedAsc) {
  return percentile(sortedAsc, 0.5);
}

function buildPlatformBreakdown(items) {
  const groups = {};
  for (const item of items) {
    const src = item.source || 'unknown';
    if (!groups[src]) groups[src] = [];
    groups[src].push(item.price);
  }
  const out = {};
  for (const [src, prices] of Object.entries(groups)) {
    prices.sort((a, b) => a - b);
    out[src] = { median: median(prices), count: prices.length };
  }
  return out;
}

async function runLiveSearch(query, limit) {
  // Reuse the existing /search pipeline by calling it locally over HTTP.
  // Keeps the dedupe/rank/relevance logic in one place.
  //
  // Platform selection (post-API-migration):
  //   grailed, poshmark, vinted, ebay, etsy — HTTP-only, run in parallel
  //   depop                                  — Playwright, sequential, ~30s
  //
  // The 5 HTTP scrapers each take ~1-5s and run concurrently, so the wall
  // clock for them is bounded by the slowest one (~5s). Total worst-case
  // budget: ~35s including Depop. Comfortably under the 50s abort window.
  const port = process.env.PORT || 3005;
  const platforms = 'grailed,depop,poshmark,vinted,ebay,etsy';
  const url = `http://127.0.0.1:${port}/search?q=${encodeURIComponent(query)}&limit=${limit}&platform=${platforms}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function priceCheckHandler(req, res) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  const userPrice = parseFloat(req.query.price);
  const hasUserPrice = Number.isFinite(userPrice) && userPrice > 0;

  const body = await runLiveSearch(query, 25);
  if (!body || !body.results) {
    return res.json({
      query,
      medianPrice: null,
      p25: null,
      p75: null,
      count: 0,
      priceRange: null,
      byPlatform: {},
      dealScore: 'fair',
      _source: 'none',
    });
  }

  const allItems = [];
  for (const [platform, items] of Object.entries(body.results)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const p = typeof item.price === 'number' ? item.price : parseFloat(item.price);
      if (Number.isFinite(p) && p > 0) {
        allItems.push({ price: p, source: platform });
      }
    }
  }

  if (allItems.length === 0) {
    return res.json({
      query,
      medianPrice: null,
      p25: null,
      p75: null,
      count: 0,
      priceRange: null,
      byPlatform: {},
      dealScore: 'fair',
      _source: 'live',
    });
  }

  const prices = allItems.map((i) => i.price).sort((a, b) => a - b);
  const med = median(prices);
  const p25 = percentile(prices, 0.25);
  const p75 = percentile(prices, 0.75);

  let dealScore;
  if (hasUserPrice) {
    if (userPrice <= p25) dealScore = 'good';
    else if (userPrice <= p75) dealScore = 'fair';
    else dealScore = 'high';
  } else {
    // No specific listing price — we're reporting the market, not judging it.
    dealScore = 'fair';
  }

  return res.json({
    query,
    medianPrice: med,
    p25,
    p75,
    count: prices.length,
    priceRange: { min: prices[0], max: prices[prices.length - 1] },
    byPlatform: buildPlatformBreakdown(allItems),
    userPrice: hasUserPrice ? userPrice : null,
    dealScore,
    _source: 'live',
  });
}

async function crossListingsHandler(req, res) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  const currentSource = (typeof req.query.source === 'string' ? req.query.source : '')
    .toLowerCase()
    .trim();
  const currentPrice = parseFloat(req.query.price);
  const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;

  const body = await runLiveSearch(query, 15);
  if (!body || !body.results) {
    return res.json({ query, currentSource: currentSource || null, listings: [] });
  }

  const listings = [];
  for (const [platform, items] of Object.entries(body.results)) {
    if (!Array.isArray(items)) continue;
    if (platform.toLowerCase() === currentSource) continue;
    for (const item of items) {
      const p = typeof item.price === 'number' ? item.price : parseFloat(item.price);
      if (!Number.isFinite(p) || p <= 0) continue;
      listings.push({
        title: item.title || '',
        price: Math.round(p * 100) / 100,
        source: platform,
        url: item.url || '',
        image: item.image || '',
      });
    }
  }

  listings.sort((a, b) => a.price - b.price);
  const top = listings.slice(0, 6);
  const cheaperCount = hasCurrentPrice ? top.filter((l) => l.price < currentPrice).length : 0;

  return res.json({
    query,
    currentSource: currentSource || null,
    currentPrice: hasCurrentPrice ? currentPrice : null,
    cheaperCount,
    listings: top,
  });
}

// Consumer (unprotected) — used by the Next.js layer if it ever wants to skip
// its own /api/price-check route and go straight to Express.
app.get('/api/price-check', priceCheckHandler);
app.get('/api/cross-listings', crossListingsHandler);

// B2B (apiAuth-protected) — versioned aliases for external customers.
app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/v1/price-check', apiAuth, priceCheckHandler);
app.get('/v1/cross-listings', apiAuth, crossListingsHandler);

const port = process.env.PORT || 3005;
app.listen(port, () => {
  console.log(`Scraper API listening on ${port}`);
  console.log(`Platforms: ${allPlatforms.join(', ')}`);
  console.log(`Per-scraper timeout: ${SCRAPER_TIMEOUT_MS}ms (Playwright: ${PLAYWRIGHT_SCRAPER_TIMEOUT_MS}ms)`);
  console.log('Grailed: Algolia | Poshmark: Cheerio | Vinted: API | eBay: Browse API | Etsy: v3 API | Depop: Playwright');

  const { getSupabase } = require('./lib/supabaseClient');
  const sb = getSupabase();
  console.log(`[supabase] ${sb ? 'connected' : 'NOT configured — set SUPABASE_URL + SUPABASE_SERVICE_KEY'}`);
});
