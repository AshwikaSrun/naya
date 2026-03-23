// eBay scraper (Cheerio) — parsing aligned with scraper-api/lib/ebayScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function pushEbayRow(results, limit, { cleanTitle, priceText, url, image, wasText }) {
  if (results.length >= limit) return;
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
  if (originalPrice && price && originalPrice > price) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  const item = { title: cleanTitle, price, image: image || '', url, source: 'ebay' };
  if (originalPrice && originalPrice > price) item.originalPrice = originalPrice;
  if (discountPercent) item.discountPercent = discountPercent;
  results.push(item);
}

function parseEbayHtml(html, limit) {
  const $ = cheerio.load(html);
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
    const cleanTitle = title ? title.replace(/\s*Opens in a new window.*$/i, '').trim() : '';
    const priceText = el.find('.s-card__price').text().trim();
    const wasText =
      el.find('.s-card__tagline .STRIKETHROUGH, .s-card__tagline s, .s-card__tagline del').text().trim() ||
      el.find('span.s-item__price--original, .s-item__discount .STRIKETHROUGH').text().trim() ||
      '';
    let image = el.find('img').first().attr('src') || '';
    if (image) image = image.replace(/s-l\d+/i, 's-l500');
    const url = link.attr('href') || '';
    if (!image || image.includes('/null')) return;
    pushEbayRow(results, limit, { cleanTitle, priceText, url, image, wasText });
  });

  if (results.length === 0) {
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
      const cleanTitle = title ? title.replace(/\s*Opens in a new window.*$/i, '').trim() : '';
      const priceText = el.find('.s-item__price').first().text().trim();
      const wasText = el.find('.s-item__original-price, .s-item__price--original').text().trim();
      let image = el.find('img').first().attr('src') || '';
      if (image) image = image.replace(/s-l\d+/i, 's-l500');
      const url = link.attr('href') || '';
      pushEbayRow(results, limit, { cleanTitle, priceText, url, image, wasText });
    });
  }

  return results;
}

function ebayHtmlLooksParseable(html) {
  if (!html || typeof html !== 'string') return false;
  if (html.includes('Pardon Our Interruption')) return false;
  return (
    html.includes('srp-results') ||
    html.includes('s-item') ||
    html.includes('s-card') ||
    (html.includes('/itm/') && html.length > 8000)
  );
}

async function scrapeEbay(query, limit = 10) {
  try {
    if (!query) return [];

    const itemsPerPage = Math.min(limit, 200);
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${itemsPerPage}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Referer: 'https://www.ebay.com/',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
    });

    const html = response.data;
    if (!ebayHtmlLooksParseable(html)) return [];

    return parseEbayHtml(html, limit);
  } catch (error) {
    console.error('eBay scraping error:', error);
    return [];
  }
}

module.exports = { scrapeEbay };
