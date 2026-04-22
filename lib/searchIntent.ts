export type SearchIntent = {
  raw: string;
  normalized: string;
  tokens: string[];
  /**
   * Text that should be sent to marketplace search.
   * We strip out price constraints and a few operator words so the query stays "clean".
   */
  cleanedQuery: string;
  filters: {
    maxPrice?: number;
    minPrice?: number;
    colors?: string[];
    brands?: string[];
    modelNumbers?: string[];
    tags?: string[];
  };
};

const COLOR_WORDS = [
  'black', 'white', 'grey', 'gray', 'navy', 'blue', 'red', 'green', 'brown', 'tan', 'beige',
  'cream', 'pink', 'purple', 'orange', 'yellow', 'olive', 'khaki',
] as const;

const TAG_WORDS = [
  'y2k', 'vintage', 'washed', 'faded', 'distressed', 'oversized', 'baggy', 'cropped', 'zip', 'zip-up', 'zipup',
  'cable', 'knit', 'workwear', 'streetwear',
] as const;

// Shared + lightweight list (we can expand later or source from a single canonical location)
const BRAND_PHRASES = [
  "ralph lauren",
  "polo sport",
  "the north face",
  "new balance",
  "l.l.bean",
  "arc'teryx",
  "doc martens",
  "true religion",
  "stone island",
  "fear of god",
  "louis vuitton",
  "calvin klein",
  "tommy hilfiger",
  "banana republic",
  "urban outfitters",
  "brandy melville",
  "american eagle",
  "abercrombie",
] as const;

const BRAND_WORDS = [
  'nike', 'adidas', 'jordan', 'carhartt', "levi's", 'levis', 'polo', 'ralph', 'lauren', 'champion',
  'patagonia', 'columbia', 'dickies', 'uniqlo', 'gap', 'zara', 'supreme', 'stussy', 'gucci', 'prada',
  'balenciaga', 'burberry', 'coach', 'diesel', 'ugg', 'asics', 'puma', 'reebok', 'converse', 'vans',
] as const;

function normalizeQuery(raw: string) {
  return raw
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function tokenize(normalized: string) {
  return normalized
    .replace(/[^a-z0-9\s$.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function parsePrice(tokens: string[]) {
  let maxPrice: number | undefined;
  let minPrice: number | undefined;

  // Patterns:
  // - under 50 / under $50
  // - less than 50 / below 50 / under
  // - <$50 / <=50
  // - between 20 and 60
  // - 20-60 (loose)
  const joined = tokens.join(' ');

  const under =
    joined.match(/\b(under|below|lt|less)\s+(?:than\s+)?\$?(\d{1,4})\b/) ||
    joined.match(/\b<=\s*\$?(\d{1,4})\b/) ||
    joined.match(/\b<\s*\$?(\d{1,4})\b/);
  if (under) maxPrice = Number(under[2] ?? under[1]);

  const over =
    joined.match(/\b(over|above|gt|more)\s+(?:than\s+)?\$?(\d{1,4})\b/) ||
    joined.match(/\b>=\s*\$?(\d{1,4})\b/) ||
    joined.match(/\b>\s*\$?(\d{1,4})\b/);
  if (over) minPrice = Number(over[2] ?? over[1]);

  const between = joined.match(/\bbetween\s+\$?(\d{1,4})\s+(?:and|to)\s+\$?(\d{1,4})\b/);
  if (between) {
    minPrice = Number(between[1]);
    maxPrice = Number(between[2]);
  }

  const range = joined.match(/\b\$?(\d{1,4})\s*-\s*\$?(\d{1,4})\b/);
  if (range) {
    minPrice = Number(range[1]);
    maxPrice = Number(range[2]);
  }

  if (maxPrice !== undefined && Number.isNaN(maxPrice)) maxPrice = undefined;
  if (minPrice !== undefined && Number.isNaN(minPrice)) minPrice = undefined;
  if (maxPrice !== undefined && maxPrice <= 0) maxPrice = undefined;
  if (minPrice !== undefined && minPrice <= 0) minPrice = undefined;

  return { maxPrice, minPrice };
}

function parseModelNumbers(tokens: string[]) {
  // e.g. 569, 550, 501, 2002r, 990v3
  const models: string[] = [];
  for (const t of tokens) {
    if (/^\d{3,4}$/.test(t)) models.push(t);
    else if (/^\d{3,4}[a-z]\d?$/.test(t)) models.push(t);
    else if (/^\d{3,4}v\d$/.test(t)) models.push(t);
    else if (/^\d{3,4}[a-z]{1,3}$/.test(t)) models.push(t);
  }
  return uniq(models);
}

function parseBrands(normalized: string, tokens: string[]) {
  const brands: string[] = [];

  for (const phrase of BRAND_PHRASES) {
    if (normalized.includes(phrase)) brands.push(phrase);
  }

  for (const t of tokens) {
    if ((BRAND_WORDS as readonly string[]).includes(t)) brands.push(t);
  }

  // Normalize common variants
  return uniq(brands.map((b) => b.replace("levi's", 'levis')));
}

function parseColors(tokens: string[]) {
  const colors = tokens.filter((t) => (COLOR_WORDS as readonly string[]).includes(t === 'gray' ? 'grey' : t));
  return uniq(colors.map((c) => (c === 'gray' ? 'grey' : c)));
}

function parseTags(tokens: string[]) {
  const tags = tokens.filter((t) => (TAG_WORDS as readonly string[]).includes(t));
  return uniq(tags);
}

function buildCleanedQuery(tokens: string[], intent: { maxPrice?: number; minPrice?: number }) {
  const drop = new Set([
    'under', 'below', 'lt', 'less', 'than',
    'over', 'above', 'gt', 'more',
    'between', 'and', 'to',
    '<', '>', '<=', '>=',
    'cheap',
  ]);

  const cleaned = tokens.filter((t) => {
    if (drop.has(t)) return false;
    if (/^\$?\d{1,4}$/.test(t) && (intent.maxPrice !== undefined || intent.minPrice !== undefined)) return false;
    if (/^\d{1,4}-\d{1,4}$/.test(t)) return false;
    return true;
  });

  return cleaned.join(' ').trim();
}

export function parseSearchIntent(raw: string): SearchIntent {
  const normalized = normalizeQuery(raw);
  const tokens = tokenize(normalized);
  const { maxPrice, minPrice } = parsePrice(tokens);
  const colors = parseColors(tokens);
  const brands = parseBrands(normalized, tokens);
  const modelNumbers = parseModelNumbers(tokens);
  const tags = parseTags(tokens);

  const cleanedQuery = buildCleanedQuery(tokens, { maxPrice, minPrice });

  return {
    raw,
    normalized,
    tokens,
    cleanedQuery: cleanedQuery || normalized,
    filters: {
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(colors.length ? { colors } : {}),
      ...(brands.length ? { brands } : {}),
      ...(modelNumbers.length ? { modelNumbers } : {}),
      ...(tags.length ? { tags } : {}),
    },
  };
}

