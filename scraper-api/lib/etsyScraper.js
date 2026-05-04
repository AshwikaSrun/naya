// Etsy scraper — uses the official v3 Open API instead of HTML scraping.
//
// Why we switched: Etsy returns 403 to all non-browser User-Agents from
// cloud IPs, even with rotating headers. Their public listings endpoint
// accepts a simple `x-api-key` header and serves the same data with no
// anti-bot drama and 10k calls/day free.
//
// Etsy's API quirk: the listings endpoint only returns metadata (no images).
// Images come from a SEPARATE endpoint per listing. We could either:
//   (a) batch-fetch images with one request per listing (10 calls per query)
//   (b) request `includes=Images` on the listings call to inline them
//   (c) skip images
// We use (b): the v3 API supports an `includes` query param that joins
// images into the response, costing one API call per query total.
//
// Required env var (set on Railway):
//   ETSY_API_KEY  — "Keystring" from etsy.com/developers → Your Apps
//
// Free tier: 10,000 calls/day. Created at signup, no review.
// Sign up: https://www.etsy.com/developers/your-apps

const axios = require('axios');

const API_KEY = process.env.ETSY_API_KEY || '';
const SEARCH_URL = 'https://openapi.etsy.com/v3/application/listings/active';

function pickImage(raw) {
  if (!raw) return null;
  // When `includes=Images` is set, the response inlines a `images` array.
  const imgs = raw.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    return (
      first.url_fullxfull ||
      first.url_570xN ||
      first.url_300x300 ||
      first.url_170x135 ||
      null
    );
  }
  return null;
}

function buildListingUrl(raw) {
  if (raw && typeof raw.url === 'string') return raw.url;
  if (raw && raw.listing_id) return `https://www.etsy.com/listing/${raw.listing_id}`;
  return null;
}

function parseItem(raw) {
  if (!raw) return null;

  const title = (raw.title || '').toString().trim();
  if (!title) return null;

  // Etsy v3 returns price as { amount: 9999, divisor: 100, currency_code: 'USD' }
  // where amount/divisor = the dollar value.
  const priceObj = raw.price || {};
  const amt = parseFloat(priceObj.amount);
  const div = parseFloat(priceObj.divisor) || 100;
  const price = Number.isFinite(amt) ? amt / div : NaN;
  if (!Number.isFinite(price) || price <= 0) return null;

  const currency = (priceObj.currency_code || 'USD').toUpperCase();
  if (currency !== 'USD') return null;

  const image = pickImage(raw);
  if (!image) return null;

  const url = buildListingUrl(raw);
  if (!url) return null;

  const item = {
    title: title.length > 200 ? title.slice(0, 200) : title,
    price,
    image,
    url,
    source: 'etsy',
    _platformSearched: true,
  };

  if (typeof raw.taxonomy_path === 'object' && Array.isArray(raw.taxonomy_path) && raw.taxonomy_path.length > 0) {
    item.category = raw.taxonomy_path.join(' / ');
  }

  return item;
}

async function scrapeEtsy(query, limit = 10) {
  if (!query) return [];

  if (!API_KEY) {
    console.warn('[Etsy] ETSY_API_KEY not set — returning []');
    return [];
  }

  const params = new URLSearchParams({
    keywords: query,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    sort_on: 'score',
    sort_order: 'desc',
    // Inline images so we don't need a per-listing follow-up call.
    includes: 'Images',
    // Filter to vintage clothing + accessories taxonomies. Etsy taxonomy
    // IDs: 68887200 = Clothing, 69152366 = Vintage Clothing. We deliberately
    // include both; passing the comma-list does an OR.
    // Without this filter, "carhartt" returns Etsy crafts unrelated to
    // resale fashion (fabric scraps, patches, sewing kits).
    taxonomy_id: '68887200,69152366',
  });

  let r;
  try {
    r = await axios.get(`${SEARCH_URL}?${params.toString()}`, {
      headers: {
        'x-api-key': API_KEY,
        Accept: 'application/json',
      },
      timeout: 15000,
      validateStatus: (s) => s < 500,
    });
  } catch (err) {
    console.error('[Etsy] API call failed:', err.message);
    return [];
  }

  if (r.status === 401 || r.status === 403) {
    console.warn(`[Etsy] auth error ${r.status}: ${(r.data && r.data.error) || 'check ETSY_API_KEY'}`);
    return [];
  }
  if (r.status !== 200 || !r.data) {
    console.warn('[Etsy] API status', r.status, r.data && r.data.error);
    return [];
  }

  const listings = Array.isArray(r.data.results) ? r.data.results : [];
  const results = [];
  for (const raw of listings) {
    if (results.length >= limit) break;
    const parsed = parseItem(raw);
    if (parsed) results.push(parsed);
  }

  if (results.length > 0) {
    console.log(`[Etsy] v3 API returned ${results.length} items (from ${listings.length})`);
  }
  return results;
}

module.exports = { scrapeEtsy };
