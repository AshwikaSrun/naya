const { playwrightManager } = require('./playwrightManager');

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

    browser = await playwrightManager.createBrowser();

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('.sh-dgr__content, .sh-dlr__list-result, div[data-docid]', {
        timeout: 15000,
      });
    } catch {
      // Google may render differently; continue extraction
    }

    await page.waitForTimeout(2000);

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

    await playwrightManager.closeBrowser(browser);
    return results;
  } catch (err) {
    console.error('Google Shopping scrape error:', err.message);
    await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapeGoogleShopping };
