// eBay scraper — uses the official Browse API instead of HTML scraping.
//
// Why we switched: from cloud IPs (Railway, Vercel functions, anything not
// residential), eBay's anti-bot returns 403 for ~100% of HTML requests
// regardless of UA, headers, or Playwright stealth tricks. Official API
// auth bypasses that entirely and gives us cleaner structured data.
//
// Auth model: OAuth 2.0 client_credentials flow.
//   1. POST /identity/v1/oauth2/token with HTTP Basic (App ID:Cert ID)
//   2. Receive access_token (valid 7200s)
//   3. Use Bearer token for Browse API calls
// We cache the token in-process for ~95% of its lifetime, so a busy
// server hits the OAuth endpoint roughly once every 2 hours.
//
// Required env vars (set on Railway):
//   EBAY_APP_ID    — Client ID from developer.ebay.com → "App ID (Client ID)"
//   EBAY_CERT_ID   — Client Secret, called "Cert ID (Client Secret)"
//
// Free tier: 5,000 calls/day on production. Auto-approved at signup.
// Sign up: https://developer.ebay.com → Get a Developer Account.

const axios = require('axios');

const APP_ID = process.env.EBAY_APP_ID || '';
const CERT_ID = process.env.EBAY_CERT_ID || '';

const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';

// Token cache. Refresh when within 5 minutes of expiry.
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (!APP_ID || !CERT_ID) return null;

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) return cachedToken;

  const basic = Buffer.from(`${APP_ID}:${CERT_ID}`).toString('base64');
  let r;
  try {
    r = await axios.post(
      OAUTH_URL,
      `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`,
      {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
        validateStatus: (s) => s < 500,
      }
    );
  } catch (err) {
    console.error('[eBay] OAuth request failed:', err.message);
    return null;
  }

  if (r.status !== 200 || !r.data || !r.data.access_token) {
    console.error('[eBay] OAuth got status', r.status, r.data && r.data.error_description);
    return null;
  }

  cachedToken = r.data.access_token;
  tokenExpiresAt = now + (r.data.expires_in || 7200) * 1000;
  return cachedToken;
}

function parseItem(raw) {
  if (!raw) return null;

  const title = (raw.title || '').toString().trim();
  if (!title) return null;

  const priceObj = raw.price || {};
  const price = parseFloat(priceObj.value);
  if (!Number.isFinite(price) || price <= 0) return null;
  const currency = (priceObj.currency || 'USD').toUpperCase();
  if (currency !== 'USD') return null;

  const image =
    (raw.image && raw.image.imageUrl) ||
    (raw.thumbnailImages && raw.thumbnailImages[0] && raw.thumbnailImages[0].imageUrl) ||
    null;
  if (!image) return null;

  const url = raw.itemWebUrl;
  if (!url) return null;

  const item = {
    title: title.length > 200 ? title.slice(0, 200) : title,
    price,
    image,
    url,
    source: 'ebay',
    _platformSearched: true,
  };

  // Optional metadata that helps downstream relevance ranking.
  if (typeof raw.condition === 'string') item.condition = raw.condition;
  if (raw.seller && typeof raw.seller.username === 'string') {
    item.seller = raw.seller.username;
  }

  // eBay surfaces a "marketingPrice" with the original price when an item is
  // discounted. Surface that for the discount-tier UI.
  const mp = raw.marketingPrice && raw.marketingPrice.originalPrice;
  if (mp && mp.value) {
    const orig = parseFloat(mp.value);
    if (Number.isFinite(orig) && orig > price) {
      item.originalPrice = orig;
      item.discountPercent = Math.round(((orig - price) / orig) * 100);
    }
  }

  return item;
}

async function scrapeEbay(query, limit = 10) {
  if (!query) return [];

  if (!APP_ID || !CERT_ID) {
    console.warn('[eBay] EBAY_APP_ID / EBAY_CERT_ID not set — returning []');
    return [];
  }

  const token = await getAccessToken();
  if (!token) return [];

  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(Math.max(limit, 1), 50)),
    // Filter to fashion + footwear category (Clothing, Shoes & Accessories =
    // category 11450). Without this, queries like "carhartt" return car
    // parts, etc. The fashion vertical also has the highest match rate.
    category_ids: '11450',
    // Prefer Buy It Now over auctions so the price is comparable to listings
    // on the other platforms (which are all fixed-price).
    filter: 'buyingOptions:{FIXED_PRICE}',
    sort: 'price',
  });

  let r;
  try {
    r = await axios.get(`${BROWSE_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        // Marketplace header is required for the Browse API.
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
      timeout: 15000,
      validateStatus: (s) => s < 500,
    });
  } catch (err) {
    console.error('[eBay] Browse API call failed:', err.message);
    return [];
  }

  if (r.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    console.warn('[eBay] 401 from Browse API — token cleared');
    return [];
  }
  if (r.status !== 200 || !r.data) {
    console.warn('[eBay] Browse API status', r.status, r.data && r.data.errors && r.data.errors[0]);
    return [];
  }

  const itemSummaries = Array.isArray(r.data.itemSummaries) ? r.data.itemSummaries : [];
  const results = [];
  for (const raw of itemSummaries) {
    if (results.length >= limit) break;
    const parsed = parseItem(raw);
    if (parsed) results.push(parsed);
  }

  if (results.length > 0) {
    console.log(`[eBay] Browse API returned ${results.length} items (from ${itemSummaries.length})`);
  }
  return results;
}

module.exports = { scrapeEbay };
