const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDepop(query, limit = 10) {
  try {
    if (!query) return [];

    const url = `https://www.depop.com/search?q=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
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

    // Depop uses Next.js — search data is in __NEXT_DATA__
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const products =
          nextData?.props?.pageProps?.products ||
          nextData?.props?.pageProps?.searchResponse?.products ||
          nextData?.props?.pageProps?.data?.products ||
          [];

        for (const product of products) {
          if (results.length >= limit) break;

          const title =
            product.description ||
            product.title ||
            product.slug?.replace(/-/g, ' ') ||
            'Depop Item';
          const price =
            product.price?.priceAmount ||
            product.price?.amount ||
            product.pricing?.price?.amount ||
            null;
          const priceNum = price ? parseFloat(price) : null;

          let image = '';
          if (product.preview?.url) {
            image = product.preview.url;
          } else if (product.pictures && product.pictures.length > 0) {
            image =
              product.pictures[0]?.url ||
              product.pictures[0]?.formats?.P4?.url ||
              product.pictures[0]?.formats?.P1?.url ||
              '';
          } else if (product.imageUrl) {
            image = product.imageUrl;
          }

          const itemUrl = product.slug
            ? `https://www.depop.com/products/${product.slug}/`
            : product.url || '';

          if (priceNum && image && itemUrl) {
            results.push({
              title: title.length > 120 ? title.slice(0, 120) + '...' : title,
              price: priceNum,
              image,
              url: itemUrl,
              source: 'depop',
            });
          }
        }
      } catch (parseErr) {
        console.error('Depop __NEXT_DATA__ parse error:', parseErr.message);
      }
    }

    // Fallback: parse HTML directly if __NEXT_DATA__ didn't yield results
    if (results.length === 0) {
      $('a[href*="/products/"]').each((i, el) => {
        if (results.length >= limit) return false;

        const href = $(el).attr('href') || '';
        const fullUrl = href.startsWith('http')
          ? href
          : `https://www.depop.com${href}`;

        const card = $(el).closest('li, article, div');
        const imgEl = card.find('img').first();
        const image =
          imgEl.attr('src') || imgEl.attr('data-src') || '';

        const priceText = card.text().match(/\$\s?[\d,.]+/);
        const price = priceText
          ? parseFloat(priceText[0].replace(/[^\d.]/g, ''))
          : null;

        let title = imgEl.attr('alt') || '';
        if (!title) {
          const slug = href.match(/\/products\/([^/]+)/);
          if (slug) {
            title = slug[1]
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
          }
        }

        if (price && image && fullUrl && title) {
          results.push({
            title,
            price,
            image,
            url: fullUrl,
            source: 'depop',
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Depop scrape error:', error.message);
    return [];
  }
}

module.exports = { scrapeDepop };
