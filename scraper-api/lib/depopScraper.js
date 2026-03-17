const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
];

/** Try Cheerio + __NEXT_DATA__ first — fast, no browser, often works */
async function scrapeDepopCheerio(query, limit) {
  try {
    const url = `https://www.depop.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.depop.com/',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 12000,
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });

    if (!response.data || typeof response.data !== 'string') return [];

    const $ = cheerio.load(response.data);
    const results = [];

    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const products =
          nextData?.props?.pageProps?.products ||
          nextData?.props?.pageProps?.searchResponse?.products ||
          nextData?.props?.pageProps?.data?.products ||
          nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.products ||
          nextData?.props?.pageProps?.initialData?.products ||
          [];

        for (const product of products) {
          if (results.length >= limit) break;
          if (!product) continue;

          const title =
            product.description ||
            product.title ||
            product.name ||
            (product.slug && product.slug.replace(/-/g, ' ')) ||
            'Depop Item';
          const price =
            product.price?.priceAmount ||
            product.price?.amount ||
            product.pricing?.price?.amount ||
            product.price?.value ||
            product.pricing?.priceAmount ||
            null;
          const priceNum = price != null ? parseFloat(price) : null;

          const origPriceRaw =
            product.price?.originalPriceAmount ||
            product.price?.originalPrice ||
            product.pricing?.originalPrice?.amount ||
            product.originalPrice ||
            null;
          const origPriceNum = origPriceRaw != null ? parseFloat(origPriceRaw) : null;

          let image = '';
          if (product.preview?.url) image = product.preview.url;
          else if (product.pictures?.[0]?.url) image = product.pictures[0].url;
          else if (product.pictures?.[0]?.formats?.P4?.url) image = product.pictures[0].formats.P4.url;
          else if (product.pictures?.[0]?.formats?.P1?.url) image = product.pictures[0].formats.P1.url;
          else if (product.imageUrl) image = product.imageUrl;
          else if (product.images?.[0]) image = typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url || '';

          const itemUrl = product.slug
            ? `https://www.depop.com/products/${product.slug}/`
            : product.url || product.link || '';

          if (priceNum != null && priceNum > 0 && image && itemUrl) {
            const item = {
              title: (title || 'Depop Item').length > 120 ? (title || 'Depop Item').slice(0, 120) + '...' : (title || 'Depop Item'),
              price: priceNum,
              image,
              url: itemUrl,
              source: 'depop',
            };
            if (origPriceNum != null && origPriceNum > priceNum) {
              item.originalPrice = origPriceNum;
              item.discountPercent = Math.round(((origPriceNum - priceNum) / origPriceNum) * 100);
            }
            results.push(item);
          }
        }
      } catch (parseErr) {
        console.error('[Depop] __NEXT_DATA__ parse error:', parseErr.message);
      }
    }

    if (results.length > 0) return results;

    $('a[href*="/products/"]').each(function () {
      if (results.length >= limit) return false;
      const href = $(this).attr('href') || '';
      const fullUrl = href.startsWith('http') ? href : `https://www.depop.com${href}`;
      const card = $(this).closest('li, article, div').first();
      const imgEl = card.find('img').first();
      const image = imgEl.attr('src') || imgEl.attr('data-src') || '';
      const priceText = card.text().match(/[\$£]\s?[\d,.]+/);
      const price = priceText ? parseFloat(priceText[0].replace(/[^\d.]/g, '')) : null;
      let title = imgEl.attr('alt') || '';
      if (!title) {
        const slug = href.match(/\/products\/([^/]+)/);
        if (slug) title = slug[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      }
      if (price != null && price > 0 && image && fullUrl && title) {
        const item = { title, price, image, url: fullUrl, source: 'depop' };
        const origEl = card.find('s, del, [style*="line-through"]').first();
        if (origEl.length) {
          const origMatch = origEl.text().match(/[\d,.]+/);
          if (origMatch) {
            const origVal = parseFloat(origMatch[0].replace(/,/g, ''));
            if (origVal > price) {
              item.originalPrice = origVal;
              item.discountPercent = Math.round(((origVal - price) / origVal) * 100);
            }
          }
        }
        results.push(item);
      }
    });

    return results;
  } catch (err) {
    console.error('[Depop] Cheerio scrape error:', err.message);
    return [];
  }
}

