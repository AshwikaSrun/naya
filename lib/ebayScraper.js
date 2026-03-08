// eBay scraper
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEbay(query, limit = 10) {
  try {
    if (!query) return [];
    
    // Use _ipg=100 to get more items per page (max 200)
    const itemsPerPage = Math.min(limit, 200);
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&_ipg=${itemsPerPage}`;
    
    // Fetch the page
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Parse eBay search results - items are in ul.srp-results li.s-card
    $('ul.srp-results li.s-card').each((i, elem) => {
      // Stop after limit results
      if (results.length >= limit) {
        return false; // Break the loop
      }

      // Get title from .s-card__title or link's aria-label
      const link = $(elem).find('a[href*="/itm/"]').first();
      const title = $(elem).find('.s-card__title').text().trim() || 
                    link.attr('aria-label') || 
                    link.attr('title') || 
                    link.text().trim();
      
      // Clean up title (remove "Opens in a new window" etc.)
      const cleanTitle = title ? title.replace(/\s*Opens in a new window.*$/i, '').trim() : '';
      
      // Get price from .s-card__price
      const priceText = $(elem).find('.s-card__price').text().trim();

      // Extract original/"Was" price from strikethrough or tagline elements
      const wasText =
        $(elem).find('.s-card__tagline .STRIKETHROUGH, .s-card__tagline s, .s-card__tagline del').text().trim() ||
        $(elem).find('span.s-item__price--original, .s-item__discount .STRIKETHROUGH').text().trim() ||
        '';
      
      // Get image (prefer higher resolution if available)
      let image = $(elem).find('img').first().attr('src') || '';
      if (image) {
        image = image.replace(/s-l\d+/i, 's-l500');
      }
      
      // Get URL
      const url = link.attr('href') || '';

      // Skip if essential data is missing
      if (!cleanTitle || !priceText || !url) {
        return;
      }

      // Extract price as number - remove currency symbols and commas
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;

      // Extract original price
      let originalPrice = null;
      if (wasText) {
        const wasMatch = wasText.match(/[\d,]+\.?\d*/);
        originalPrice = wasMatch ? parseFloat(wasMatch[0].replace(/,/g, '')) : null;
      }

      // Calculate discount
      let discountPercent = null;
      if (originalPrice && price && originalPrice > price) {
        discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      if (price && cleanTitle && url) {
        const item = {
          title: cleanTitle,
          price,
          image: image || '',
          url,
          source: 'ebay'
        };
        if (originalPrice && originalPrice > price) item.originalPrice = originalPrice;
        if (discountPercent) item.discountPercent = discountPercent;
        results.push(item);
      }
    });

    return results;
  } catch (error) {
    console.error('eBay scraping error:', error);
    return [];
  }
}

module.exports = { scrapeEbay };
