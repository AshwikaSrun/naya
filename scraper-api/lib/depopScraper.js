const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function scrapeDepop(query, limit = 10) {
  try {
    if (!query) return [];

    // Try the public search API with browser-like headers
    const r = await axios.get('https://webapi.depop.com/api/v2/search/products/', {
      params: {
        what: query,
        limit: Math.min(limit, 24),
        offset: 0,
        country: 'us',
        currency: 'USD',
      },
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.depop.com/',
        'Origin': 'https://www.depop.com',
      },
      timeout: 10000,
    });

    const products = r.data?.products || [];
    return products.slice(0, limit).map((p) => {
      const preview = (p.preview || {});
      const price = preview.price?.priceAmount
        ? parseFloat(preview.price.priceAmount)
        : 0;

      let image = '';
      if (preview.imageUrls && preview.imageUrls.length > 0) {
        image = preview.imageUrls[0];
      } else if (p.images && p.images.length > 0) {
        image = p.images[0];
      }
      // Upgrade to full-res
      if (image) {
        image = image.replace(/\/P\d+\.(jpg|jpeg|png|webp)/i, '/P1.$1');
      }

      return {
        title: preview.title || p.description?.substring(0, 80) || 'Depop Item',
        price,
        image,
        url: `https://www.depop.com/products/${p.slug || p.id}/`,
        source: 'depop',
      };
    }).filter((item) => item.price > 0 && item.image);
  } catch (apiErr) {
    // API blocked — try HTML scrape fallback
    try {
      return await scrapeDepopHtml(query, limit);
    } catch (htmlErr) {
      console.error('Depop scrape error (both methods):', apiErr.message, '|', htmlErr.message);
      return [];
    }
  }
}

async function scrapeDepopHtml(query, limit) {
  const cheerio = require('cheerio');
  const r = await axios.get(`https://www.depop.com/search/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA },
    timeout: 15000,
  });

  const $ = cheerio.load(r.data);
  const results = [];

  // Look for __NEXT_DATA__ or embedded JSON
  const nextData = $('script#__NEXT_DATA__').html();
  if (nextData) {
    try {
      const parsed = JSON.parse(nextData);
      const products = parsed.props?.pageProps?.products || [];
      for (const p of products) {
        if (results.length >= limit) break;
        let image = (p.images || p.preview?.imageUrls || [])[0] || '';
        if (image) image = image.replace(/\/P\d+\.(jpg|jpeg|png|webp)/i, '/P1.$1');

        const price = p.price?.priceAmount
          ? parseFloat(p.price.priceAmount)
          : parseFloat(p.preview?.price?.priceAmount || 0);

        if (price > 0 && image) {
          results.push({
            title: p.title || p.description?.substring(0, 80) || 'Depop Item',
            price,
            image,
            url: `https://www.depop.com/products/${p.slug || p.id}/`,
            source: 'depop',
          });
        }
      }
    } catch {}
  }

  return results;
}

module.exports = { scrapeDepop };
