const express = require('express');
const cors = require('cors');

const { scrapeEbay } = require('./lib/ebayScraper');
const { scrapeDepop } = require('./lib/depopScraper');
const { scrapePoshmark } = require('./lib/poshmarkScraper');
const { scrapeEtsy } = require('./lib/etsyScraper');
const { scrapeGrailed } = require('./lib/grailedScraper');
const { scrapeGoogleShopping } = require('./lib/googleShoppingScraper');

const app = express();
app.use(cors());

const SCRAPER_TIMEOUT_MS = 25000;

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

    console.log(`[search] q="${query}" limit=${validLimit} platforms=${[...selectedPlatforms].join(',')}`);

    const results = {};
    const timings = {};

    const entries = allPlatforms
      .filter((p) => selectedPlatforms.has(p))
      .map((name) => {
        const wrappedScraper = withTimeout(scraperMap[name], name, SCRAPER_TIMEOUT_MS);
        return wrappedScraper(query, validLimit).then((data) => {
          results[name] = data;
          timings[name] = { count: data.length };
        });
      });

    await Promise.all(entries);

    for (const p of allPlatforms) {
      if (!results[p]) results[p] = [];
    }

    const totalElapsed = Date.now() - requestStart;
    console.log(`[search] completed in ${totalElapsed}ms | ${JSON.stringify(timings)}`);

    return res.json({
      query,
      limit: validLimit,
      platform: platformParam || 'all',
      results,
      meta: { elapsed_ms: totalElapsed, timings },
    });
  } catch (error) {
    const totalElapsed = Date.now() - requestStart;
    console.error(`[search] fatal error after ${totalElapsed}ms:`, error);
    return res.status(500).json({ error: 'Failed to search products' });
  }
});

const port = process.env.PORT || 3005;
app.listen(port, () => {
  console.log(`Scraper API listening on ${port}`);
  console.log(`Platforms: ${allPlatforms.join(', ')}`);
  console.log(`Per-scraper timeout: ${SCRAPER_TIMEOUT_MS}ms`);

  // Warm up Playwright browser on startup so first search isn't slow
  const { playwrightManager } = require('./lib/playwrightManager');
  playwrightManager.createBrowser().then((browser) => {
    console.log('[warmup] Playwright browser ready');
    playwrightManager.closeBrowser(browser);
  }).catch((err) => {
    console.error('[warmup] Playwright warmup failed:', err.message);
  });
});
