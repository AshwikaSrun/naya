import {
  normalizeText,
  tokenizeText,
  uniq,
  detectBrands,
  detectCategories,
  detectColors,
  detectMaterials,
  detectEra,
  detectFits,
  detectGender,
  detectStyleTags,
  detectSizes,
  detectCondition,
  detectExclusions,
  FILLER_WORDS,
} from './vocab';

/**
 * Instant, deterministic query understanding.
 *
 * Runs synchronously on every keystroke/search with zero latency and zero
 * network — so search works even when the LLM route (app/api/parse-intent) is
 * down or unconfigured. It extracts as much structured intent as possible from
 * the raw query using the shared fashion vocabulary in lib/vocab.
 */
export type SearchIntent = {
  raw: string;
  normalized: string;
  tokens: string[];
  /**
   * Text that should be sent to marketplace search. Price constraints, filler
   * words, and negated terms are stripped so the query stays high-signal.
   */
  cleanedQuery: string;
  filters: {
    maxPrice?: number;
    minPrice?: number;
    colors?: string[];
    brands?: string[];
    modelNumbers?: string[];
    /** Soft style/fit tags (kept as `tags` for backwards-compatibility). */
    tags?: string[];
    categories?: string[];
    materials?: string[];
    era?: string;
    fits?: string[];
    gender?: 'mens' | 'womens' | 'unisex' | 'kids';
    sizes?: string[];
    condition?: 'new' | 'used';
    /** Attributes the shopper explicitly does NOT want. */
    exclude?: string[];
  };
};

function parsePrice(joined: string) {
  let maxPrice: number | undefined;
  let minPrice: number | undefined;

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

  const range = joined.match(/\$?(\d{1,4})\s*-\s*\$?(\d{1,4})\b/);
  if (range) {
    minPrice = Number(range[1]);
    maxPrice = Number(range[2]);
  }

  // "cheap" / "affordable" implies a soft budget cap when no explicit one given.
  if (maxPrice === undefined && /\b(cheap|affordable|budget)\b/.test(joined)) {
    maxPrice = 60;
  }

  const clean = (n: number | undefined) =>
    n !== undefined && (Number.isNaN(n) || n <= 0) ? undefined : n;
  return { maxPrice: clean(maxPrice), minPrice: clean(minPrice) };
}

function parseModelNumbers(tokens: string[]) {
  const models: string[] = [];
  for (const t of tokens) {
    if (/^\d{3,4}$/.test(t)) models.push(t);
    else if (/^\d{3,4}[a-z]\d?$/.test(t)) models.push(t);
    else if (/^\d{3,4}v\d$/.test(t)) models.push(t);
    else if (/^\d{3,4}[a-z]{1,3}$/.test(t)) models.push(t);
  }
  return uniq(models);
}

function buildCleanedQuery(
  tokens: string[],
  opts: { hasPrice: boolean; exclude: string[]; sizes: string[] }
): string {
  const priceOps = new Set([
    'under', 'below', 'lt', 'less', 'than', 'over', 'above', 'gt', 'more',
    'between', 'and', 'to', '<', '>', '<=', '>=', 'cheap', 'affordable', 'budget',
  ]);
  const negationOps = new Set(['no', 'not', 'without', 'non', 'anti', 'minus', 'except', 'excluding']);
  const excludeSet = new Set(opts.exclude.map((e) => e.toLowerCase()));
  const sizeSet = new Set(opts.sizes.map((s) => s.toLowerCase()));

  let skipNext = false;
  const cleaned = tokens.filter((t) => {
    if (skipNext) {
      // Drop the word right after a negation operator (the excluded attribute).
      skipNext = false;
      if (excludeSet.has(t)) return false;
    }
    if (negationOps.has(t)) {
      skipNext = true;
      return false;
    }
    if (priceOps.has(t)) return false;
    if (FILLER_WORDS.has(t)) return false;
    if (excludeSet.has(t)) return false;
    if (sizeSet.has(t)) return false;
    if (/^\$?\d{1,4}$/.test(t) && opts.hasPrice) return false;
    if (/^\d{1,4}-\d{1,4}$/.test(t)) return false;
    return true;
  });

  return cleaned.join(' ').trim();
}

export function parseSearchIntent(raw: string): SearchIntent {
  const normalized = normalizeText(raw);
  const tokens = tokenizeText(normalized);
  const joined = tokens.join(' ');

  const { maxPrice, minPrice } = parsePrice(joined);
  const colors = detectColors(normalized);
  const brands = detectBrands(normalized);
  const modelNumbers = parseModelNumbers(tokens);
  const categories = detectCategories(normalized);
  const materials = detectMaterials(tokens, normalized);
  const era = detectEra(normalized);
  const gender = detectGender(normalized);
  const sizes = detectSizes(tokens, normalized);
  const condition = detectCondition(normalized);
  const exclude = detectExclusions(normalized);

  // Excluded attributes must not double as positive signals ("not distressed"
  // shouldn't also be a desired fit). Drop any detected attribute the shopper
  // negated.
  const excludeSet = new Set(exclude.map((e) => e.toLowerCase()));
  const notExcluded = (list: string[]) =>
    list.filter((v) => !v.toLowerCase().split(/\s+/).some((w) => excludeSet.has(w)));

  const fits = notExcluded(detectFits(normalized));
  const styleTags = notExcluded(detectStyleTags(normalized));
  const filteredMaterials = notExcluded(materials);
  const filteredColors = notExcluded(colors);

  // Fits + style tags together form the soft "tags" list (back-compat name).
  const tags = uniq([...fits, ...styleTags]);

  const cleanedQuery = buildCleanedQuery(tokens, {
    hasPrice: maxPrice !== undefined || minPrice !== undefined,
    exclude,
    sizes,
  });

  return {
    raw,
    normalized,
    tokens,
    cleanedQuery: cleanedQuery || normalized,
    filters: {
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(filteredColors.length ? { colors: filteredColors } : {}),
      ...(brands.length ? { brands } : {}),
      ...(modelNumbers.length ? { modelNumbers } : {}),
      ...(tags.length ? { tags } : {}),
      ...(categories.length ? { categories } : {}),
      ...(filteredMaterials.length ? { materials: filteredMaterials } : {}),
      ...(era ? { era } : {}),
      ...(fits.length ? { fits } : {}),
      ...(gender ? { gender } : {}),
      ...(sizes.length ? { sizes } : {}),
      ...(condition ? { condition } : {}),
      ...(exclude.length ? { exclude } : {}),
    },
  };
}
