/**
 * Relevance scoring for search results.
 * Returns numeric scores (0-1) with weighted token matching.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of',
  'is', 'it', 'by', 'with', 'from', 'as', 'this', 'that', 'be', 'are',
  'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'vintage', 'secondhand', 'used', 'pre-owned', 'preowned',
  'size', 'new', 'nwt', 'nwot', 'shipping', 'free',
]);

// Common fashion brand names get extra weight when matching
const BRAND_NAMES = new Set([
  'nike', 'adidas', 'jordan', 'gucci', 'prada', 'balenciaga', 'louis', 'vuitton',
  'chanel', 'hermes', 'dior', 'versace', 'burberry', 'supreme', 'stussy',
  'carhartt', 'levis', 'ralph', 'lauren', 'polo', 'tommy', 'hilfiger',
  'north', 'face', 'patagonia', 'arcteryx', 'yeezy', 'new balance',
  'converse', 'vans', 'reebok', 'asics', 'puma', 'fila', 'champion',
  'gap', 'zara', 'uniqlo', 'aeropostale', 'hollister', 'abercrombie',
]);

function getQueryTokens(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
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
    const weight = isBrand ? 2.0 : 1.0;
    totalWeight += weight;

    if (titleLower.includes(token)) {
      weightedScore += weight;
    }
  }

  const tokenScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Exact phrase bonus: if the full query appears as a substring
  const phraseBonus = titleLower.includes(queryLower) ? 0.15 : 0;

  // Consecutive token bonus: reward adjacent query tokens appearing in order
  let consecutiveBonus = 0;
  if (queryTokens.length >= 2) {
    let adjacentPairs = 0;
    for (let i = 0; i < queryTokens.length - 1; i++) {
      const pair = queryTokens[i] + ' ' + queryTokens[i + 1];
      if (titleLower.includes(pair)) adjacentPairs++;
    }
    consecutiveBonus = (adjacentPairs / (queryTokens.length - 1)) * 0.1;
  }

  return Math.min(1, tokenScore + phraseBonus + consecutiveBonus);
}

/**
 * Score and filter results, attaching _relevanceScore to each item.
 * Items below the threshold are dropped.
 */
function filterByRelevance(results, query, threshold = 0.2) {
  if (!query || !results || results.length === 0) return results;

  const scored = results.map((item) => ({
    ...item,
    _relevanceScore: scoreRelevance(item.title, query),
  }));

  return scored.filter((item) => item._relevanceScore >= threshold);
}

module.exports = { scoreRelevance, filterByRelevance, getQueryTokens };
