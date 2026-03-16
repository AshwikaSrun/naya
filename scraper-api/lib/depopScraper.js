const { playwrightManager } = require('./playwrightManager');

async function scrapeDepop(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const url = `https://www.depop.com/search?q=${encodeURIComponent(query)}`;

    browser = await playwrightManager.createBrowser();

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForSelector('a[href*="/products/"]', { timeout: 8000 });
    } catch {
      // Continue anyway
    }

    if (limit > 10) {
      const scrollAttempts = Math.ceil((limit - 10) / 20);
      for (let i = 0; i < scrollAttempts; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await page.waitForTimeout(800);
      }
    }

    await page.waitForTimeout(500);

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();
      const links = document.querySelectorAll('a[href*="/products/"]');

      for (const link of links) {
        if (items.length >= maxLimit) break;
        const href = link.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = link.closest('li') || link.closest('div') || link;

        let title = '';
        const urlMatch = href.match(/\/products\/([^/]+)\//);
        if (urlMatch && urlMatch[1]) {
          const parts = urlMatch[1].split('-');
          let titleParts = parts;
          if (parts[0] && parts[0].includes('_')) titleParts = parts.slice(1);
          if (titleParts.length > 1 && titleParts[titleParts.length - 1].length <= 6) {
            titleParts = titleParts.slice(0, -1);
          }
          title = titleParts.join(' ').replace(/\b\w/g, (l) => l.toUpperCase()).trim();
        }

        if (!title) {
          const textEls = Array.from(card.querySelectorAll('p, span'));
          for (const el of textEls) {
            const t = el.textContent.trim();
            if (t && !t.startsWith('$') && t.length > 10 && t.length < 200) {
              title = t;
              break;
            }
          }
        }

        const priceEl = card.querySelector('[aria-label="Price"], p[class*="price"]');
        if (!priceEl) continue;
        const priceMatch = priceEl.textContent.replace(/,/g, '').match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : null;
        if (!price) continue;

        let originalPrice = null;
        const origEl = card.querySelector('[aria-label="Original price"], s, del');
        if (origEl) {
          const origMatch = origEl.textContent.replace(/,/g, '').match(/[\d.]+/);
          if (origMatch) originalPrice = parseFloat(origMatch[0]);
        }

        const imgEl = card.querySelector('img');
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
            image = (candidates[0] && candidates[0].url) || '';
          } else {
            image = imgEl.src || imgEl.getAttribute('data-src') || '';
          }
        }
        if (!image) continue;

        image = image.replace(/\/P\d+\.(jpg|jpeg|png|webp)/i, '/P1.$1');

        const item = { title: title || 'Depop Item', price, image, url: href, source: 'depop' };
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
    console.error('Depop scrape error:', err.message);
    if (browser) await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapeDepop };
