const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function scrapePoshmark(query, limit = 10) {
  try {
    if (!query) return [];

    const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}&type=listings`;
    const r = await axios.get(url, {
      headers: { 'User-Agent': UA },
      timeout: 15000,
    });

    const $ = cheerio.load(r.data);
    const results = [];
    const seen = new Set();

    $('a[href*="/listing/"]').each((_, el) => {
      if (results.length >= limit) return false;
      const href = $(el).attr('href');
      if (!href || seen.has(href)) return;
      seen.add(href);

      const card = $(el).closest('div');
      const img = card.find('img').first();
      let image = img.attr('src') || img.attr('data-src') || '';
      const title = img.attr('alt') || '';

      // Upgrade image to higher resolution
      if (image) {
        image = image
          .replace(/\/s_/, '/m_')
          .replace(/w_\d+/, 'w_800')
          .replace(/h_\d+/, 'h_800');
      }

      // Extract prices from card text
      const allText = card.text();
      const priceMatches = [...allText.matchAll(/\$\s?[\d,.]+/g)];
      const prices = priceMatches
        .map((m) => parseFloat(m[0].replace(/[^\d.]/g, '')))
        .filter((p) => p > 0);

      if (!title || prices.length === 0 || !image) return;

      const price = Math.min(...prices);
      const item = {
        title,
        price,
        image,
        url: href.startsWith('http') ? href : `https://poshmark.com${href}`,
        source: 'poshmark',
      };

      if (prices.length >= 2) {
        const maxPrice = Math.max(...prices);
        if (maxPrice > price) {
          item.originalPrice = maxPrice;
          item.discountPercent = Math.round(((maxPrice - price) / maxPrice) * 100);
        }
      }

      results.push(item);
    });

    return results;
  } catch (err) {
    console.error('Poshmark scrape error:', err.message);
    return [];
  }
}

module.exports = { scrapePoshmark };
