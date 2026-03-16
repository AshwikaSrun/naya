/**
 * Post-scrape data quality pipeline.
 * Cleans, validates, deduplicates, and ranks results.
 */

// ── Step 1: Clean titles ─────────────────────────────────────────────

const TITLE_CRUFT = [
  /opens?\s+in\s+a?\s*new\s+(window|tab)/gi,
  /\bnew\s+listing\b/gi,
  /\bsponsored\b/gi,
  /\bfree\s+shipping\b/gi,
  /\bfree\s+returns?\b/gi,
  /\bbest\s+seller\b/gi,
  /\bad\b/gi,
  /\bpromoted\b/gi,
  /\|\s*ebay$/gi,
  /\|\s*poshmark$/gi,
  /\blike\s+new\b/gi,
  /\bnew\s+with\s+tags?\b/gi,
  /\bnwt\b/gi,
  /\bnwot\b/gi,
  /\beuc\b/gi,
  /\bguc\b/gi,
  /\bpre[- ]?owned\b/gi,
  /\bauthentic\b/gi,
  /\b100%\s*authentic\b/gi,
  /\bauth\b/gi,
  /\brare\s*!*\b/gi,
  /\bmust\s+see\b/gi,
  /\bbundle\s+and\s+save\b/gi,
  /\bfast\s+ship(ping)?\b/gi,
];

