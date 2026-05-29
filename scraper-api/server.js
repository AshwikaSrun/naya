/**
 * naya scraper API — Express entrypoint.
 *
 * Responsibilities:
 *   - Multi-platform search fan-out (HTTP scrapers in parallel,
 *     Playwright scrapers sequentially to control memory).
 *   - Per-scraper timeout + circuit breaker (fail fast when a platform
 *     starts misbehaving so one bad scraper doesn't degrade every search).
 *   - LRU caches for search responses and retail-reference lookups.
 *   - Versioned B2B endpoints (/v1/*) gated by api-key middleware.
 *   - Structured JSON access log + Prometheus /metrics exposition.
 *   - Graceful SIGTERM/SIGINT shutdown that drains inflight requests
 *     and closes the Chromium pool.
 */

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
const { filterByRelevance } = require('./lib/relevance');
const { runPipeline, runGlobalPipeline } = require('./lib/dataPipeline');
const { ingestSearchResults } = require('./lib/dataIngestion');
const apiAuth = require('./middleware/apiAuth');

const { percentile, median, buildPlatformBreakdown, dealScore } = require('./lib/stats');
const { LRUCache } = require('./lib/lruCache');
const { CircuitBreaker } = require('./lib/circuitBreaker');
const { validate, str, num, oneOf } = require('./lib/validate');
const {
  log,
  metrics,
  registry,
  requestContext,
  accessLog,
  errorEnvelope,
} = require('./lib/observability');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(requestContext);
app.use(accessLog);

const SCRAPER_TIMEOUT_MS = 25000;
const PLAYWRIGHT_SCRAPER_TIMEOUT_MS = 38000;

// ── caches ───────────────────────────────────────────────────────────────

const searchCache = new LRUCache({
  name: 'search',
  max: 200,
  ttlMs: 5 * 60 * 1000,
});
const retailCache = new LRUCache({
  name: 'retail',
  max: 500,
  ttlMs: 30 * 60 * 1000,
});

function cacheGet(cache, key) {
  const v = cache.get(key);
  if (v === undefined) {
    metrics.cacheMissesTotal.inc({ cache: cache.name });
    return null;
  }
  metrics.cacheHitsTotal.inc({ cache: cache.name });
  return v;
}

function cacheSet(cache, key, value) {
  // Don't cache empty search results — they're usually transient failures.
  if (value && value.results) {
    const totalItems = Object.values(value.results)
      .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    if (totalItems === 0) return;
  }
  cache.set(key, value);
}

// ── platform registry ────────────────────────────────────────────────────

const allPlatforms = ['ebay', 'grailed', 'depop', 'poshmark', 'vinted', 'etsy'];
const campusPlatforms = { purdue: ['boiler_vintage'] };
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
};

// One breaker per platform. After 4 failures within a 60s window the
// breaker opens for 30s; a single probe call closes it again.
const breakers = {};
for (const p of [...allPlatforms, ...Object.values(campusPlatforms).flat()]) {
  breakers[p] = new CircuitBreaker({
    name: p,
    failureThreshold: 4,
    windowMs: 60 * 1000,
    cooldownMs: 30 * 1000,
    halfOpenMaxCalls: 1,
    onTransition: (name, from, to) => {
      log.warn('breaker.transition', { scraper: name, from, to });
      metrics.circuitBreakerState.inc({ scraper: name, state: to });
    },
  });
}

/**
 * Wrap a scraper with:
 *   1. Circuit-breaker fast-fail (returns [] if open).
 *   2. Wall-clock timeout via Promise.race.
 *   3. Latency + outcome metrics.
 *
 * Always resolves with an array, never throws — one bad scraper must not
 * fail the whole search.
 */
function withResilience(fn, name, timeoutMs) {
  const breaker = breakers[name];

  return async (...args) => {
    if (breaker && !breaker.allow()) {
      metrics.scraperRunsTotal.inc({ platform: name, outcome: 'breaker_open' });
      log.warn('scraper.skipped_breaker_open', { scraper: name });
      return [];
    }

    const start = Date.now();
    try {
      const result = await Promise.race([
        fn(...args),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(Object.assign(new Error(`${name} timed out after ${timeoutMs}ms`), { code: 'timeout' })),
            timeoutMs
          )
        ),
      ]);
      const elapsed = Date.now() - start;
      const arr = Array.isArray(result) ? result : [];
      if (breaker) breaker.recordSuccess();
      metrics.scraperRunsTotal.inc({ platform: name, outcome: 'ok' });
      metrics.scraperDurationMs.observe({ platform: name }, elapsed);
      metrics.scraperItems.observe({ platform: name }, arr.length);
      log.info('scraper.ok', { scraper: name, items: arr.length, elapsed_ms: elapsed });
      return arr;
    } catch (err) {
      const elapsed = Date.now() - start;
      if (breaker) breaker.recordFailure();
      const outcome = err.code === 'timeout' ? 'timeout' : 'error';
      metrics.scraperRunsTotal.inc({ platform: name, outcome });
      metrics.scraperDurationMs.observe({ platform: name }, elapsed);
      log.error('scraper.failed', {
        scraper: name,
        outcome,
        elapsed_ms: elapsed,
        err: err.message,
      });
      return [];
    }
  };
}

