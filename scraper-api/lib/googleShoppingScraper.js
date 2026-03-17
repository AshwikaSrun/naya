const { chromium } = require('playwright');

const LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled'];

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

async function scrapeGoogleShopping(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const focusedQuery = buildFocusedQuery(query);
    const url = `https://www.google.com/search?tbm=shop&hl=en&gl=us&q=${encodeURIComponent(focusedQuery)}`;

    browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 15000 });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Handle Google consent form if it appears
    try {
      const consentBtn = await page.$('button[aria-label="Accept all"], form[action*="consent"] button');
      if (consentBtn) await consentBtn.click();
    } catch { /* no consent form */ }

    try {
      await page.waitForSelector('.sh-dgr__content, .sh-dlr__list-result, div[data-docid]', {
        timeout: 8000,
      });
    } catch {
      // Google may render differently; continue extraction
    }

    await page.waitForTimeout(500);

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();

      const cards = document.querySelectorAll(
        '.sh-dgr__content, .sh-dlr__list-result, div[data-docid]'
      );

      for (const card of cards) {
        if (items.length >= maxLimit) break;

        const linkEl =
          card.querySelector('a.shntl') ||
          card.querySelector('a[href*="/shopping/product/"]') ||
          card.querySelector('a[href*="url?"]') ||
          card.querySelector('a');
        if (!linkEl) continue;

        const href = linkEl.href || '';
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const url = href.startsWith('http') ? href : `https://www.google.com${href}`;

        const title =
          (card.querySelector('h3') || {}).textContent?.trim() ||
          (card.querySelector('.tAxDx') || {}).textContent?.trim() ||
          linkEl.getAttribute('aria-label') ||
          '';
        if (!title) continue;

        const priceText = (() => {
          const priceEl =
            card.querySelector('.a8Pemb') ||
            card.querySelector('[class*="price"]') ||
            card.querySelector('span[aria-label*="$"]');
          if (priceEl) return priceEl.textContent.trim();
          const match = card.textContent.match(/\$\s?[\d,.]+/);
          return match ? match[0] : '';
        })();
        const priceMatch = priceText.replace(/,/g, '').match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : null;
        if (price === null) continue;

        const imgEl = card.querySelector('img');
        let image = '';
        if (imgEl) {
          image = imgEl.src || imgEl.getAttribute('data-src') || '';
        }
        if (!image || image.startsWith('data:')) continue;

        items.push({
          title: title.length > 160 ? title.slice(0, 160) + '...' : title,
          price,
          image,
          url,
          source: 'google_shopping',
        });
      }

      return items;
    }, limit);

    await browser.close();
    return results;
  } catch (err) {
    console.error('Google Shopping scrape error:', err.message);
    await browser.close();
    return [];
  }
}

/**
 * Retail price lookup: searches Google Shopping for the raw query (no vintage modifier)
 * to find what items retail for at first-party stores.
 */
async function lookupRetailPrices(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return { prices: [], medianRetailPrice: null };

    const url = `https://www.google.com/search?tbm=shop&hl=en&gl=us&q=${encodeURIComponent(query.trim())}`;

    browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS, timeout: 15000 });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      const consentBtn = await page.$('button[aria-label="Accept all"], form[action*="consent"] button');
      if (consentBtn) await consentBtn.click();
    } catch { /* no consent form */ }

    try {
      await page.waitForSelector('.sh-dgr__content, .sh-dlr__list-result, div[data-docid]', {
        timeout: 8000,
      });
    } catch { /* continue */ }

    await page.waitForTimeout(500);

    const prices = await page.evaluate((maxLimit) => {
      const items = [];
      const cards = document.querySelectorAll(
        '.sh-dgr__content, .sh-dlr__list-result, div[data-docid]'
      );

      for (const card of cards) {
        if (items.length >= maxLimit) break;

        const title =
          (card.querySelector('h3') || {}).textContent?.trim() ||
          (card.querySelector('.tAxDx') || {}).textContent?.trim() ||
          '';
        if (!title) continue;

        const priceText = (() => {
          const priceEl =
            card.querySelector('.a8Pemb') ||
            card.querySelector('[class*="price"]') ||
            card.querySelector('span[aria-label*="$"]');
          if (priceEl) return priceEl.textContent.trim();
          const match = card.textContent.match(/\$\s?[\d,.]+/);
          return match ? match[0] : '';
        })();
        const priceMatch = priceText.replace(/,/g, '').match(/[\d.]+/);
        const retailPrice = priceMatch ? parseFloat(priceMatch[0]) : null;
        if (retailPrice === null || retailPrice <= 0) continue;

        items.push({ title, retailPrice });
      }

      return items;
    }, limit);

    await browser.close();

    // Calculate median retail price
    const sortedPrices = prices.map((p) => p.retailPrice).sort((a, b) => a - b);
    let medianRetailPrice = null;
    if (sortedPrices.length > 0) {
      const mid = Math.floor(sortedPrices.length / 2);
      medianRetailPrice =
        sortedPrices.length % 2 === 0
          ? (sortedPrices[mid - 1] + sortedPrices[mid]) / 2
          : sortedPrices[mid];
    }

    return { prices, medianRetailPrice };
  } catch (err) {
    console.error('Retail price lookup error:', err.message);
    if (browser) await browser.close().catch(() => {});
    return { prices: [], medianRetailPrice: null };
  }
}

module.exports = { scrapeGoogleShopping, lookupRetailPrices };
