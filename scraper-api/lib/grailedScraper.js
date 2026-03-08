const { playwrightManager } = require('./playwrightManager');

async function scrapeGrailed(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const url = `https://www.grailed.com/shop?query=${encodeURIComponent(query.trim())}`;

    browser = await playwrightManager.createBrowser();

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForSelector('a[href*="/listings/"]', { timeout: 15000 });
    } catch {
      // Page may have loaded differently; continue extraction anyway
    }

    if (limit > 10) {
      const scrollAttempts = Math.ceil((limit - 10) / 20);
      for (let i = 0; i < scrollAttempts; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await page.waitForTimeout(2000);
        const currentCount = await page.evaluate(() =>
          document.querySelectorAll('a[href*="/listings/"]').length
        );
        if (currentCount >= limit) break;
      }
    }

    await page.waitForTimeout(2000);

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();
      const links = document.querySelectorAll('a[href*="/listings/"]');

      for (const link of links) {
        if (items.length >= maxLimit) break;

        const href = link.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = link.closest('article') || link.closest('li') || link.closest('div');
        if (!card) continue;

        let title = '';
        const titleEl = card.querySelector('h3') || card.querySelector('h2');
        if (titleEl) {
          title = titleEl.textContent.trim();
        }
        if (!title) {
          title = link.getAttribute('aria-label') || '';
        }
        if (!title) {
          let slug = href.split('/listings/')[1] || '';
          slug = slug.split('?')[0];
          slug = slug.replace(/^\d+-/, '');
          if (slug) {
            title = slug
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase())
              .trim();
          }
        }
        title = title.split('?')[0].trim();

        // Extract current and original prices
        let price = null;
        let originalPrice = null;

        const priceEls = card.querySelectorAll('[class*="Price"], [class*="price"]');
        for (const el of priceEls) {
          const style = window.getComputedStyle(el);
          const isStruck = style.textDecorationLine === 'line-through' ||
            el.tagName === 'S' || el.tagName === 'DEL';
          const valMatch = el.textContent.replace(/,/g, '').match(/[\d.]+/);
          if (!valMatch) continue;
          const val = parseFloat(valMatch[0]);
          if (isStruck) {
            originalPrice = val;
          } else {
            price = val;
          }
        }

        if (price === null) {
          const fallback = card.textContent.match(/\$\s?[\d,.]+/);
          if (fallback) {
            price = parseFloat(fallback[0].replace(/[^\d.]/g, ''));
          }
        }
        if (price === null) continue;

        const imgEl = card.querySelector('img');
        let image = '';
        if (imgEl) {
          const srcset = imgEl.getAttribute('srcset') || imgEl.getAttribute('data-srcset');
          if (srcset) {
            const candidates = srcset
              .split(',')
              .map((e) => e.trim())
              .map((e) => {
                const [u, s] = e.split(/\s+/);
                const wm = s ? s.match(/(\d+)w/i) : null;
                return { url: u, width: wm ? parseInt(wm[1], 10) : 0 };
              })
              .filter((c) => c.url);
            candidates.sort((a, b) => b.width - a.width);
            image = (candidates[0] && candidates[0].url) || '';
          } else {
            image = imgEl.src || imgEl.getAttribute('data-src') || '';
          }
        }
        if (!image) continue;

        const item = {
          title: title.length > 140 ? title.slice(0, 140) + '...' : title || 'Grailed Item',
          price,
          image,
          url: href,
          source: 'grailed',
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
    console.error('Grailed scrape error:', err.message);
    await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapeGrailed };
