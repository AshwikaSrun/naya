// Vestiaire Collective scraper using Playwright (headless browser)
const { playwrightManager } = require('./playwrightManager');

async function scrapeVestiaire(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const url = `https://www.vestiairecollective.com/search/?q=${encodeURIComponent(query)}`;

    browser = await playwrightManager.createBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('a[href$=".shtml"], a[href*="/items/"]', { timeout: 15000 });
    } catch (e) {
      // Continue even if selector times out
    }

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();
      const anchors = Array.from(
        document.querySelectorAll('a[href$=".shtml"], a[href*="/items/"]')
      );

      for (const anchor of anchors) {
        if (items.length >= maxLimit) break;
        const href = anchor.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = anchor.closest('article, li, div') || anchor;
        const text = card.innerText || '';
        const priceMatch = text.replace(/,/g, '').match(/\$\s?[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/[^\d.]/g, '')) : null;

        const imgEl = card.querySelector('img');
        const image = imgEl ? imgEl.src || imgEl.getAttribute('data-src') || '' : '';

        const title =
          (imgEl && imgEl.getAttribute('alt')) ||
          anchor.textContent.trim() ||
          '';

        if (!title || !price || !image || !href) continue;

        items.push({
          title,
          price,
          image,
          url: href,
          source: 'vestiaire',
        });
      }

      return items;
    }, limit);

    await playwrightManager.closeBrowser(browser);
    return results;
  } catch (err) {
    console.error('Vestiaire scrape error:', err.message);
    await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapeVestiaire };
