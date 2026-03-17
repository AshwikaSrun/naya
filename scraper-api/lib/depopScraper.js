const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'];

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
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000,
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

/** Playwright fallback — when Cheerio is blocked or returns empty */
async function scrapeDepopPlaywright(query, limit) {
  let browser = null;
  try {
    const url = `https://www.depop.com/search?q=${encodeURIComponent(query)}`;
    browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 15000 });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    try {
      await page.waitForSelector('a[href*="/products/"]', { timeout: 10000 });
    } catch {
      // Continue anyway
    }

    if (limit > 10) {
      const scrollAttempts = Math.min(3, Math.ceil((limit - 10) / 20));
      for (let i = 0; i < scrollAttempts; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await page.waitForTimeout(600);
      }
    }

    await page.waitForTimeout(400);

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();
      const links = document.querySelectorAll('a[href*="/products/"]');

      for (const link of links) {
        if (items.length >= maxLimit) break;
        const href = link.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = link.closest('li') || link.closest('article') || link.closest('div') || link;
        const text = card?.textContent || '';

        const priceMatch = text.replace(/,/g, '').match(/[\$£]\s*(\d+\.?\d*)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;
        if (!price || price <= 0) continue;

        let title = '';
        const urlMatch = href.match(/\/products\/([^/]+)\//);
        if (urlMatch?.[1]) {
          const parts = urlMatch[1].split('-');
          let titleParts = parts;
          if (parts[0]?.includes('_')) titleParts = parts.slice(1);
          if (titleParts.length > 1 && titleParts[titleParts.length - 1]?.length <= 6) {
            titleParts = titleParts.slice(0, -1);
          }
          title = titleParts.join(' ').replace(/\b\w/g, (l) => l.toUpperCase()).trim();
        }
        if (!title) {
          const textEls = Array.from(card?.querySelectorAll('p, span, [data-testid*="title"]') || []);
          for (const el of textEls) {
            const t = (el.textContent || '').trim();
            if (t && !t.startsWith('$') && !t.startsWith('£') && t.length > 8 && t.length < 200) {
              title = t;
              break;
            }
          }
        }

        const imgEl = card?.querySelector('img');
        let image = '';
        if (imgEl) {
          const srcset = imgEl.getAttribute('srcset') || imgEl.getAttribute('data-srcset');
          if (srcset) {
            const candidates = srcset.split(',').map((e) => e.trim()).map((e) => {
              const [u, s] = e.split(/\s+/);
              const wm = s ? s.match(/(\d+)w/i) : null;
              return { url: u, width: wm ? parseInt(wm[1], 10) : 0 };
            }).filter((c) => c.url);
            candidates.sort((a, b) => b.width - a.width);
            image = candidates[0]?.url || '';
          } else {
            image = imgEl.src || imgEl.getAttribute('data-src') || '';
          }
        }
        if (!image) continue;

        image = image.replace(/\/P\d+\.(jpg|jpeg|png|webp)/i, '/P1.$1');

        let originalPrice = null;
        const origMatch = text.match(/[\$£]\s*(\d+\.?\d*)/g);
        if (origMatch && origMatch.length >= 2) {
          const nums = origMatch.map((m) => parseFloat(m.replace(/[^\d.]/g, '')));
          const maxPrice = Math.max(...nums);
          if (maxPrice > price) originalPrice = maxPrice;
        }

        const item = { title: title || 'Depop Item', price, image, url: href, source: 'depop' };
        if (originalPrice && originalPrice > price) {
          item.originalPrice = originalPrice;
          item.discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }
        items.push(item);
      }
      return items;
    }, limit);

    await browser.close();
    return results;
  } catch (err) {
    console.error('[Depop] Playwright scrape error:', err.message);
    if (browser) await browser.close().catch(() => {});
    return [];
  }
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
    console.log(`[Depop] Playwright fallback returned ${playwrightResults.length} items`);
    return playwrightResults;
  }

  return [];
}

module.exports = { scrapeDepop };
