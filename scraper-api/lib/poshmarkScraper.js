// Poshmark scraper using Playwright (headless browser)
const { playwrightManager } = require('./playwrightManager');

async function scrapePoshmark(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const url = `https://poshmark.com/search?query=${encodeURIComponent(query)}`;

    browser = await playwrightManager.createBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('a[href*="/listing/"]', { timeout: 15000 });
    } catch (e) {
      // Continue even if selector times out
    }

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();
      const anchors = Array.from(document.querySelectorAll('a[href*="/listing/"]'));

      for (const anchor of anchors) {
        if (items.length >= maxLimit) break;
        const href = anchor.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = anchor.closest('article, li, div') || anchor;
        const text = card.innerText || '';

        // Extract all dollar amounts from the card
        const allPrices = [];
        const priceRegex = /\$\s?[\d,.]+/g;
        let m;
        while ((m = priceRegex.exec(text.replace(/,/g, ''))) !== null) {
          const val = parseFloat(m[0].replace(/[^\d.]/g, ''));
          if (val > 0) allPrices.push(val);
        }

        // Also look for struck-through / original price elements
        let originalPrice = null;
        const strikeEl = card.querySelector('s, del, [style*="line-through"], .original-price');
        if (strikeEl) {
          const strikeMatch = strikeEl.textContent.replace(/,/g, '').match(/[\d.]+/);
          if (strikeMatch) originalPrice = parseFloat(strikeMatch[0]);
        }

        // Poshmark typically shows listing price first, original higher
        const price = allPrices.length > 0 ? Math.min(...allPrices) : null;
        if (!originalPrice && allPrices.length >= 2) {
          const maxP = Math.max(...allPrices);
          if (maxP > price) originalPrice = maxP;
        }

        const imgEl = card.querySelector('img');
        const image = imgEl ? imgEl.src || imgEl.getAttribute('data-src') || '' : '';

        const title =
          (imgEl && imgEl.getAttribute('alt')) ||
          anchor.textContent.trim() ||
          '';

        if (!title || !price || !image || !href) continue;

        const item = {
          title,
          price,
          image,
          url: href,
          source: 'poshmark',
        };
        if (originalPrice && originalPrice > price) {
          item.originalPrice = originalPrice;
          item.discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }
        items.push(item);
      }

      return items;
    }, limit);

    await playwrightManager.closeBrowser(browser);
    return results;
  } catch (err) {
    console.error('Poshmark scrape error:', err.message);
    await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapePoshmark };
