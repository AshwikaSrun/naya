const axios = require('axios');

const SHOPIFY_BASE = 'https://www.boilervintage.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function scrapeBoilerVintage(query, limit = 10) {
  if (!query) return [];

  try {
    const url = `${SHOPIFY_BASE}/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=${Math.min(limit, 10)}`;
    const resp = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      timeout: 8000,
    });

    const products = resp.data?.resources?.results?.products || [];
    if (products.length > 0) {
      return products.slice(0, limit).map(parseShopifyProduct).filter(Boolean);
    }
  } catch {
    // suggest endpoint may not be available; fall through to products.json
  }

  try {
    const url = `${SHOPIFY_BASE}/products.json?limit=250`;
    const resp = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      timeout: 10000,
    });

    const allProducts = resp.data?.products || [];
    const queryLower = query.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter((t) => t.length >= 2);

    const matched = allProducts
      .map((p) => {
        const haystack = `${p.title} ${p.product_type} ${p.vendor} ${(p.tags || []).join(' ')}`.toLowerCase();
        let score = 0;
        for (const token of tokens) {
          if (haystack.includes(token)) score++;
        }
        return { product: p, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((m) => parseShopifyProduct(m.product));

    return matched.filter(Boolean);
  } catch (err) {
    console.error('[BoilerVintage] error:', err.message);
    return [];
  }
}

function parseShopifyProduct(product) {
  if (!product) return null;

  const title = product.title || '';

  // Handle both suggest API shape (price as top-level string) and products.json (nested in variants)
  const variant = product.variants?.[0];
  const price = product.price
    ? parseFloat(product.price)
    : variant ? parseFloat(variant.price) : null;

  const compareAt = product.compare_at_price_max && parseFloat(product.compare_at_price_max) > 0
    ? parseFloat(product.compare_at_price_max)
    : variant?.compare_at_price ? parseFloat(variant.compare_at_price) : null;

  // Suggest API: image as string or featured_image.url; products.json: images[0].src
  const image = product.image
    || product.featured_image?.url
    || product.images?.[0]?.src
    || '';

  const handle = product.handle || '';
  const rawUrl = product.url || '';
  const cleanUrl = rawUrl ? rawUrl.split('?')[0] : '';
  const url = cleanUrl
    ? `${SHOPIFY_BASE}${cleanUrl}`
    : handle ? `${SHOPIFY_BASE}/products/${handle}` : '';

  const available = product.available ?? product.variants?.some((v) => v.available) ?? true;

  if (!title || !price || price <= 0 || !url) return null;
  if (!available) return null;

  const item = {
    title,
    price,
    image,
    url,
    source: 'boiler_vintage',
    _platformSearched: true,
  };

  if (compareAt && compareAt > price) {
    item.originalPrice = compareAt;
    item.discountPercent = Math.round(((compareAt - price) / compareAt) * 100);
  }

  if (product.vendor) item.brand = product.vendor;

  const size = variant?.option1 || null;
  if (size) item.size = size;

  const grade = variant?.option2 || null;
  if (grade) item.condition = grade;

  return item;
}

module.exports = { scrapeBoilerVintage };
