function getQueryTokens(query) {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'of',
    'is', 'it', 'by', 'with', 'from', 'as', 'this', 'that', 'be', 'are',
    'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'vintage', 'secondhand', 'used', 'pre-owned', 'preowned',
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

function isRelevant(title, query, threshold = 0.4) {
  if (!title || !query) return false;

  const queryTokens = getQueryTokens(query);
  if (queryTokens.length === 0) return true;

  const titleLower = title.toLowerCase();
  let matches = 0;

  for (const token of queryTokens) {
    if (titleLower.includes(token)) {
      matches++;
    }
  }

  return matches / queryTokens.length >= threshold;
}

function filterByRelevance(results, query) {
  if (!query || !results || results.length === 0) return results;

  const relevant = results.filter((item) => isRelevant(item.title, query));

  // If filtering removes too many results, relax and return all
  if (relevant.length < 3 && results.length >= 3) {
    return results;
  }

  return relevant;
}

module.exports = { isRelevant, filterByRelevance, getQueryTokens };
