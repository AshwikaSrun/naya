const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const { LAUNCH_ARGS } = require('./launchArgs');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseEbayHtml(html, limit) {
  const $ = cheerio.load(html);
  const results = [];

  $('ul.srp-results li.s-card').each((i, elem) => {
    if (results.length >= limit) return false;

    const link = $(elem).find('a[href*="/itm/"]').first();
    const title = $(elem).find('.s-card__title').text().trim() ||
                  link.attr('aria-label') ||
                  link.attr('title') ||
                  link.text().trim();
    const cleanTitle = title ? title.replace(/\s*Opens in a new window.*$/i, '').trim() : '';
    const priceText = $(elem).find('.s-card__price').text().trim();
    const wasText =
      $(elem).find('.s-card__tagline .STRIKETHROUGH, .s-card__tagline s, .s-card__tagline del').text().trim() ||
      $(elem).find('span.s-item__price--original, .s-item__discount .STRIKETHROUGH').text().trim() ||
      '';

    let image = $(elem).find('img').first().attr('src') || '';
    if (image) image = image.replace(/s-l\d+/i, 's-l500');
    if (!image || image.includes('/null')) return;

    const url = link.attr('href') || '';
    if (!cleanTitle || !priceText || !url) return;

    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
    let originalPrice = null;
    if (wasText) {
      const wasMatch = wasText.match(/[\d,]+\.?\d*/);
      originalPrice = wasMatch ? parseFloat(wasMatch[0].replace(/,/g, '')) : null;
    }
    let discountPercent = null;
    if (originalPrice && price && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    if (price && cleanTitle && url) {
      const item = { title: cleanTitle, price, image: image || '', url, source: 'ebay' };
      if (originalPrice && originalPrice > price) item.originalPrice = originalPrice;
      if (discountPercent) item.discountPercent = discountPercent;
      results.push(item);
    }
  });

  return results;
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
      },
      timeout: 12000,
    });

    const html = response.data;
    if (html.includes('Pardon Our Interruption') || !html.includes('srp-results')) {
      return [];
    }

    return parseEbayHtml(html, limit);
  } catch (err) {
    console.error('[eBay] Cheerio error:', err.message);
    return [];
  }
}

async function scrapeEbayPlaywright(query, limit) {
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${Math.min(limit, 200)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let browser = null;
    try {
      browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 20000 });

      const context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        javaScriptEnabled: true,
      });

      const page = await context.newPage();

      // Mask automation signals that trigger bot detection
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

      try {
        await page.waitForSelector('ul.srp-results li.s-card', { timeout: 10000 });
      } catch {
        // Continue anyway — page might still have content
      }

      await new Promise((r) => setTimeout(r, 500));
      const html = await page.content();
      await browser.close();
      browser = null;

      if (html.includes('Pardon Our Interruption') || !html.includes('srp-results')) {
        return [];
      }

      const items = parseEbayHtml(html, limit);
      if (items.length > 0) return items;
    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      const isRetryable = /crashed|closed|disconnected|timeout|target/i.test(err.message);
      if (isRetryable && attempt < 2) {
        console.warn(`[eBay] Playwright attempt ${attempt} failed (${err.message}), retrying...`);
        await new Promise((r) => setTimeout(r, 2000));
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
