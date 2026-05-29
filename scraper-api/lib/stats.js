/**
 * Order-statistic helpers used by the price-intelligence endpoints.
 *
 * Kept in their own module (vs inlined in server.js) so they can be unit-
 * tested in isolation and reused by the data-engine / insights routes.
 */

/**
 * Linear-interpolating quantile (NIST-recommended, matches numpy default).
 * Returns null on empty input; returns the only value if `sortedAsc.length === 1`.
 *
 * @param {number[]} sortedAsc  Input sorted ascending. The function does not sort for you.
 * @param {number}   p          Quantile in [0, 1].
 */
function percentile(sortedAsc, p) {
  if (!Array.isArray(sortedAsc) || sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  if (p <= 0) return sortedAsc[0];
  if (p >= 1) return sortedAsc[sortedAsc.length - 1];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function median(sortedAsc) {
  return percentile(sortedAsc, 0.5);
}

/**
 * Group items by `source` and compute median + count per group.
 * @param {{ source: string, price: number }[]} items
 */
function buildPlatformBreakdown(items) {
  const groups = {};
  for (const item of items) {
    const src = item.source || 'unknown';
    if (!groups[src]) groups[src] = [];
    groups[src].push(item.price);
  }
  const out = {};
  for (const [src, prices] of Object.entries(groups)) {
    prices.sort((a, b) => a - b);
    out[src] = { median: median(prices), count: prices.length };
  }
  return out;
}

/**
 * Score a user's listing price against the live market distribution.
 * Returns `'good' | 'fair' | 'high'`.
 *
 * @param {number} userPrice
 * @param {number} p25
 * @param {number} p75
 */
function dealScore(userPrice, p25, p75) {
  if (!Number.isFinite(userPrice) || userPrice <= 0) return 'fair';
  if (p25 != null && userPrice <= p25) return 'good';
  if (p75 != null && userPrice <= p75) return 'fair';
  return 'high';
}

module.exports = { percentile, median, buildPlatformBreakdown, dealScore };
