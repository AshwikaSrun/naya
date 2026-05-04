// Vinted scraper — uses the public unauthenticated catalog API.
//
// Vinted's API requires a session cookie before it will serve catalog data
// (otherwise 401). The fix is the same trick browsers use: hit the homepage
// once, capture the anonymous Set-Cookie response (`anon_id`, `v_udt`,
// `anonymous-locale`, etc.), and replay those cookies on the API call.
//
// We cache the cookie blob in-process for COOKIE_TTL_MS so we're not paying
// a second round-trip on every search. A 30-minute TTL keeps memory tiny
// (one string per Vinted instance) and is well under Vinted's actual
// session lifetime.
//
// Vinted is HTTP-only — no Playwright — so this scraper is registered as a
// regular HTTP platform in server.js and runs in parallel with grailed +
// poshmark.

const axios = require('axios');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const HOME_URL = 'https://www.vinted.com/';
const API_URL = 'https://www.vinted.com/api/v2/catalog/items';

const COOKIE_TTL_MS = 30 * 60 * 1000;

let cachedCookies = null;
let cachedAt = 0;

async function getCookies() {
  const now = Date.now();
  if (cachedCookies && now - cachedAt < COOKIE_TTL_MS) return cachedCookies;

  const r = await axios.get(HOME_URL, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 12000,
    maxRedirects: 5,
    validateStatus: (s) => s < 500,
  });

  const setCookie = r.headers['set-cookie'] || [];
  if (!setCookie.length) {
    cachedCookies = null;
    cachedAt = 0;
    return null;
  }

  const cookieHdr = setCookie.map((c) => c.split(';')[0]).join('; ');
  cachedCookies = cookieHdr;
  cachedAt = now;
  return cookieHdr;
}

function parsePrice(p) {
  if (!p) return NaN;
  // Newer Vinted shape: { amount: '150.0', currency_code: 'USD' }
  if (typeof p === 'object') {
    const amt = parseFloat(p.amount);
    return Number.isFinite(amt) ? amt : NaN;
  }
  if (typeof p === 'string') return parseFloat(p);
  if (typeof p === 'number') return p;
  return NaN;
}

function pickImage(item) {
  if (!item) return null;
  const photo = item.photo;
  if (!photo) return null;
  if (typeof photo.url === 'string') return photo.url;
  if (typeof photo.full_size_url === 'string') return photo.full_size_url;
  return null;
}

function parseItem(raw) {
  if (!raw) return null;
  const title = (raw.title || '').toString().trim();
  if (!title) return null;

  const price = parsePrice(raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const image = pickImage(raw);
  if (!image) return null;

  const url = typeof raw.url === 'string' ? raw.url : null;
  if (!url) return null;

  // Vinted serves multiple currencies. We only keep USD-priced items so the
  // numbers feed cleanly into the cross-platform median without a forex step.
  const currency = (raw.price && raw.price.currency_code) || raw.currency_code || 'USD';
  if (currency && currency.toUpperCase() !== 'USD') return null;

  const item = {
    title: title.length > 200 ? title.slice(0, 200) : title,
    price,
    image,
    url,
    source: 'vinted',
    _platformSearched: true,
  };

  if (typeof raw.brand_title === 'string' && raw.brand_title) {
    item.brand = raw.brand_title;
  }

  return item;
}

async function scrapeVinted(query, limit = 10) {
  if (!query) return [];

  let cookies;
  try {
    cookies = await getCookies();
  } catch (err) {
    console.error('[Vinted] cookie warmup failed:', err.message);
    return [];
  }
  if (!cookies) {
    console.warn('[Vinted] no cookies obtained from homepage');
    return [];
  }

  // Vinted caps per_page at 96; we ask for 2x limit so we still have padding
  // after the USD-only filter rejects EUR/GBP/etc. listings.
  const perPage = Math.min(Math.max(limit * 2, 10), 96);

  const url = `${API_URL}?search_text=${encodeURIComponent(query)}&page=1&per_page=${perPage}&order=newest_first`;

  let r;
  try {
    r = await axios.get(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: cookies,
        Referer: 'https://www.vinted.com/',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 15000,
      validateStatus: (s) => s < 500,
    });
  } catch (err) {
    console.error('[Vinted] api request failed:', err.message);
    cachedCookies = null;
    cachedAt = 0;
    return [];
  }

  if (r.status === 401 || r.status === 403) {
    // Cookies got invalidated — wipe the cache so the next call re-warms.
    cachedCookies = null;
    cachedAt = 0;
    console.warn(`[Vinted] api status=${r.status}, evicting cookie cache`);
    return [];
  }

  if (r.status !== 200 || !r.data || !Array.isArray(r.data.items)) {
    console.warn(`[Vinted] api status=${r.status}, items missing`);
    return [];
  }

  const results = [];
  for (const raw of r.data.items) {
    if (results.length >= limit) break;
    const parsed = parseItem(raw);
    if (parsed) results.push(parsed);
  }

  if (results.length > 0) {
    console.log(
      `[Vinted] returned ${results.length} items (from ${r.data.items.length} api items)`
    );
  }
  return results;
}

module.exports = { scrapeVinted };
