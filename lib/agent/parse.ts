// ─────────────────────────────────────────────────────────────────────────────
// Feature extraction + lightweight text similarity for the scoring engine.
//
// Naya has no spaCy/Python; query understanding here reuses the same
// deterministic, dictionary-based approach as lib/searchIntent.ts and
// scraper-api/lib/dataIngestion.js. Similarity is keyword/token overlap (the
// spec's stated fallback when vector embeddings aren't available) exposed behind
// a single `textSimilarity()` function so a real embedding model can replace it
// later without touching the scorer.
// ─────────────────────────────────────────────────────────────────────────────

// Brand vocabulary (union of the lists already used across the codebase).
export const BRAND_NAMES: string[] = [
  'nike', 'adidas', 'jordan', 'gucci', 'prada', 'balenciaga', 'louis vuitton',
  'chanel', 'hermes', 'dior', 'versace', 'burberry', 'supreme', 'stussy',
  'carhartt', 'levis', "levi's", 'ralph lauren', 'polo sport', 'polo', 'tommy hilfiger',
  'the north face', 'north face', 'patagonia', 'arcteryx', "arc'teryx", 'yeezy', 'new balance',
  'converse', 'vans', 'reebok', 'asics', 'puma', 'fila', 'champion',
  'gap', 'zara', 'uniqlo', 'aeropostale', 'hollister', 'abercrombie',
  'dickies', 'wrangler', 'starter', 'russell', 'hanes', 'fruit of the loom',
  'fear of god', 'essentials', 'off-white', 'stone island', 'acne studios',
  'comme des garcons', 'cdg', 'bape', 'palace', 'kith', 'rhude', 'amiri',
  'gallery dept', 'represent', 'eric emanuel', 'corteiz', 'chrome hearts',
  'columbia', 'diesel', 'ugg', 'true religion', 'coach', 'l.l.bean',
  'calvin klein', 'banana republic', 'urban outfitters', 'brandy melville',
  'american eagle',
];

// Category -> keyword synonyms. Mirrors dataIngestion's ITEM_TYPES.
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  outerwear: ['jacket', 'coat', 'blazer', 'parka', 'windbreaker', 'anorak', 'bomber', 'outerwear'],
  hoodie: ['hoodie', 'sweatshirt', 'pullover'],
  knitwear: ['crewneck', 'crew neck', 'sweater', 'cardigan', 'knit'],
  tops: ['tee', 't-shirt', 'tshirt', 'shirt', 'top', 'blouse', 'polo'],
  denim: ['jeans', 'denim'],
  pants: ['pants', 'trousers', 'chinos', 'khakis', 'cargos', 'cargo'],
  shorts: ['shorts'],
  shoes: ['shoes', 'sneakers', 'boots', 'sandals', 'loafers', 'trainers'],
  hats: ['hat', 'cap', 'beanie', 'bucket hat', 'snapback', 'fitted'],
  bags: ['bag', 'backpack', 'tote', 'purse', 'satchel'],
  vest: ['vest', 'gilet'],
  dresses: ['dress', 'gown', 'romper', 'jumpsuit'],
  skirts: ['skirt'],
};

const CATEGORY_LOOKUP: Record<string, string> = {};
for (const [cat, words] of Object.entries(CATEGORY_SYNONYMS)) {
  for (const w of words) CATEGORY_LOOKUP[w] = cat;
}

// Which size_profile key governs a given category.
const CATEGORY_TO_SIZE_KEY: Record<string, string> = {
  denim: 'denim',
  pants: 'denim',
  shorts: 'denim',
  shoes: 'shoes',
  outerwear: 'tops',
  hoodie: 'tops',
  knitwear: 'tops',
  tops: 'tops',
  vest: 'tops',
  dresses: 'tops',
  skirts: 'denim',
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'in', 'of', 'to', 'on',
  'size', 'sz', 'new', 'vintage', 'rare', 'nwt', 'euc', 'used', 'mens',
  'womens', 'unisex', 'style', 'fit', 'authentic', 'genuine',
]);

