const axios = require('axios');

const ALGOLIA_APP_ID = 'MNRWEFSS2Q';
const ALGOLIA_INDEX = 'Listing_by_heat_production';
const FALLBACK_KEY = 'c89dbaddf15fe70e1941a109bf7c2a3d';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let cachedAlgoliaKey = null;
let keyFetchedAt = 0;
const KEY_TTL = 60 * 60 * 1000;

async function fetchAlgoliaKey() {
  try {
    const r = await axios.get('https://www.grailed.com/shop?query=test', {
      headers: { 'User-Agent': UA },
      timeout: 10000,
    });
    const hexKeys = new Set();
    const matches = r.data.matchAll(/['"]([a-f0-9]{20,})['"]/g);
    for (const m of matches) hexKeys.add(m[1]);

    for (const key of hexKeys) {
      try {
        const res = await axios.post(
          `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
          { params: 'query=test&hitsPerPage=1' },
          {
            headers: {
              'x-algolia-application-id': ALGOLIA_APP_ID,
              'x-algolia-api-key': key,
            },
            timeout: 5000,
          }
        );
        if (res.data.hits) return key;
      } catch {}
    }
  } catch {}
  return FALLBACK_KEY;
}

async function getAlgoliaKey() {
  if (cachedAlgoliaKey && Date.now() - keyFetchedAt < KEY_TTL) return cachedAlgoliaKey;
  const key = await fetchAlgoliaKey();
  cachedAlgoliaKey = key;
  keyFetchedAt = Date.now();
  return key;
}

async function scrapeGrailed(query, limit = 10) {
  try {
    if (!query) return [];

    const apiKey = await getAlgoliaKey();

    const r = await axios.post(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
      {
        params: `query=${encodeURIComponent(query)}&hitsPerPage=${Math.min(limit, 40)}`,
      },
      {
        headers: {
          'x-algolia-application-id': ALGOLIA_APP_ID,
          'x-algolia-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const hits = r.data.hits || [];

    return hits.slice(0, limit).map((hit) => {
      let image = '';
      if (hit.cover_photo) {
        image = hit.cover_photo.url || hit.cover_photo.image_url || '';
      }
      if (!image.startsWith('http') && image) image = 'https:' + image;

      const designers = hit.designer_names || '';
      const title = designers
        ? `${designers} ${hit.title || ''}`
        : (hit.title || 'Grailed Item');

      const item = {
        title: title.trim(),
        price: hit.price || 0,
        image,
        url: `https://www.grailed.com/listings/${hit.id}`,
        source: 'grailed',
      };

      if (hit.price_drops?.length > 0) {
        const original = hit.price_drops[hit.price_drops.length - 1]?.from;
        if (original && original > hit.price) {
          item.originalPrice = original;
          item.discountPercent = Math.round(((original - hit.price) / original) * 100);
        }
      }

      return item;
    }).filter((item) => item.price > 0 && item.image);
  } catch (err) {
    console.error('Grailed scrape error:', err.message);
    return [];
  }
}

module.exports = { scrapeGrailed };