function parseDepopHtml(html, limit) {
  const $ = cheerio.load(html);
  const results = [];

  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      const nextData = JSON.parse(nextDataScript);
      const products =
        nextData?.props?.pageProps?.products ||
        nextData?.props?.pageProps?.searchResponse?.products ||
        nextData?.props?.pageProps?.data?.products ||
        nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.products ||
        nextData?.props?.pageProps?.initialData?.products ||
        [];
      for (const product of products) {
        if (results.length >= limit) break;
        if (!product) continue;
        const title = product.description || product.title || product.name || (product.slug && product.slug.replace(/-/g, ' ')) || 'Depop Item';
        const price = product.price?.priceAmount || product.price?.amount || product.pricing?.price?.amount || product.price?.value || product.pricing?.priceAmount || null;
        const priceNum = price != null ? parseFloat(price) : null;
        const origPriceRaw = product.price?.originalPriceAmount || product.price?.originalPrice || product.pricing?.originalPrice?.amount || product.originalPrice || null;
        const origPriceNum = origPriceRaw != null ? parseFloat(origPriceRaw) : null;
        let image = product.preview?.url || product.pictures?.[0]?.url || product.pictures?.[0]?.formats?.P4?.url || product.pictures?.[0]?.formats?.P1?.url || product.imageUrl || '';
        const itemUrl = product.slug ? `https://www.depop.com/products/${product.slug}/` : product.url || product.link || '';
        if (priceNum != null && priceNum > 0 && image && itemUrl) {
          const item = { title: (title || 'Depop Item').length > 120 ? (title || 'Depop Item').slice(0, 120) + '...' : (title || 'Depop Item'), price: priceNum, image, url: itemUrl, source: 'depop' };
          if (origPriceNum != null && origPriceNum > priceNum) { item.originalPrice = origPriceNum; item.discountPercent = Math.round(((origPriceNum - priceNum) / origPriceNum) * 100); }
          results.push(item);
        }
      }
      if (results.length > 0) return results;
    } catch (_) {}
  }

  const seen = new Set();
  $('a[href*="/products/"]').each(function () {
    if (results.length >= limit) return false;
    const href = $(this).attr('href') || '';
    const fullUrl = href.startsWith('http') ? href : `https://www.depop.com${href}`;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    const card = $(this).closest('li, article, div').first();
    const imgEl = card.find('img').first();
    const image = imgEl.attr('src') || imgEl.attr('data-src') || '';
    const priceText = card.text().match(/[\$£]\s?[\d,.]+/);
    const price = priceText ? parseFloat(priceText[0].replace(/[^\d.]/g, '')) : null;
    let title = imgEl.attr('alt') || '';
    if (!title) {
      const slug = href.match(/\/products\/([^/]+)/);
      if (slug) title = slug[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (price != null && price > 0 && image && fullUrl && title) {
      const item = { title, price, image, url: fullUrl, source: 'depop' };
      const origEl = card.find('s, del, [style*="line-through"]').first();
      if (origEl.length) {
        const origMatch = origEl.text().match(/[\d,.]+/);
        if (origMatch) {
          const origVal = parseFloat(origMatch[0].replace(/,/g, ''));
          if (origVal > price) {
            item.originalPrice = origVal;
            item.discountPercent = Math.round(((origVal - price) / origVal) * 100);
          }
        }
      }
      results.push(item);
    }
  });
  return results;
}

/** Playwright fallback — visit homepage first to get Cloudflare cookies, then
 *  intercept the internal search API response for structured data. */
async function scrapeDepopPlaywright(query, limit) {
  const searchUrl = `https://www.depop.com/search?q=${encodeURIComponent(query)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let browser = null;
    try {
      browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 15000 });

      const context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      });

      const page = await context.newPage();

      // Visit homepage first to acquire Cloudflare cookies
      await page.goto('https://www.depop.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));

      // Intercept the search API response
      let apiProducts = null;
      page.on('response', async (resp) => {
        const url = resp.url();
        if (url.includes('/api/v3/search/products') && resp.status() === 200) {
          try {
            const json = await resp.json();
            if (json.products && json.products.length > (apiProducts?.length || 0)) apiProducts = json.products;
          } catch {}
        }
      });

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 4000));

      await browser.close();
      browser = null;

      // Prefer structured API data
      if (apiProducts && apiProducts.length > 0) {
        return apiProducts.slice(0, limit).map(parseDepopApiProduct).filter(Boolean);
      }

      return [];
    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      const isClosed = /closed|disconnected|target.*closed/i.test(err.message);
      if (isClosed && attempt < 2) {
        console.warn(`[Depop] Playwright attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      console.error('[Depop] Playwright scrape error:', err.message);
      return [];
    }
  }
  return [];
}

function parseDepopApiProduct(product) {
  if (!product) return null;
  const slug = product.slug || '';
  // Strip the seller prefix (first segment) and hash suffix (last segment) from the slug
  const slugParts = slug.split('-');
  const cleanSlug = slugParts.length > 2 ? slugParts.slice(1, -1).join(' ') : slugParts.join(' ');
  const brandPrefix = product.brand_name && product.brand_name !== 'Other' ? product.brand_name + ' ' : '';
  const title = (brandPrefix + cleanSlug).replace(/\b\w/g, (l) => l.toUpperCase()).slice(0, 120) || 'Depop Item';

  const pricing = product.pricing || {};
  const priceAmount = pricing.original_price?.price_breakdown?.price?.amount
    || pricing.original_price?.total_price
    || null;
  const price = priceAmount != null ? parseFloat(priceAmount) : null;

  let originalPrice = null;
  if (pricing.is_reduced && pricing.full_price) {
    const fullAmount = pricing.full_price?.price_breakdown?.price?.amount
      || pricing.full_price?.total_price
      || null;
    originalPrice = fullAmount != null ? parseFloat(fullAmount) : null;
  }

  const preview = product.preview || {};
  const image = preview['640'] || preview['480'] || preview['320'] || preview['210'] || preview['150'] || '';

  const url = slug ? `https://www.depop.com/products/${slug}/` : '';

  if (!price || price <= 0 || !image || !url) return null;

  const item = { title, price, image, url, source: 'depop', _platformSearched: true };
  if (originalPrice && originalPrice > price) {
    item.originalPrice = originalPrice;
    item.discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  if (product.brand_name) item.brand = product.brand_name;
  return item;
}

async function scrapeDepop(query, limit = 10) {
  if (!query) return [];

  const cheerioResults = await scrapeDepopCheerio(query, limit);
  if (cheerioResults.length > 0) {
    console.log(`[Depop] Cheerio returned ${cheerioResults.length} items`);
    return cheerioResults;
  }

  const playwrightResults = await scrapeDepopPlaywright(query, limit);
  if (playwrightResults.length > 0) {
    console.log(`[Depop] Playwright returned ${playwrightResults.length} items`);
    return playwrightResults;
  }

  return [];
}

module.exports = { scrapeDepop };
