/**
 * Relevance scoring and filtering for search results.
 * Ensures results closely match the query — right brand, right item type.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of',
  'is', 'it', 'by', 'with', 'from', 'as', 'this', 'that', 'be', 'are',
  'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'vintage', 'secondhand', 'used', 'pre-owned', 'preowned',
  'size', 'new', 'nwt', 'nwot', 'shipping', 'free',
]);

const BRAND_NAMES = new Set([
  'nike', 'adidas', 'jordan', 'gucci', 'prada', 'balenciaga', 'louis', 'vuitton',
  'chanel', 'hermes', 'dior', 'versace', 'burberry', 'supreme', 'stussy',
  'carhartt', 'levis', 'ralph', 'lauren', 'polo', 'tommy', 'hilfiger',
  'north', 'face', 'patagonia', 'arcteryx', 'yeezy', 'new balance',
  'converse', 'vans', 'reebok', 'asics', 'puma', 'fila', 'champion',
  'gap', 'zara', 'uniqlo', 'aeropostale', 'hollister', 'abercrombie',
]);

// Item type groups — if query contains one type, results with a conflicting type are penalized
const ITEM_TYPE_GROUPS = {
  tops: ['shirt', 'tee', 't-shirt', 'tshirt', 'top', 'blouse', 'tank'],
  bottoms: ['jeans', 'pants', 'trousers', 'shorts', 'skirt'],
  jackets: ['jacket', 'coat', 'blazer', 'parka', 'windbreaker', 'anorak'],
  hoodies: ['hoodie', 'sweatshirt', 'pullover', 'crewneck', 'crew neck'],
  shoes: ['shoes', 'sneakers', 'boots', 'sandals', 'loafers', 'heels'],
  bags: ['bag', 'purse', 'backpack', 'tote', 'clutch', 'satchel'],
  accessories: ['hat', 'cap', 'beanie', 'scarf', 'belt', 'watch', 'jewelry', 'sunglasses'],
  vests: ['vest', 'gilet', 'waistcoat'],
  dresses: ['dress', 'gown', 'romper', 'jumpsuit'],
};

// Build a reverse lookup: item word -> group name
const WORD_TO_GROUP = {};
for (const [group, words] of Object.entries(ITEM_TYPE_GROUPS)) {
  for (const w of words) {
    WORD_TO_GROUP[w] = group;
  }
}

function getQueryTokens(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function detectItemType(text) {
  const lower = text.toLowerCase();
  for (const [word, group] of Object.entries(WORD_TO_GROUP)) {
    if (lower.includes(word)) return group;
  }
  return null;
}

/**
 * Score a single item's title against the query.
 * Returns a number between 0 and 1.
 */
function scoreRelevance(title, query) {
  if (!title || !query) return 0;

  const queryTokens = getQueryTokens(query);
  if (queryTokens.length === 0) return 0.5;

  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase().trim();

  let weightedScore = 0;
  let totalWeight = 0;

  for (const token of queryTokens) {
    const isBrand = BRAND_NAMES.has(token);
    const weight = isBrand ? 2.5 : 1.0;
    totalWeight += weight;

    if (titleLower.includes(token)) {
      weightedScore += weight;
    }
  }

  const tokenScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  const phraseBonus = titleLower.includes(queryLower) ? 0.15 : 0;

  let consecutiveBonus = 0;
  if (queryTokens.length >= 2) {
    let adjacentPairs = 0;
    for (let i = 0; i < queryTokens.length - 1; i++) {
      const pair = queryTokens[i] + ' ' + queryTokens[i + 1];
      if (titleLower.includes(pair)) adjacentPairs++;
    }
    consecutiveBonus = (adjacentPairs / (queryTokens.length - 1)) * 0.1;
  }

  // Item type mismatch penalty
  const queryType = detectItemType(query);
  const titleType = detectItemType(title);
  let typePenalty = 0;
  if (queryType && titleType && queryType !== titleType) {
    typePenalty = -0.4;
  }

  return Math.max(0, Math.min(1, tokenScore + phraseBonus + consecutiveBonus + typePenalty));
}

/**
 * Score and filter results, attaching _relevanceScore to each item.
 * Threshold raised to 0.4 for tighter matching.
 */
function filterByRelevance(results, query, threshold = 0.4) {
  if (!query || !results || results.length === 0) return results;

  const scored = results.map((item) => ({
    ...item,
    _relevanceScore: scoreRelevance(item.title, query),
  }));

  return scored.filter((item) => {
    // Results from platform-side search (e.g. Depop API) are already relevant;
    // their titles are often truncated slugs missing query keywords, so skip
    // our keyword-based relevance filter for them.
    if (item._platformSearched) return true;
    return item._relevanceScore >= threshold;
  });
}

module.exports = { scoreRelevance, filterByRelevance, getQueryTokens };
