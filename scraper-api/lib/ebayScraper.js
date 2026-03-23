const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const { LAUNCH_ARGS } = require('./launchArgs');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function pushEbayRow(results, limit, { cleanTitle, priceText, url, image, wasText }) {
  if (results.length >= limit) return;
  if (!cleanTitle || !priceText || !url) return;
  const priceMatch = priceText.match(/[\d,]+\.?\d*/);
  const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
  if (!price) return;
  let originalPrice = null;
  if (wasText) {
    const wasMatch = wasText.match(/[\d,]+\.?\d*/);
    originalPrice = wasMatch ? parseFloat(wasMatch[0].replace(/,/g, '')) : null;
  }
  let discountPercent = null;
  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  const item = { title: cleanTitle, price, image: image || '', url, source: 'ebay' };
  if (originalPrice && originalPrice > price) item.originalPrice = originalPrice;
  if (discountPercent) item.discountPercent = discountPercent;
  results.push(item);
}

function parseEbayHtml(html, limit) {
  const $ = cheerio.load(html);
  const results = [];

  $('ul.srp-results li.s-card, .srp-results li.s-card').each((i, elem) => {
    if (results.length >= limit) return false;

    const el = $(elem);
    const link = el.find('a[href*="/itm/"]').first();
    const title = el.find('.s-card__title').text().trim() ||
                  link.attr('aria-label') ||
                  link.attr('title') ||
                  link.text().trim();
    const cleanTitle = title ? title.replace(/\s*Opens in a new window.*$/i, '').trim() : '';
    const priceText = el.find('.s-card__price').text().trim();
    const wasText =
      el.find('.s-card__tagline .STRIKETHROUGH, .s-card__tagline s, .s-card__tagline del').text().trim() ||
      el.find('span.s-item__price--original, .s-item__discount .STRIKETHROUGH').text().trim() ||
      '';

    let image = el.find('img').first().attr('src') || '';
    if (image) image = image.replace(/s-l\d+/i, 's-l500');
    if (!image || image.includes('/null')) return;

    const url = link.attr('href') || '';
    pushEbayRow(results, limit, { cleanTitle, priceText, url, image, wasText });
  });

  if (results.length === 0) {
    $('ul.srp-results li.s-item, .srp-river-results li.s-item, li.s-item').each((i, elem) => {
      if (results.length >= limit) return false;
      const el = $(elem);
      if (el.hasClass('s-card')) return;
      const link = el.find('a.s-item__link, a[href*="/itm/"]').first();
      const title =
        el.find('.s-item__title span, .s-item__title').first().text().trim() ||
        link.attr('title') ||
        link.text().trim();
      if (/shop on ebay/i.test(title)) return;
      const cleanTitle = title ? title.replace(/\s*Opens in a new window.*$/i, '').trim() : '';
      const priceText = el.find('.s-item__price').first().text().trim();
      const wasText = el.find('.s-item__original-price, .s-item__price--original').text().trim();
      let image = el.find('img').first().attr('src') || '';
      if (image) image = image.replace(/s-l\d+/i, 's-l500');
      const url = link.attr('href') || '';
      pushEbayRow(results, limit, { cleanTitle, priceText, url, image, wasText });
    });
  }

  return results;
}

function ebayHtmlLooksParseable(html) {
  if (!html || typeof html !== 'string') return false;
  if (html.includes('Pardon Our Interruption')) return false;
  return (
    html.includes('srp-results') ||
    html.includes('s-item') ||
    html.includes('s-card') ||
    (html.includes('/itm/') && html.length > 8000)
  );
}

async function scrapeEbayCheerio(query, limit) {
  try {
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${Math.min(limit, 200)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1',
        Referer: 'https://www.ebay.com/',
      },
      timeout: 12000,
    });

    const html = response.data;
    if (!ebayHtmlLooksParseable(html)) {
      return [];
    }

    return parseEbayHtml(html, limit);
  } catch (err) {
    console.error('[eBay] Cheerio error:', err.message);
    return [];
  }
}

/** Prefer evaluate() — page.content() often throws if Chromium died (common with --single-process). */
async function safeGetPageHtml(page) {
  try {
    const html = await page.evaluate(() => {
      try {
        return document.documentElement ? document.documentElement.outerHTML : '';
      } catch {
        return '';
      }
    });
    if (html && html.length > 500) return html;
  } catch {
    /* fall through */
  }
  return page.content();
}

async function scrapeEbayPlaywright(query, limit) {
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${Math.min(limit, 200)}`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let browser = null;
    let context = null;
    try {
      browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 25000 });

      context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1366, height: 768 },
        locale: 'en-US',
        javaScriptEnabled: true,
      });

      const page = await context.newPage();

      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 28000 });

      try {
        await page.waitForSelector('ul.srp-results li.s-card, li.s-item, a[href*="/itm/"]', {
          timeout: 8000,
        });
      } catch {
        /* still try to read DOM */
      }

      await new Promise((r) => setTimeout(r, 900));

      const html = await safeGetPageHtml(page);

      await context.close().catch(() => {});
      context = null;
      await browser.close();
      browser = null;

      if (!ebayHtmlLooksParseable(html)) {
        if (attempt < maxAttempts) {
          console.warn(`[eBay] Playwright attempt ${attempt}: unparseable HTML, retrying...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return [];
      }

      const items = parseEbayHtml(html, limit);
      if (items.length > 0) return items;
      if (attempt < maxAttempts) {
        console.warn(`[eBay] Playwright attempt ${attempt}: 0 items parsed, retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
      context = null;
      browser = null;
      const isRetryable = /crashed|closed|disconnected|timeout|target/i.test(err.message);
      if (isRetryable && attempt < maxAttempts) {
        console.warn(`[eBay] Playwright attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      console.error('[eBay] Playwright error:', err.message);
      return [];
    }
  }
  return [];
}

async function scrapeEbay(query, limit = 10) {
  if (!query) return [];

  const cheerioResults = await scrapeEbayCheerio(query, limit);
  if (cheerioResults.length > 0) {
    console.log(`[eBay] Cheerio returned ${cheerioResults.length} items`);
    return cheerioResults;
  }

  const playwrightResults = await scrapeEbayPlaywright(query, limit);
  if (playwrightResults.length > 0) {
    console.log(`[eBay] Playwright fallback returned ${playwrightResults.length} items`);
    return playwrightResults;
  }

  return [];
}

module.exports = { scrapeEbay };
