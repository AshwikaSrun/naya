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

async function scrapeGoogleShopping(query, limit = 10) {
  try {
    if (!query) return [];

    const focusedQuery = buildFocusedQuery(query);
    const searchUrl = `https://www.google.com/search?tbm=shop&hl=en&gl=us&q=${encodeURIComponent(
      focusedQuery
    )}`;

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

    // Primary parser for Google Shopping product cards.
    $('div.sh-dgr__content, div.sh-dlr__list-result, div.sh-pr__product-results-grid div[data-docid]').each(
      (_, el) => {
        if (results.length >= limit) return false;

        const card = $(el);
        const linkEl = card.find('a.shntl, a[href*="/shopping/product/"]').first();
        const href = linkEl.attr('href') || '';
        const url = href
          ? href.startsWith('http')
            ? href
            : `https://www.google.com${href}`
          : '';

        const title =
          card.find('h3').first().text().trim() ||
          card.find('.tAxDx').first().text().trim() ||
          linkEl.attr('aria-label') ||
          '';

        const priceText =
          card.find('.a8Pemb').first().text().trim() ||
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
          title: title.length > 160 ? `${title.slice(0, 160)}...` : title,
          price,
          image,
          url,
          source: 'google_shopping',
        });
      }
    );

    // Fallback: parse common shopping links when card classes vary.
    if (results.length === 0) {
      $('a[href*="/shopping/product/"]').each((_, el) => {
        if (results.length >= limit) return false;
        const href = $(el).attr('href') || '';
        const url = href.startsWith('http') ? href : `https://www.google.com${href}`;
        const card = $(el).closest('div');
        const title =
          $(el).find('h3').first().text().trim() ||
          $(el).text().trim().slice(0, 180);
        const priceText = card.text().match(/\$\s?[\d,.]+/)?.[0] || '';
        const price = parsePrice(priceText);
        const image =
          card.find('img').first().attr('src') ||
          card.find('img').first().attr('data-src') ||
          '';
        if (!title || !url || !image || price === null) return;
        results.push({
          title,
          price,
          image,
          url,
          source: 'google_shopping',
        });
      });
    }

    return results.slice(0, limit);
  } catch (error) {
    console.error('Google Shopping scrape error:', error.message || error);
    return [];
  }
}

module.exports = { scrapeGoogleShopping };