export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function extractBrand(title: string): string | null {
  const lower = normalize(title);
  // Prefer multi-word brands first (longest match wins).
  const sorted = [...BRAND_NAMES].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    if (lower.includes(brand)) return brand.replace("levi's", 'levis');
  }
  return null;
}

export function extractCategory(title: string): string | null {
  const lower = normalize(title);
  // Check multi-word synonyms first.
  const entries = Object.keys(CATEGORY_LOOKUP).sort((a, b) => b.length - a.length);
  for (const word of entries) {
    if (lower.includes(word)) return CATEGORY_LOOKUP[word];
  }
  return null;
}

export function sizeKeyForCategory(category: string | null | undefined): string | null {
  if (!category) return null;
  return CATEGORY_TO_SIZE_KEY[category] || null;
}

const LETTER_SIZES = new Set(['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']);

/** Pull a rough size token from a listing title, or null if none is obvious. */
export function extractSize(title: string): string | null {
  const lower = normalize(title);

  // waist x length, e.g. 32x30 / 32 x 30
  const wl = lower.match(/\b(\d{2})\s?x\s?(\d{2})\b/);
  if (wl) return `${wl[1]}x${wl[2]}`;

  // "size M" / "sz L" / "size 10"
  const explicit = lower.match(/\b(?:size|sz)\s?([a-z]{1,3}|\d{1,2}(?:\.\d)?)\b/);
  if (explicit) return explicit[1];

  // waist like W32 / 32w
  const waist = lower.match(/\bw(\d{2})\b/) || lower.match(/\b(\d{2})w\b/);
  if (waist) return waist[1];

  // standalone letter size token
  for (const tok of lower.split(/\s+/)) {
    if (LETTER_SIZES.has(tok)) return tok;
  }
  return null;
}

/** Normalize a size string for comparison. */
function normSize(size: string): { kind: 'letter' | 'waist' | 'num' | 'unknown'; value: string; waist?: number } {
  const s = normalize(size).replace(/\s/g, '');
  const wl = s.match(/^(\d{2})x(\d{2})$/);
  if (wl) return { kind: 'waist', value: s, waist: Number(wl[1]) };
  const w = s.match(/^w?(\d{2})w?$/);
  if (w) return { kind: 'waist', value: w[1], waist: Number(w[1]) };
  if (LETTER_SIZES.has(s)) return { kind: 'letter', value: s };
  if (/^\d{1,2}(\.\d)?$/.test(s)) return { kind: 'num', value: s };
  return { kind: 'unknown', value: s };
}

/**
 * Returns true only when we can confidently say the listing's size conflicts
 * with the user's size for this category. Conservative by design: unknown or
 * unparseable sizes never gate, so we don't drop good matches.
 */
export function sizeConflicts(
  listingSize: string | null | undefined,
  profileSize: string | null | undefined,
): boolean {
  if (!listingSize || !profileSize) return false;
  const a = normSize(listingSize);
  const b = normSize(profileSize);
  if (a.kind === 'unknown' || b.kind === 'unknown') return false;
  if (a.kind === 'waist' && b.kind === 'waist') {
    if (a.waist === undefined || b.waist === undefined) return false;
    return a.waist !== b.waist;
  }
  if (a.kind === b.kind) return a.value !== b.value;
  // Different size systems (e.g. letter vs numeric): can't compare, don't gate.
  return false;
}

/**
 * Keyword/token overlap similarity in [0,1]. Uses the overlap coefficient
 * (|A∩B| / min(|A|,|B|)) which behaves well when one side (a listing title) is
 * much longer than the other (a short query). This is the embedding stand-in;
 * swap in cosine over real vectors behind this signature later.
 */
export function textSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  for (const t of small) if (large.has(t)) inter += 1;
  return inter / small.size;
}

/** Fraction of `needles` that appear (token or substring) in `haystack`. */
export function keywordCoverage(needles: string[], haystack: string): number {
  const items = needles.map(normalize).filter(Boolean);
  if (items.length === 0) return 0;
  const hay = normalize(haystack);
  const hayTokens = new Set(tokenize(haystack));
  let hit = 0;
  for (const n of items) {
    if (n.includes(' ') ? hay.includes(n) : hayTokens.has(n) || hay.includes(n)) hit += 1;
  }
  return hit / items.length;
}
