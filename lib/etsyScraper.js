// Etsy scraper using Axios + Cheerio (with Playwright fallback)
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { playwrightManager } = require('./playwrightManager');

const SCRAPER_DEBUG = process.env.SCRAPER_DEBUG === '1';
const DEBUG_DIR = path.join(process.cwd(), 'debug');

function writeDebugFile(filename, contents) {
  if (!SCRAPER_DEBUG) return;
  try {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
    fs.writeFileSync(path.join(DEBUG_DIR, filename), contents);
  } catch (err) {
    console.error('Debug write error:', err.message);
  }
}

async function scrapeEtsy(query, limit = 10) {
  let browser = null;
  try {
    if (!query) return [];

    const url = `https://www.etsy.com/search?q=${encodeURIComponent(query)}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      writeDebugFile('etsy-axios.html', response.data);

      const $ = cheerio.load(response.data);
      const results = [];
      const seen = new Set();

      $('a[href*="/listing/"]').each((i, el) => {
        if (results.length >= limit) return false;
        const href = $(el).attr('href') || '';
        if (!href || seen.has(href)) return;
        seen.add(href);

        const card = $(el).closest('article, li, div');
        const title =
          $(el).find('h3, h2').first().text().trim() ||
          $(el).attr('title') ||
          $(el).text().trim();
        const priceText =
          card.find('.currency-value, [class*="price"]').first().text().trim() ||
          card.text();
        const priceMatch = priceText.replace(/,/g, '').match(/\$\s?[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/[^\d.]/g, '')) : null;
        const image =
          card.find('img').first().attr('src') ||
          card.find('img').first().attr('data-src') ||
          '';

        if (!title || !price || !image) return;

        results.push({
          title,
          price,
          image,
          url: href,
          source: 'etsy',
        });
      });

      if (results.length > 0) {
        return results;
      }
    } catch (err) {
      // Fall back to Playwright if HTML scraping fails
    }

    browser = await playwrightManager.createBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      // Ignore network idle timeout
    }

    try {
      await page.waitForSelector('a[href*="/listing/"], a.listing-link', { timeout: 15000 });
    } catch (e) {
      // Continue even if selector times out
    }

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 1.5);
    });
    await page.waitForTimeout(1500);

    const results = await page.evaluate((maxLimit) => {
      const items = [];
      const seen = new Set();
      const anchors = Array.from(
        document.querySelectorAll('a[href*="/listing/"], a.listing-link, a[data-listing-id]')
      );

      for (const anchor of anchors) {
        if (items.length >= maxLimit) break;
        const href = anchor.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        const card = anchor.closest('article, li, div') || anchor;
        const text = card.innerText || '';

        const priceEl =
          card.querySelector('[data-test-id*="price" i]') ||
          card.querySelector('.currency-value') ||
          card.querySelector('[class*="price" i]') ||
          card.querySelector('[aria-label*="price" i]');
        const priceText = priceEl ? priceEl.textContent : text;
        const priceMatch = priceText.replace(/,/g, '').match(/\$\s?[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/[^\d.]/g, '')) : null;

        const imgEl = card.querySelector('img');
        const image = imgEl
          ? imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-srcset') || ''
          : '';

        const titleEl =
          card.querySelector('[data-test-id*="listing-title" i]') ||
          card.querySelector('h3, h2') ||
          anchor;
        const title =
          (imgEl && imgEl.getAttribute('alt')) ||
          (titleEl && titleEl.textContent ? titleEl.textContent.trim() : '') ||
          '';

        if (!title || !price || !image || !href) continue;

        items.push({
          title,
          price,
          image,
          url: href,
          source: 'etsy',
        });
      }

      if (items.length === 0) {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '{}');
            const list =
              data['@type'] === 'ItemList'
                ? data.itemListElement
                : Array.isArray(data)
                ? data.find((entry) => entry['@type'] === 'ItemList')?.itemListElement
                : [];
            if (!Array.isArray(list)) continue;

            for (const entry of list) {
              if (items.length >= maxLimit) break;
              const item = entry.item || entry;
              const url = item.url || '';
              if (!url || seen.has(url)) continue;
              seen.add(url);

              const title = item.name || '';
              const image =
                (Array.isArray(item.image) ? item.image[0] : item.image) || '';
              const offer = item.offers || {};
              const priceValue = offer.price || offer.lowPrice || '';
              const price = priceValue ? parseFloat(priceValue) : null;

              if (!title || !price || !image) continue;

              items.push({
                title,
                price,
                image,
                url,
                source: 'etsy',
              });
            }
          } catch (e) {
            // ignore invalid JSON-LD blocks
          }
          if (items.length >= maxLimit) break;
        }
      }

      return items;
    }, limit);

    if (SCRAPER_DEBUG) {
      const html = await page.content();
      writeDebugFile('etsy-playwright.html', html);
    }

    await playwrightManager.closeBrowser(browser);
    return results;
  } catch (err) {
    console.error('Etsy scrape error:', err.message);
    await playwrightManager.closeBrowser(browser);
    return [];
  }
}

module.exports = { scrapeEtsy };
