// Depop scraper using Playwright (headless browser)
const { playwrightManager } = require('./playwrightManager');

async function scrapeDepop(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const url = `https://www.depop.com/search?q=${encodeURIComponent(query)}`;
    
    // Use managed browser instance to limit concurrent instances
    browser = await playwrightManager.createBrowser();
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Navigate to search page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for listings to load
    try {
      await page.waitForSelector('.styles_productCardRoot__DaYPT', { timeout: 15000 });
    } catch (e) {
      // Continue anyway
    }
    
    // Scroll to load more items if limit > 10
    if (limit > 10) {
      const scrollAttempts = Math.ceil((limit - 10) / 20); // Roughly 20 items per scroll
      for (let i = 0; i < scrollAttempts; i++) {
        // Scroll down
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 2);
        });
        // Wait for new content to load
        await page.waitForTimeout(2000);
        
        // Check if we have enough items
        const currentCount = await page.evaluate(() => {
          return document.querySelectorAll('.styles_productCardRoot__DaYPT').length;
        });
        
        if (currentCount >= limit) break;
      }
    }
    
    // Give it time for lazy-loaded content
    await page.waitForTimeout(2000);
    
    // Extract listings
    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const cards = document.querySelectorAll('.styles_productCardRoot__DaYPT');
      
      for (let i = 0; i < Math.min(cards.length, maxLimit); i++) {
        const card = cards[i];
        
        // Extract URL
        const linkEl = card.querySelector('a[href*="/products/"]');
        if (!linkEl) continue;
        const urlPath = linkEl.href;
        if (!urlPath) continue;
        
        // Extract title from URL slug (format: /products/username-product-name-id/)
        let title = '';
        const urlMatch = urlPath.match(/\/products\/([^\/]+)\//);
        if (urlMatch && urlMatch[1]) {
          // Remove username (everything before the last dash with alphanumeric)
          const slug = urlMatch[1];
          // Split by dash and remove the last part if it looks like an ID (short alphanumeric)
          const parts = slug.split('-');
          // Remove username (first part before underscore if exists) and ID (last short part)
          let titleParts = parts;
          if (parts[0].includes('_')) {
            titleParts = parts.slice(1); // Remove username part
          }
          // Remove last part if it's short (likely an ID)
          if (titleParts.length > 1 && titleParts[titleParts.length - 1].length <= 6) {
            titleParts = titleParts.slice(0, -1);
          }
          // Convert slug to readable title
          title = titleParts
            .join(' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
        }
        
        // If no title from URL, try to find it in the card
        if (!title) {
          const textElements = Array.from(card.querySelectorAll('p, span, div'));
          for (const el of textElements) {
            const text = el.textContent.trim();
            if (text && !text.startsWith('$') && text.length > 10 && text.length < 200 && !text.match(/^(XXL|XL|L|M|S|Nike|Brand)$/i)) {
              title = text;
              break;
            }
          }
        }
        
        // Extract price and original price
        const priceEl = card.querySelector('[aria-label="Price"], p[class*="price"]');
        if (!priceEl) continue;
        const priceText = priceEl.textContent.trim();
        if (!priceText) continue;
        const priceMatch = priceText.replace(/,/g, '').match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : null;
        if (price === null) continue;

        let originalPrice = null;
        // Depop shows original price in a separate element or with line-through styling
        const origEl = card.querySelector('[aria-label="Original price"], [class*="originalPrice"], s, del');
        if (origEl) {
          const origMatch = origEl.textContent.replace(/,/g, '').match(/[\d.]+/);
          if (origMatch) originalPrice = parseFloat(origMatch[0]);
        }
        // Also check for a second price element in the card
        if (!originalPrice) {
          const allPriceEls = card.querySelectorAll('[class*="price"], [aria-label*="rice"]');
          for (const el of allPriceEls) {
            const style = window.getComputedStyle(el);
            if (style.textDecorationLine === 'line-through') {
              const m = el.textContent.replace(/,/g, '').match(/[\d.]+/);
              if (m) originalPrice = parseFloat(m[0]);
            }
          }
        }
        
        // Extract image — force high-res by rewriting Depop CDN width param
        const imgEl = card.querySelector('img');
        let image = '';
        if (imgEl) {
          const srcset =
            imgEl.getAttribute('srcset') || imgEl.getAttribute('data-srcset');
          if (srcset) {
            const candidates = srcset
              .split(',')
              .map((entry) => entry.trim())
              .map((entry) => {
                const [url, size] = entry.split(/\s+/);
                const widthMatch = size ? size.match(/(\d+)w/i) : null;
                return {
                  url,
                  width: widthMatch ? parseInt(widthMatch[1], 10) : 0,
                };
              })
              .filter((candidate) => candidate.url);
            candidates.sort((a, b) => b.width - a.width);
            image = (candidates[0] && candidates[0].url) || '';
          } else {
            image = imgEl.src || imgEl.getAttribute('data-src') || '';
          }
        }
        if (!image) continue;

        // Depop CDN: /P10.jpg is a tiny thumbnail, /P1.jpg is full-res
        image = image.replace(/\/P\d+\.(jpg|jpeg|png|webp)/i, '/P1.$1');
        
        const item = { 
          title: title || 'Depop Item',
          price, 
          image, 
          url: urlPath, 
          source: 'depop' 
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
    console.error('Depop scrape error:', err.message);
    await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapeDepop };
