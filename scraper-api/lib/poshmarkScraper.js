const axios = require('axios');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Walk forward from `window.__INITIAL_STATE__=` and return the parsed JSON.
 * The page is a 2 MB blob; we manually balance braces so we only parse the
 * single state object instead of trying to load the whole HTML into a parser.
 */
function extractInitialState(html) {
  const marker = 'window.__INITIAL_STATE__=';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + marker.length;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIdx = -1;

  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  if (endIdx === -1) return null;

  try {
    return JSON.parse(html.substring(jsonStart, endIdx));
  } catch {
    return null;
  }
}

/**
 * Listings on Poshmark live at `$_search.gridData.data` today, but Poshmark
 * has rearranged their state shape multiple times. Walk the object tree and
 * return the first array of objects that smell like listings (id + title +
 * price_amount). Capped at depth 12 to keep the scan cheap.
 */
function findListingsArray(obj, depth = 0) {
  if (depth > 12 || !obj) return null;

  if (Array.isArray(obj)) {
    if (obj.length >= 3) {
      const sample = obj[0];
      if (
        sample &&
        typeof sample === 'object' &&
        sample.id &&
        sample.title &&
        sample.price_amount
      ) {
        return obj;
      }
    }
    return null;
  }

  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) {
      const found = findListingsArray(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function pickImage(listing) {
  if (typeof listing.picture_url === 'string' && listing.picture_url.startsWith('http')) {
    return listing.picture_url;
  }
  const cover = listing.cover_shot;
  if (cover && typeof cover === 'object') {
    if (typeof cover.url_large === 'string') return cover.url_large;
    if (typeof cover.url === 'string') return cover.url;
    if (typeof cover.url_webp === 'string') return cover.url_webp;
  }
  if (Array.isArray(listing.pictures) && listing.pictures.length > 0) {
    const p = listing.pictures[0];
    if (p && typeof p === 'object') {
      return p.url_large || p.url || p.url_webp || '';
    }
  }
  return '';
}

function buildListingUrl(listing) {
  // Poshmark accepts /listing/<id> as a stable redirect; the friendlier slug
  // form (/listing/Carhartt-Jacket-Size-L-<id>) just resolves to the same page.
  const id = listing.id;
  if (!id) return '';
  return `https://poshmark.com/listing/${id}`;
}

function parseListing(listing) {
  if (!listing || typeof listing !== 'object') return null;

  const title = typeof listing.title === 'string' ? listing.title.trim() : '';
  if (!title) return null;

  const priceVal = listing.price_amount && listing.price_amount.val;
  const price = priceVal != null ? parseFloat(priceVal) : NaN;
  if (!Number.isFinite(price) || price <= 0) return null;

  const image = pickImage(listing);
  if (!image) return null;

  const url = buildListingUrl(listing);
  if (!url) return null;

  const item = {
    title: title.length > 200 ? title.slice(0, 200) : title,
    price,
    image,
    url,
    source: 'poshmark',
    _platformSearched: true,
  };

  // Original price (if Poshmark has one and it's actually a discount)
  const origVal = listing.original_price_amount && listing.original_price_amount.val;
  const origPrice = origVal != null ? parseFloat(origVal) : NaN;
  if (Number.isFinite(origPrice) && origPrice > price) {
    item.originalPrice = origPrice;
    item.discountPercent = Math.round(((origPrice - price) / origPrice) * 100);
  }

  if (typeof listing.brand === 'string' && listing.brand) {
    item.brand = listing.brand;
  }

  return item;
}

async function scrapePoshmark(query, limit = 10) {
  if (!query) return [];

  const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}&type=listings`;

  try {
    const r = await axios.get(url, {
      headers: {
        'User-Agent': UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://poshmark.com/',
      },
      timeout: 15000,
      validateStatus: (s) => s < 500,
    });

    if (!r || typeof r.data !== 'string') return [];

    const state = extractInitialState(r.data);
    if (!state) {
      console.warn('[Poshmark] no __INITIAL_STATE__ found');
      return [];
    }

    const listings = findListingsArray(state);
    if (!listings) {
      console.warn('[Poshmark] no listings array found in state');
      return [];
    }

    const results = [];
    for (const listing of listings) {
      if (results.length >= limit) break;
      const parsed = parseListing(listing);
      if (parsed) results.push(parsed);
    }

    if (results.length > 0) {
      console.log(`[Poshmark] returned ${results.length} items (from ${listings.length} state listings)`);
    }
    return results;
  } catch (err) {
    console.error('[Poshmark] scrape error:', err.message);
    return [];
  }
}

module.exports = { scrapePoshmark };
