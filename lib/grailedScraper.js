/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios');
const cheerio = require('cheerio');

function buildFocusedQuery(query) {
  const q = query.trim();
  if (!q) return '';
  const lower = q.toLowerCase();
  const hasVintageSignal =
    lower.includes('vintage') ||
    lower.includes('secondhand') ||
    lower.includes('second hand') ||
    lower.includes('preowned') ||
    lower.includes('pre-owned') ||
    lower.includes('thrift');
  return hasVintageSignal ? q : `${q} vintage secondhand`;
}

function parsePrice(priceText) {
  if (!priceText) return null;
  const match = String(priceText).replace(/,/g, '').match(/[\d.]+/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

async function scrapeGrailed(query, limit = 10) {
  try {
    if (!query) return [];

    const focusedQuery = buildFocusedQuery(query);
    const searchUrl = `https://www.grailed.com/shop/${encodeURIComponent(focusedQuery)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('a[href*="/listings/"]').each((_, el) => {
      if (results.length >= limit) return false;

      const href = $(el).attr('href') || '';
      const url = href.startsWith('http') ? href : `https://www.grailed.com${href}`;
      const card = $(el).closest('article, li, div');

      const title =
        card.find('h3').first().text().trim() ||
        card.find('h2').first().text().trim() ||
        $(el).attr('aria-label') ||
        '';

      const priceText =
        card.find('[class*="price"]').first().text().trim() ||
        card.text().match(/\$\s?[\d,.]+/)?.[0] ||
        '';
      const price = parsePrice(priceText);

      const image =
        card.find('img').first().attr('src') ||
        card.find('img').first().attr('data-src') ||
        '';

      if (!title || !url || !image || price === null) return;

      results.push({
        title: title.length > 140 ? `${title.slice(0, 140)}...` : title,
        price,
        image,
        url,
        source: 'grailed',
      });
    });

    // Fallback: parse JSON-LD for ItemList when card selectors shift.
    if (results.length === 0) {
      $('script[type="application/ld+json"]').each((_, scriptEl) => {
        if (results.length >= limit) return false;
        try {
          const raw = $(scriptEl).html();
          if (!raw) return;
          const json = JSON.parse(raw);
          const items = Array.isArray(json?.itemListElement)
            ? json.itemListElement
            : [];
          for (const item of items) {
            if (results.length >= limit) break;
            const product = item?.item || item;
            const title = product?.name;
            const url = product?.url;
            const image = Array.isArray(product?.image)
              ? product.image[0]
              : product?.image;
            const offer = Array.isArray(product?.offers)
              ? product.offers[0]
              : product?.offers;
            const price = parsePrice(offer?.price);
            if (title && url && image && price !== null) {
              results.push({
                title,
                price,
                image,
                url,
                source: 'grailed',
              });
            }
          }
        } catch {
          // Ignore JSON parse errors from unrelated ld+json blobs.
        }
      });
    }

    return results.slice(0, limit);
  } catch (error) {
    console.error('Grailed scrape error:', error.message || error);
    return [];
  }
}

module.exports = { scrapeGrailed };
