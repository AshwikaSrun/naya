// Generic Shopify storefront scraper.
//
// Most independent vintage / resale boutiques run on Shopify, which exposes
// a public, unauthenticated, anti-bot-free search endpoint:
//
//   GET https://<store>/search/suggest.json
//       ?q=<query>
//       &resources[type]=product
//       &resources[limit]=<n>
//
// Response shape (standard across Shopify):
//   { resources: { results: { products: [ Product, ... ] } } }
//
// Each Product carries title, price (string, store-local currency),
// vendor, image / featured_image, handle, url, available, tags, type, and
// compare_at_price_max for sale-price discount calc.
//
// We added Shopify support during the May 29 outage triage when we needed
// new sources but found Mercari (Cloudflare turnstile), The RealReal
// (cloud-IP 403), Vestiaire (JS-only SPA, no SSR data), and ThredUp
// (Cloudflare-protected, brittle DOM) all unreachable from Railway without
// Playwright or a residential proxy. Indie Shopify vintage stores filled
// the gap with cleaner, more curated inventory.
//
// To add another store, just push a new createShopifyScraper({...}) call
// at the bottom and register it in server.js.

const axios = require('axios');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Hard-coded approximate USD conversion rates for Shopify stores whose
// price field is in a non-USD currency. The Shopify suggest endpoint
// doesn't include a currency code per product, so we infer it from the
// store config below.
//
// These are not live FX rates — we don't want a forex API dependency just
// to ballpark a $vs£ comparison in the UI. The numbers are close enough
// for "is this in my budget" decisions; users with sub-1% precision needs
// can click through to the store anyway.
const FOREX_TO_USD = {
  USD: 1.0,
  GBP: 1.27,
  EUR: 1.08,
  CAD: 0.74,
  AUD: 0.66,
};

function parseShopifyProduct(raw, { domain, source, currency }) {
  if (!raw) return null;
  // Skip sold-out listings — they're not useful in a search result UI.
  if (raw.available === false) return null;

  const title = (raw.title || '').toString().trim();
  if (!title) return null;

  const priceLocal = parseFloat(raw.price);
  if (!Number.isFinite(priceLocal) || priceLocal <= 0) return null;
  const fx = FOREX_TO_USD[currency] || 1;
  const price = Math.round(priceLocal * fx * 100) / 100;

  // Prefer the larger featured_image.url; fall back to the raw image field.
  const image =
    (raw.featured_image && raw.featured_image.url) ||
    raw.image ||
    null;
  if (!image || typeof image !== 'string') return null;

  const relUrl = raw.url || (raw.handle ? `/products/${raw.handle}` : null);
  if (!relUrl) return null;
  const url = relUrl.startsWith('http') ? relUrl : `https://${domain}${relUrl}`;

  const item = {
    title: title.length > 200 ? title.slice(0, 200) : title,
    price,
    image,
    url,
    source,
    _platformSearched: true,
  };

  if (raw.vendor && typeof raw.vendor === 'string') {
    item.brand = raw.vendor;
  }

  const compareLocal = parseFloat(raw.compare_at_price_max);
  if (Number.isFinite(compareLocal) && compareLocal > priceLocal) {
    const originalUsd = Math.round(compareLocal * fx * 100) / 100;
    if (originalUsd > price) {
      item.originalPrice = originalUsd;
      item.discountPercent = Math.round(((originalUsd - price) / originalUsd) * 100);
    }
  }

  return item;
}

function createShopifyScraper({ domain, source, currency = 'USD', label }) {
  const tag = label || source;
  return async function scrape(query, limit = 10) {
    if (!query) return [];

    // Ask for 2x limit so we still have padding after the available/parse
    // filters drop sold-out or malformed entries. Shopify caps the
    // suggest endpoint at a fairly small `resources[limit]`; 20 is safe.
    const ask = Math.min(Math.max(limit * 2, 5), 20);
    const url = `https://${domain}/search/suggest.json?q=${encodeURIComponent(query)}&resources%5Btype%5D=product&resources%5Blimit%5D=${ask}`;

    let r;
    try {
      r = await axios.get(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 12000,
        maxRedirects: 5,
        validateStatus: (s) => s < 500,
      });
    } catch (err) {
      console.error(`[${tag}] request failed: ${err.message}`);
      return [];
    }

    if (r.status !== 200) {
      console.warn(`[${tag}] non-200 status=${r.status}`);
      return [];
    }

    const products =
      r.data &&
      r.data.resources &&
      r.data.resources.results &&
      Array.isArray(r.data.resources.results.products)
        ? r.data.resources.results.products
        : [];

    if (products.length === 0) return [];

    const results = [];
    for (const raw of products) {
      if (results.length >= limit) break;
      const parsed = parseShopifyProduct(raw, { domain, source, currency });
      if (parsed) results.push(parsed);
    }

    if (results.length > 0) {
      console.log(
        `[${tag}] returned ${results.length} items (from ${products.length} suggest items)`
      );
    }
    return results;
  };
}

// ─── Configured stores ──────────────────────────────────────────────────
//
// Add a new store: copy a block, fill in domain + currency, give it a
// stable lower_snake `source` slug, then register it in server.js
// (scraperMap + allPlatforms).

// Beyond Retro — large UK vintage warehouse, broad inventory across
// denim, designer, sportswear, knits. Strong on common queries
// (ralph lauren, levi, dior, y2k). Prices in GBP, FX-converted to USD.
const scrapeBeyondRetro = createShopifyScraper({
  domain: 'www.beyondretro.com',
  source: 'beyond_retro',
  currency: 'GBP',
  label: 'BeyondRetro',
});

// Pechuga Vintage — NYC-based curated archive store. High-end designer,
// strong fit for the itgirl / curated / elite presets in
// new-finds/route.ts (miu miu, dior, chloe, margiela). Prices in USD.
const scrapePechugaVintage = createShopifyScraper({
  domain: 'www.pechugavintage.com',
  source: 'pechuga_vintage',
  currency: 'USD',
  label: 'Pechuga',
});

module.exports = {
  createShopifyScraper,
  scrapeBeyondRetro,
  scrapePechugaVintage,
};