// ── routes ───────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    platforms: allPlatforms,
    uptime: process.uptime(),
    breakers: Object.values(breakers).map((b) => b.snapshot()),
    caches: {
      search: { size: searchCache.size, hitRate: searchCache.hitRate(), stats: searchCache.stats },
      retail: { size: retailCache.size, hitRate: retailCache.hitRate(), stats: retailCache.stats },
    },
  });
});

app.get('/metrics', (_req, res) => {
  res.type('text/plain; version=0.0.4').send(registry.render());
});

// ── eBay marketplace deletion notification ─────
// Required by eBay before they enable any production keyset. Two
// responsibilities: respond to the GET challenge handshake, and accept
// POST notifications when an eBay user deletes their account (we store
// no PII so we just ack with 200).

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
  const username =
    req.body && req.body.notification && req.body.notification.data && req.body.notification.data.username;
  log.info('ebay.deletion_notification', { username: username || null });
  res.status(200).end();
});

// ── main search ──────────────────────────────────────────────────────────

const searchSchema = {
  q:        str({ required: true, trim: true, max: 200 }),
  limit:    num({ default: 10, min: 1, max: 50, integer: true, coerce: true }),
  platform: str({ default: 'all', max: 200, trim: true }),
  campus:   str({ required: false, max: 40, trim: true }),
};

