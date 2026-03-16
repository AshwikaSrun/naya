const { getSupabase } = require('./supabaseClient');

const BRAND_NAMES = new Set([
  'nike', 'adidas', 'jordan', 'gucci', 'prada', 'balenciaga', 'louis vuitton',
  'chanel', 'hermes', 'dior', 'versace', 'burberry', 'supreme', 'stussy',
  'carhartt', 'levis', 'levi', 'ralph lauren', 'polo', 'tommy hilfiger',
  'north face', 'patagonia', 'arcteryx', 'yeezy', 'new balance',
  'converse', 'vans', 'reebok', 'asics', 'puma', 'fila', 'champion',
  'gap', 'zara', 'uniqlo', 'aeropostale', 'hollister', 'abercrombie',
  'dickies', 'wrangler', 'starter', 'russell', 'hanes', 'fruit of the loom',
]);

const ITEM_TYPES = {
  jacket: ['jacket', 'coat', 'blazer', 'parka', 'windbreaker', 'anorak', 'bomber'],
  hoodie: ['hoodie', 'sweatshirt', 'pullover'],
  crewneck: ['crewneck', 'crew neck', 'sweater'],
  tee: ['tee', 't-shirt', 'tshirt', 'shirt', 'top'],
  jeans: ['jeans', 'denim'],
  pants: ['pants', 'trousers', 'chinos', 'khakis', 'cargos'],
  shorts: ['shorts'],
  shoes: ['shoes', 'sneakers', 'boots', 'sandals', 'loafers'],
  hat: ['hat', 'cap', 'beanie', 'bucket hat', 'snapback', 'fitted'],
  bag: ['bag', 'backpack', 'tote', 'purse', 'satchel'],
  vest: ['vest', 'gilet'],
  dress: ['dress', 'gown', 'romper', 'jumpsuit'],
  skirt: ['skirt'],
};

const TYPE_LOOKUP = {};
for (const [type, words] of Object.entries(ITEM_TYPES)) {
  for (const w of words) TYPE_LOOKUP[w] = type;
}

function extractBrand(title) {
  const lower = title.toLowerCase();
  for (const brand of BRAND_NAMES) {
    if (lower.includes(brand)) return brand;
  }
  return null;
}

function extractItemType(title) {
  const lower = title.toLowerCase();
  for (const [word, type] of Object.entries(TYPE_LOOKUP)) {
    if (lower.includes(word)) return type;
  }
  return null;
}

async function ingestSearchResults(query, finalResults, campusSlug) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const allItems = [];
    const platformsHit = [];

    for (const [platform, items] of Object.entries(finalResults)) {
      if (Array.isArray(items) && items.length > 0) {
        platformsHit.push(platform);
        for (const item of items) {
          allItems.push({
            query: query.toLowerCase().trim(),
            item_title: (item.title || '').substring(0, 200),
            brand: extractBrand(item.title || ''),
            item_type: extractItemType(item.title || ''),
            price: item.price,
            original_price: item.originalPrice || null,
            source: item.source || platform,
            image_url: (item.image || '').substring(0, 500),
            listing_url: (item.url || '').substring(0, 500),
          });
        }
      }
    }

    const promises = [];

    if (allItems.length > 0) {
      // Batch insert in chunks of 100
      for (let i = 0; i < allItems.length; i += 100) {
        const chunk = allItems.slice(i, i + 100);
        promises.push(
          supabase.from('price_observations').insert(chunk)
            .then(({ error }) => {
              if (error) console.error('[ingest] price_observations insert error:', error.message);
            })
        );
      }
    }

    promises.push(
      supabase.from('search_events').insert({
        query: query.toLowerCase().trim(),
        campus_slug: campusSlug || null,
        result_count: allItems.length,
        platforms_hit: platformsHit,
      })
      .then(({ error }) => {
        if (error) console.error('[ingest] search_events insert error:', error.message);
      })
    );

    await Promise.all(promises);
    console.log(`[ingest] stored ${allItems.length} observations + 1 event for q="${query}"`);
  } catch (err) {
    console.error('[ingest] failed:', err.message);
  }
}

module.exports = { ingestSearchResults, extractBrand, extractItemType };
