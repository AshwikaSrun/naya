const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const { LAUNCH_ARGS } = require('./launchArgs');
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const EBAY_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Upgrade-Insecure-Requests': '1',
  Referer: 'https://www.ebay.com/',
};

function normalizeEbayUrl(href) {
  if (!href || href === '#') return '';
  try {
    if (href.startsWith('http')) return href.split('?')[0];
    if (href.startsWith('//')) return `https:${href}`.split('?')[0];
    if (href.startsWith('/itm/')) return `https://www.ebay.com${href}`.split('?')[0];
    return href;
  } catch {
    return href;
  }
}

function pickImage($, root) {
  const img = root.find('img').first();
  let src =
    img.attr('src') ||
    img.attr('data-src') ||
    img.attr('data-lazy-src') ||
    '';
  if (!src) {
    const srcset = img.attr('srcset') || '';
    const first = srcset.split(',')[0]?.trim().split(/\s+/)[0];
    if (first) src = first;
  }
  if (src) src = src.replace(/s-l\d+/i, 's-l500');
  return src && !src.includes('/null') ? src : '';
}

function pushItem(results, limit, { title, priceText, url, image, wasText }) {
  if (results.length >= limit) return;
  const cleanTitle = title
    ? title.replace(/\s*Opens in a new window.*$/i, '').replace(/\s*new listing.*$/i, '').trim()
    : '';
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
  if (originalPrice && originalPrice > price) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  const item = { title: cleanTitle, price, image: image || '', url, source: 'ebay' };
  if (originalPrice && originalPrice > price) item.originalPrice = originalPrice;
  if (discountPercent) item.discountPercent = discountPercent;
  results.push(item);
}

/** Parse modern card layout */
function parseSrpCards($, limit) {
  const results = [];
  $('ul.srp-results li.s-card, .srp-results li.s-card').each((i, elem) => {
    if (results.length >= limit) return false;
    const el = $(elem);
    const link = el.find('a[href*="/itm/"]').first();
    const title =
      el.find('.s-card__title').text().trim() ||
      link.attr('aria-label') ||
      link.attr('title') ||
      link.text().trim();
    const priceText = el.find('.s-card__price').text().trim();
    const wasText =
      el.find('.s-card__tagline .STRIKETHROUGH, .s-card__tagline s, .s-card__tagline del').text().trim() ||
      el.find('span.s-item__price--original, .s-item__discount .STRIKETHROUGH').text().trim() ||
      '';
    const url = normalizeEbayUrl(link.attr('href') || '');
    const image = pickImage($, el);
    pushItem(results, limit, { title, priceText, url, image, wasText });
  });
  return results;
}

/** Parse legacy list layout (still served in some regions / A-B tests) */
function parseSrpLegacyItems($, limit) {
  const results = [];
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
    const priceText = el.find('.s-item__price').first().text().trim();
    const wasText = el.find('.s-item__original-price, .s-item__price--original').text().trim();
    const url = normalizeEbayUrl(link.attr('href') || '');
    const image = pickImage($, el);
    pushItem(results, limit, { title, priceText, url, image, wasText });
  });
  return results;
}

/** Last resort: any /itm/ links inside main results river */
function parseItmLinksFallback($, limit) {
  const results = [];
  const seen = new Set();
  const container = $('.srp-river, .srp-results, main, #mainContent').first().length
    ? $('.srp-river, .srp-results, main, #mainContent').first()
    : $('body');
  container.find('a[href*="/itm/"]').each((i, a) => {
    if (results.length >= limit) return false;
    const link = $(a);
    let href = link.attr('href') || '';
    if (!/\/itm\/\d+/.test(href)) return;
    const url = normalizeEbayUrl(href);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const title =
      link.attr('aria-label') ||
      link.attr('title') ||
      link.find('span, div').first().text().trim() ||
      link.text().trim();
    const li = link.closest('li');
    const priceText =
      li.find('.s-card__price, .s-item__price, [class*="price"]').first().text().trim() ||
      link.closest('div').find('[class*="price"]').first().text().trim();
    const image = pickImage($, li.length ? li : link.parent());
    pushItem(results, limit, { title, priceText, url, image, wasText: '' });
  });
  return results;
}

function parseEbayHtml(html, limit) {
  const $ = cheerio.load(html);
  let results = parseSrpCards($, limit);
  if (results.length === 0) results = parseSrpLegacyItems($, limit);
  if (results.length === 0) results = parseItmLinksFallback($, limit);
  return results;
}

function looksLikeBlockedOrEmpty(html) {
  if (!html || typeof html !== 'string') return true;
  const h = html.toLowerCase();
  if (h.includes('pardon our interruption')) return true;
  if (h.includes('access denied')) return true;
  if (h.includes('robot check')) return true;
  if (h.includes('captcha')) return true;
  // If we see real listing URLs, try parsing even without srp-results class
  if (h.includes('/itm/') && (h.includes('srp-results') || h.includes('s-item') || h.includes('s-card'))) {
    return false;
  }
  if (h.includes('/itm/') && h.length > 50000) return false;
  return !h.includes('/itm/');
}

async function scrapeEbayCheerio(query, limit) {
  try {
    const ipg = Math.min(Math.max(limit, 1), 200);
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${ipg}&rt=nc`;
    const response = await axios.get(searchUrl, {
      headers: EBAY_HEADERS,
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const html = response.data;
    if (looksLikeBlockedOrEmpty(html)) return [];

    return parseEbayHtml(html, limit);
  } catch (err) {
    console.error('[eBay] Cheerio error:', err.message);
    return [];
  }
}

async function scrapeEbayPlaywright(query, limit) {
  const ipg = Math.min(Math.max(limit, 1), 200);
  const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${ipg}&rt=nc`;

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

      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 28000 });

      try {
        await page.waitForSelector('ul.srp-results li.s-card, li.s-item, a[href*="/itm/"]', {
          timeout: 12000,
        });
      } catch {
        /* continue */
      }

      await new Promise((r) => setTimeout(r, 800));
      const html = await page.content();
      await browser.close();
      browser = null;

      if (looksLikeBlockedOrEmpty(html)) return [];

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