app.get('/search', async (req, res, next) => {
  const requestStart = Date.now();
  const { value: params, error: validationError } = validate(req.query, searchSchema);
  if (validationError) return next(validationError);

  try {
    const { q: query, limit: validLimit, platform: platformParam, campus: campusParam } = params;

    const extraPlatforms = campusPlatforms[(campusParam || '').toLowerCase()] || [];
    const allAvailable = [...allPlatforms, ...extraPlatforms];

    const platformLower = String(platformParam || 'all').toLowerCase();
    let platforms = allAvailable;
    if (platformLower !== 'all' && platformLower !== 'both') {
      platforms = platformLower.split(',').map((p) => p.trim()).filter(Boolean);
    }

    const invalidPlatforms = platforms.filter(
      (v) => !allAvailable.includes(v) && !Object.values(campusPlatforms).flat().includes(v)
    );
    if (invalidPlatforms.length > 0) {
      const err = new Error(`Invalid platform: ${invalidPlatforms.join(', ')}. Use "all" or one of: ${allAvailable.join(', ')}`);
      err.status = 400;
      err.code = 'invalid_platform';
      throw err;
    }

    const selectedPlatforms = new Set(platforms);

    const cacheKey = `${query.toLowerCase()}|${[...selectedPlatforms].sort().join(',')}|${validLimit}`;

    log.info('search.start', {
      query,
      limit: validLimit,
      platforms: [...selectedPlatforms],
    });

    const cached = cacheGet(searchCache, cacheKey);
    if (cached) {
      const totalElapsed = Date.now() - requestStart;
      log.info('search.cache_hit', { query, elapsed_ms: totalElapsed });
      return res.json({ ...cached, meta: { ...cached.meta, elapsed_ms: totalElapsed, cached: true } });
    }

    const results = {};
    const timings = {};

    const retailCacheKey = query.toLowerCase();
    let retailData =
      cacheGet(retailCache, retailCacheKey) || { prices: [], medianRetailPrice: null };
    const needsRetail = !retailData.medianRetailPrice;

    const retailLookupPromise = needsRetail
      ? lookupRetailPrices(query, 10)
          .then((data) => {
            retailData = data;
            cacheSet(retailCache, retailCacheKey, data);
          })
          .catch((err) => log.warn('retail_lookup.failed', { err: err.message }))
      : Promise.resolve();

    const playwrightPlatforms = new Set(['depop']);
    const selected = allAvailable.filter((p) => selectedPlatforms.has(p) && scraperMap[p]);
    const httpPlatforms = selected.filter((p) => !playwrightPlatforms.has(p));
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
      const wrapped = withResilience(scraperMap[name], name, timeoutMs);
      return wrapped(query, validLimit).then((data) => {
        results[name] = data;
        timings[name] = { count: data.length };
      });
    };

    const httpPromises = httpPlatforms.map(runScraper);

    const runPlaywrightSequentially = async () => {
      for (let i = 0; i < pwPlatforms.length; i++) {
        await runScraper(pwPlatforms[i]);
        if (i < pwPlatforms.length - 1) {
          // Let Chromium free its RAM before launching the next browser.
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    };

    const retailWithTimeout = Promise.race([
      retailLookupPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);

    await Promise.all([...httpPromises, runPlaywrightSequentially(), retailWithTimeout]);

    for (const p of allAvailable) {
      if (!results[p]) results[p] = [];
      results[p] = filterByRelevance(results[p], query);
    }

    const cleaned = runPipeline(results, query);
    const finalResults = runGlobalPipeline(cleaned, query);

    const retailMedian = retailData.medianRetailPrice;
    if (retailMedian && retailMedian > 0) {
      for (const p of allAvailable) {
        finalResults[p] = (finalResults[p] || []).map((item) => {
          if (!item.originalPrice && retailMedian > item.price) {
            return {
              ...item,
              originalPrice: retailMedian,
              discountPercent: Math.round(((retailMedian - item.price) / retailMedian) * 100),
            };
          }
          return item;
        });
      }
    }

    const totalElapsed = Date.now() - requestStart;
    log.info('search.complete', {
      query,
      elapsed_ms: totalElapsed,
      timings,
      retail_median: retailMedian,
    });

    const responseBody = {
      query,
      limit: validLimit,
      platform: platformParam || 'all',
      results: finalResults,
      meta: {
        elapsed_ms: totalElapsed,
        timings,
        retailReference: {
          medianRetailPrice: retailMedian,
          sampleCount: retailData.prices.length,
        },
      },
    };

    cacheSet(searchCache, cacheKey, responseBody);

    // Fire-and-forget analytics ingest. Never blocks the response.
    const campusSlug = campusParam || null;
    ingestSearchResults(query, finalResults, campusSlug).catch((err) => {
      log.warn('ingest.failed', { err: err.message });
    });

    return res.json(responseBody);
  } catch (err) {
    return next(err);
  }
});

// ── retail lookup ────────────────────────────────────────────────────────

const retailSchema = {
  q:     str({ required: true, trim: true, max: 200 }),
  limit: num({ default: 10, min: 1, max: 30, integer: true, coerce: true }),
};

app.get('/retail-lookup', async (req, res, next) => {
  const start = Date.now();
  const { value: params, error: validationError } = validate(req.query, retailSchema);
  if (validationError) return next(validationError);

  try {
    const { q: query, limit } = params;
    log.info('retail_lookup.start', { query, limit });

    const result = await Promise.race([
      lookupRetailPrices(query, limit),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Retail lookup timed out')), SCRAPER_TIMEOUT_MS)
      ),
    ]);

    const elapsed = Date.now() - start;
    log.info('retail_lookup.complete', {
      query,
      elapsed_ms: elapsed,
      prices: result.prices.length,
      median: result.medianRetailPrice,
    });

    return res.json({ query, ...result, meta: { elapsed_ms: elapsed } });
  } catch (err) {
    const elapsed = Date.now() - start;
    log.warn('retail_lookup.failed', { err: err.message, elapsed_ms: elapsed });
    return res.json({
      query: req.query.q,
      prices: [],
      medianRetailPrice: null,
      meta: { elapsed_ms: elapsed, error: err.message },
    });
  }
});

// ── B2B / v1 API ─────────────────────────────────────────────────────────
//
// /api/price-check + /api/cross-listings are the unprotected handlers the
// consumer Next.js layer hits. /v1/price-check + /v1/cross-listings are
// the versioned aliases gated by apiAuth (key validation + monthly rate
// limit + fire-and-forget usage logging).

async function runLiveSearch(query, limit) {
  // Reuses /search end-to-end so dedupe/rank/relevance live in one place.
  const port = process.env.PORT || 3005;
  const platforms = 'grailed,depop,poshmark,vinted,ebay,etsy';
  const url = `http://127.0.0.1:${port}/search?q=${encodeURIComponent(query)}&limit=${limit}&platform=${platforms}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    log.warn('runLiveSearch.failed', { err: err.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const priceCheckSchema = {
  q:     str({ required: true, trim: true, max: 200 }),
  price: num({ required: false, min: 0, max: 100000, coerce: true }),
};

async function priceCheckHandler(req, res, next) {
  const { value: params, error: validationError } = validate(req.query, priceCheckSchema);
  if (validationError) return next(validationError);
  const { q: query, price: userPrice } = params;
  const hasUserPrice = Number.isFinite(userPrice) && userPrice > 0;

  const body = await runLiveSearch(query, 25);
  if (!body || !body.results) {
    return res.json({
      query, medianPrice: null, p25: null, p75: null, count: 0,
      priceRange: null, byPlatform: {}, dealScore: 'fair', _source: 'none',
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
      query, medianPrice: null, p25: null, p75: null, count: 0,
      priceRange: null, byPlatform: {}, dealScore: 'fair', _source: 'live',
    });
  }

  const prices = allItems.map((i) => i.price).sort((a, b) => a - b);
  const med = median(prices);
  const p25 = percentile(prices, 0.25);
  const p75 = percentile(prices, 0.75);

  return res.json({
    query,
    medianPrice: med,
    p25,
    p75,
    count: prices.length,
    priceRange: { min: prices[0], max: prices[prices.length - 1] },
    byPlatform: buildPlatformBreakdown(allItems),
    userPrice: hasUserPrice ? userPrice : null,
    dealScore: hasUserPrice ? dealScore(userPrice, p25, p75) : 'fair',
    _source: 'live',
  });
}

const crossListingsSchema = {
  q:      str({ required: true, trim: true, max: 200 }),
  source: oneOf(['grailed', 'poshmark', 'depop', 'vinted', 'ebay', 'etsy', 'boiler_vintage'], { required: false }),
  price:  num({ required: false, min: 0, max: 100000, coerce: true }),
};

async function crossListingsHandler(req, res, next) {
  const { value: params, error: validationError } = validate(req.query, crossListingsSchema);
  if (validationError) return next(validationError);
  const { q: query, source: currentSource, price: currentPrice } = params;
  const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;

  const body = await runLiveSearch(query, 15);
  if (!body || !body.results) {
    return res.json({ query, currentSource: currentSource || null, listings: [] });
  }

  const listings = [];
  for (const [platform, items] of Object.entries(body.results)) {
    if (!Array.isArray(items)) continue;
    if (platform === currentSource) continue;
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

app.get('/api/price-check', priceCheckHandler);
app.get('/api/cross-listings', crossListingsHandler);

app.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/v1/price-check', apiAuth, priceCheckHandler);
app.get('/v1/cross-listings', apiAuth, crossListingsHandler);

// Final error handler — must be last middleware.
app.use(errorEnvelope);

// ── boot + graceful shutdown ─────────────────────────────────────────────

const port = process.env.PORT || 3005;
const server = app.listen(port, () => {
  log.info('startup', {
    port,
    platforms: allPlatforms,
    scraper_timeout_ms: SCRAPER_TIMEOUT_MS,
    playwright_timeout_ms: PLAYWRIGHT_SCRAPER_TIMEOUT_MS,
  });

  const { getSupabase } = require('./lib/supabaseClient');
  log.info('supabase.status', { connected: !!getSupabase() });
});

const SHUTDOWN_GRACE_MS = 15000;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('shutdown.begin', { signal });

  const forceExit = setTimeout(() => {
    log.error('shutdown.force_exit', { signal });
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);
  forceExit.unref();

  // Stop accepting new connections; existing requests drain naturally.
  server.close(async () => {
    log.info('shutdown.http_closed');

    try {
      // Best-effort: tear down the browser pool if it was initialised.
      const { playwrightManager } = require('./lib/playwrightManager');
      const browsers = playwrightManager.browsers || [];
      await Promise.all(
        browsers.filter(Boolean).map((b) => b.close().catch(() => {}))
      );
      log.info('shutdown.pool_closed', { count: browsers.filter(Boolean).length });
    } catch (err) {
      log.warn('shutdown.pool_close_failed', { err: err.message });
    }

    log.info('shutdown.done');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  log.fatal('uncaughtException', { err: err.message, stack: err.stack });
});
process.on('unhandledRejection', (err) => {
  log.error('unhandledRejection', { err: err && err.message ? err.message : String(err) });
});

module.exports = { app, server, shutdown };