function cleanTitle(title, source) {
  if (!title) return '';
  let t = title;

  // Strip query params that leaked into titles
  t = t.split('?')[0];

  // Strip leading listing IDs (digits followed by space then text)
  t = t.replace(/^\d{6,}\s+/, '');

  // Strip platform-specific cruft
  for (const re of TITLE_CRUFT) {
    t = t.replace(re, '');
  }

  // Depop slugs: replace remaining dashes-as-spaces if mostly dashes
  if (source === 'depop' && t.includes('-') && !t.includes(' ')) {
    t = t.replace(/-/g, ' ');
  }

  // Poshmark: strip leading "BrandName Category" pattern (e.g. "Coach Bags ...")
  if (source === 'poshmark') {
    t = t.replace(/^(\w[\w'&. ]{1,20})\s+(Bags|Shoes|Tops|Dresses|Jeans|Jackets|Coats|Pants|Shorts|Skirts|Jewelry|Accessories)\s+/i, '');
  }

  // Normalize whitespace
  t = t.replace(/\s+/g, ' ').trim();

  // Title case if ALL CAPS
  if (t === t.toUpperCase() && t.length > 4) {
    t = t
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Truncate
  if (t.length > 120) {
    t = t.slice(0, 117) + '...';
  }

  return t;
}

// ── Step 2: Validate items ───────────────────────────────────────────

const REJECT_TITLE_PATTERNS = [
  /\blot\s+of\s+\d/i,
  /\bbundle\s+of\s+\d/i,
  /\bwholesale\b/i,
  /\bmystery\s*box\b/i,
  /\bfor\s+parts\b/i,
  /\bparts\s+only\b/i,
];

function validateItem(item) {
  if (!item) return false;
  if (!item.title || item.title.length < 5) return false;
  if (!item.url) return false;
  if (typeof item.price !== 'number' || item.price < 1 || item.price > 10000) return false;

  if (!item.image) return false;
  if (item.image.startsWith('data:')) return false;
  if (item.image.length < 10) return false;

  for (const pat of REJECT_TITLE_PATTERNS) {
    if (pat.test(item.title)) return false;
  }

  return true;
}

// ── Step 3: Deduplicate ──────────────────────────────────────────────

function normalizeForDedup(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlap(a, b) {
  const tokensA = new Set(a.split(' ').filter((w) => w.length >= 2));
  const tokensB = new Set(b.split(' ').filter((w) => w.length >= 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  const minSize = Math.min(tokensA.size, tokensB.size);
  return overlap / minSize;
}

function deduplicateResults(items) {
  if (items.length <= 1) return items;

  const dominated = new Set();

  for (let i = 0; i < items.length; i++) {
    if (dominated.has(i)) continue;
    const a = items[i];
    const normA = normalizeForDedup(a.title);

    for (let j = i + 1; j < items.length; j++) {
      if (dominated.has(j)) continue;
      const b = items[j];

      if (a.source === b.source) continue;

      const normB = normalizeForDedup(b.title);
      const similarity = tokenOverlap(normA, normB);

      if (similarity < 0.7) continue;

      const priceDiff = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
      if (priceDiff > 0.2) continue;

      // Keep the one with better data (lower price wins ties)
      if (a.price <= b.price) {
        dominated.add(j);
      } else {
        dominated.add(i);
        break;
      }
    }
  }

  return items.filter((_, idx) => !dominated.has(idx));
}

// ── Step 4: Rank by quality ──────────────────────────────────────────

const JUNK_SIGNALS = [
  'lot of', 'bundle of', 'wholesale', 'bulk',
  'for parts', 'parts only', 'as is', 'damaged',
  'stained', 'broken', 'defect', 'flaw',
  'mystery box', 'grab bag', 'random',
];

function rankResults(items, query) {
  if (items.length === 0) return items;

  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const priceIQR = prices[Math.floor(prices.length * 0.75)] - prices[Math.floor(prices.length * 0.25)] || medianPrice;

  return items
    .map((item) => {
      const relevance = item._relevanceScore || 0;
      const titleLower = item.title.toLowerCase();

      const hasImage = item.image && !item.image.startsWith('data:') ? 1 : 0;

      const priceDev = Math.abs(item.price - medianPrice) / (priceIQR || 1);
      const priceScore = Math.max(0, 1 - priceDev * 0.3);

      const titleLen = item.title.length;
      const isAllCaps = item.title === item.title.toUpperCase() && titleLen > 4 ? 0 : 1;
      const goodLength = titleLen >= 15 && titleLen <= 100 ? 1 : 0.5;
      const titleScore = (isAllCaps + goodLength) / 2;

      const isJunk = JUNK_SIGNALS.some((s) => titleLower.includes(s)) ? -0.3 : 0;

      const hasDiscount = item.discountPercent && item.discountPercent > 15 ? 0.05 : 0;

      const score =
        relevance * 0.50 +
        hasImage * 0.20 +
        priceScore * 0.10 +
        titleScore * 0.10 +
        isJunk +
        hasDiscount +
        0.05; // base

      return { ...item, _qualityScore: score };
    })
    .sort((a, b) => b._qualityScore - a._qualityScore)
    .map(({ _qualityScore, _relevanceScore, ...item }) => item);
}

// ── Full pipeline ────────────────────────────────────────────────────

function runPipeline(resultsByPlatform, query) {
  const allPlatforms = Object.keys(resultsByPlatform);

  // Step 1 + 2: Clean and validate per-platform
  for (const platform of allPlatforms) {
    resultsByPlatform[platform] = (resultsByPlatform[platform] || [])
      .map((item) => ({
        ...item,
        title: cleanTitle(item.title, item.source || platform),
      }))
      .filter(validateItem);
  }

  return resultsByPlatform;
}

function runGlobalPipeline(resultsByPlatform, query) {
  // Merge all items
  const allItems = [];
  for (const [platform, items] of Object.entries(resultsByPlatform)) {
    for (const item of items) {
      allItems.push({ ...item, source: item.source || platform });
    }
  }

  // Deduplicate across platforms
  const deduped = deduplicateResults(allItems);

  // Rank
  const ranked = rankResults(deduped, query);

  // Split back into per-platform buckets (preserving rank order)
  const output = {};
  for (const platform of Object.keys(resultsByPlatform)) {
    output[platform] = ranked.filter((item) => item.source === platform);
  }

  return output;
}

module.exports = {
  cleanTitle,
  validateItem,
  deduplicateResults,
  rankResults,
  runPipeline,
  runGlobalPipeline,
};
