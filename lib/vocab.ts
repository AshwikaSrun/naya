/**
 * Shared fashion vocabulary + lightweight detectors for naya's NLP search.
 *
 * This is the single canonical source of domain knowledge (brands, garment
 * categories, colors, materials, eras, fits, gender, style tags) used by:
 *   - lib/searchIntent.ts   (instant, deterministic query parsing)
 *   - lib/rankProducts.ts   (synonym-aware re-ranking / category-conflict)
 *   - app/api/parse-intent  (reference vocabulary for the Gemini prompt)
 *
 * Framework-free and dependency-free so it runs on both the client and the
 * server edge/serverless runtimes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Text helpers
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeText(raw: string): string {
  return raw
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function tokenizeText(normalized: string): string[] {
  return normalized
    .replace(/[^a-z0-9\s$.'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ─────────────────────────────────────────────────────────────────────────────
// Brands (canonical name → recognized aliases/spellings)
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND_ALIASES: Record<string, string[]> = {
  nike: ['nike'],
  jordan: ['jordan', 'air jordan', 'jumpman'],
  adidas: ['adidas'],
  'new balance': ['new balance', 'nb'],
  puma: ['puma'],
  reebok: ['reebok'],
  asics: ['asics'],
  converse: ['converse', 'chuck taylor', 'chucks'],
  vans: ['vans'],
  'salomon': ['salomon'],
  carhartt: ['carhartt', 'carhartt wip'],
  dickies: ['dickies'],
  levis: ["levi's", 'levis', 'levi'],
  wrangler: ['wrangler'],
  'ralph lauren': ['ralph lauren', 'polo ralph lauren', 'polo sport', 'rrl'],
  'tommy hilfiger': ['tommy hilfiger', 'tommy'],
  'calvin klein': ['calvin klein', 'ck'],
  nautica: ['nautica'],
  champion: ['champion'],
  'the north face': ['the north face', 'north face', 'tnf'],
  patagonia: ['patagonia', 'patagucci'],
  columbia: ['columbia'],
  'l.l.bean': ['l.l.bean', 'll bean', 'llbean'],
  "arc'teryx": ["arc'teryx", 'arcteryx', 'arc teryx'],
  'stone island': ['stone island', 'stoney'],
  'stussy': ['stussy', 'stüssy'],
  supreme: ['supreme'],
  'fear of god': ['fear of god', 'fog', 'essentials'],
  'true religion': ['true religion'],
  diesel: ['diesel'],
  'ed hardy': ['ed hardy'],
  affliction: ['affliction'],
  'brandy melville': ['brandy melville', 'brandy'],
  'urban outfitters': ['urban outfitters', 'uo'],
  'american eagle': ['american eagle', 'ae', 'aeo'],
  abercrombie: ['abercrombie', 'abercrombie & fitch', 'a&f', 'anf'],
  'hollister': ['hollister'],
  'banana republic': ['banana republic'],
  gap: ['gap'],
  uniqlo: ['uniqlo'],
  zara: ['zara'],
  'h&m': ['h&m', 'hm'],
  'cos': ['cos'],
  'aritzia': ['aritzia', 'wilfred', 'tna'],
  'lululemon': ['lululemon', 'lulu'],
  'free people': ['free people'],
  'reformation': ['reformation', 'ref'],
  'realisation par': ['realisation par', 'realisation'],
  'isabel marant': ['isabel marant', 'marant', 'etoile'],
  'acne studios': ['acne studios', 'acne'],
  'ganni': ['ganni'],
  'dr. martens': ['dr. martens', 'dr martens', 'doc martens', 'docs', 'doc marten'],
  ugg: ['ugg', 'uggs'],
  birkenstock: ['birkenstock', 'birkenstocks', 'birks'],
  gucci: ['gucci'],
  prada: ['prada', 'miu miu'],
  balenciaga: ['balenciaga'],
  burberry: ['burberry'],
  coach: ['coach'],
  'louis vuitton': ['louis vuitton', 'lv'],
  'saint laurent': ['saint laurent', 'ysl', 'yves saint laurent'],
  bottega: ['bottega veneta', 'bottega'],
  'maison margiela': ['maison margiela', 'margiela', 'mm6'],
  'comme des garcons': ['comme des garcons', 'comme des garçons', 'cdg'],
  'kapital': ['kapital'],
  'needles': ['needles'],
  'kenzo': ['kenzo'],
  'bape': ['bape', 'a bathing ape'],
  'chrome hearts': ['chrome hearts'],
};

// Longest phrases first so "north face" wins before "face" style partials.
const BRAND_ENTRIES: Array<{ canonical: string; alias: string }> = Object.entries(BRAND_ALIASES)
  .flatMap(([canonical, aliases]) => aliases.map((alias) => ({ canonical, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function detectBrands(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, alias } of BRAND_ENTRIES) {
    // Word-boundary-ish match to avoid matching inside larger words.
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(alias)}(?:$|[^a-z0-9])`);
    if (re.test(normalized)) found.push(canonical);
  }
  return uniq(found);
}

// ─────────────────────────────────────────────────────────────────────────────
// Garment categories (canonical → synonyms) grouped into "slots" so we can
// detect when a listing is a fundamentally different type of item than asked.
// ─────────────────────────────────────────────────────────────────────────────

export type CategorySlot = 'top' | 'bottom' | 'outerwear' | 'dress' | 'footwear' | 'accessory' | 'bag';

type CategoryDef = { canonical: string; slot: CategorySlot; synonyms: string[] };

export const CATEGORY_DEFS: CategoryDef[] = [
  // Tops
  { canonical: 'tee', slot: 'top', synonyms: ['tee', 't-shirt', 'tshirt', 't shirt', 'tees'] },
  { canonical: 'shirt', slot: 'top', synonyms: ['shirt', 'button up', 'button-up', 'oxford', 'flannel', 'blouse'] },
  { canonical: 'polo', slot: 'top', synonyms: ['polo shirt', 'polo top'] },
  { canonical: 'sweater', slot: 'top', synonyms: ['sweater', 'jumper', 'knit', 'knitwear', 'pullover', 'cardigan', 'sweatervest', 'sweater vest'] },
  { canonical: 'hoodie', slot: 'top', synonyms: ['hoodie', 'hooded sweatshirt', 'hoody'] },
  { canonical: 'sweatshirt', slot: 'top', synonyms: ['sweatshirt', 'crewneck', 'crew neck'] },
  { canonical: 'tank', slot: 'top', synonyms: ['tank', 'tank top', 'cami', 'camisole'] },
  { canonical: 'jersey', slot: 'top', synonyms: ['jersey'] },
  // Bottoms
  { canonical: 'jeans', slot: 'bottom', synonyms: ['jeans', 'denim pants', 'denims'] },
  { canonical: 'pants', slot: 'bottom', synonyms: ['pants', 'trousers', 'slacks', 'chinos', 'khakis'] },
  { canonical: 'cargos', slot: 'bottom', synonyms: ['cargos', 'cargo pants', 'cargo'] },
  { canonical: 'sweatpants', slot: 'bottom', synonyms: ['sweatpants', 'joggers', 'track pants', 'trackpants'] },
  { canonical: 'shorts', slot: 'bottom', synonyms: ['shorts', 'jorts'] },
  { canonical: 'skirt', slot: 'bottom', synonyms: ['skirt', 'mini skirt', 'midi skirt', 'maxi skirt'] },
  { canonical: 'leggings', slot: 'bottom', synonyms: ['leggings', 'yoga pants'] },
  // Outerwear
  { canonical: 'jacket', slot: 'outerwear', synonyms: ['jacket', 'bomber', 'windbreaker', 'harrington', 'varsity', 'denim jacket', 'trucker jacket'] },
  { canonical: 'coat', slot: 'outerwear', synonyms: ['coat', 'overcoat', 'trench', 'peacoat', 'topcoat'] },
  { canonical: 'parka', slot: 'outerwear', synonyms: ['parka', 'puffer', 'puffa', 'down jacket', 'anorak'] },
  { canonical: 'fleece', slot: 'outerwear', synonyms: ['fleece', 'fleece jacket'] },
  { canonical: 'vest', slot: 'outerwear', synonyms: ['vest', 'gilet', 'puffer vest'] },
  { canonical: 'blazer', slot: 'outerwear', synonyms: ['blazer', 'sport coat', 'suit jacket'] },
  // Dresses / one-piece
  { canonical: 'dress', slot: 'dress', synonyms: ['dress', 'sundress', 'maxi dress', 'midi dress', 'mini dress', 'slip dress'] },
  { canonical: 'jumpsuit', slot: 'dress', synonyms: ['jumpsuit', 'romper', 'overalls', 'dungarees'] },
  // Footwear
  { canonical: 'sneakers', slot: 'footwear', synonyms: ['sneakers', 'trainers', 'kicks', 'runners', 'running shoes'] },
  { canonical: 'boots', slot: 'footwear', synonyms: ['boots', 'boot', 'chelsea boots', 'combat boots'] },
  { canonical: 'loafers', slot: 'footwear', synonyms: ['loafers', 'loafer', 'mocassins', 'moccasins'] },
  { canonical: 'heels', slot: 'footwear', synonyms: ['heels', 'pumps', 'stilettos'] },
  { canonical: 'sandals', slot: 'footwear', synonyms: ['sandals', 'flip flops', 'slides'] },
  { canonical: 'flats', slot: 'footwear', synonyms: ['flats', 'ballet flats', 'mary janes'] },
  // Bags
  { canonical: 'bag', slot: 'bag', synonyms: ['bag', 'handbag', 'purse', 'tote', 'shoulder bag', 'crossbody', 'backpack', 'satchel', 'clutch'] },
  // Accessories
  { canonical: 'hat', slot: 'accessory', synonyms: ['hat', 'cap', 'beanie', 'bucket hat', 'trucker hat', 'snapback'] },
  { canonical: 'belt', slot: 'accessory', synonyms: ['belt'] },
  { canonical: 'scarf', slot: 'accessory', synonyms: ['scarf', 'shawl'] },
  { canonical: 'sunglasses', slot: 'accessory', synonyms: ['sunglasses', 'shades', 'sunnies'] },
  { canonical: 'watch', slot: 'accessory', synonyms: ['watch'] },
  { canonical: 'jewelry', slot: 'accessory', synonyms: ['jewelry', 'necklace', 'bracelet', 'ring', 'earrings'] },
];

const CATEGORY_ENTRIES: Array<{ canonical: string; slot: CategorySlot; synonym: string }> = CATEGORY_DEFS
  .flatMap((d) => d.synonyms.map((synonym) => ({ canonical: d.canonical, slot: d.slot, synonym })))
  .sort((a, b) => b.synonym.length - a.synonym.length);

const SLOT_BY_CANONICAL: Record<string, CategorySlot> = Object.fromEntries(
  CATEGORY_DEFS.map((d) => [d.canonical, d.slot])
);

/** All synonyms for a canonical category, for synonym-aware matching. */
export function categorySynonyms(canonical: string): string[] {
  const def = CATEGORY_DEFS.find((d) => d.canonical === canonical);
  return def ? def.synonyms : [canonical];
}

export function slotForCategory(canonical: string): CategorySlot | undefined {
  return SLOT_BY_CANONICAL[canonical];
}

/** Detect canonical garment categories present in text. */
export function detectCategories(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, synonym } of CATEGORY_ENTRIES) {
    if (matchesPhrase(normalized, synonym)) found.push(canonical);
  }
  return uniq(found);
}

/** Detect which slots a listing title belongs to (for conflict penalties). */
export function detectSlots(normalized: string): CategorySlot[] {
  const slots: CategorySlot[] = [];
  for (const { slot, synonym } of CATEGORY_ENTRIES) {
    if (matchesPhrase(normalized, synonym)) slots.push(slot);
  }
  return uniq(slots);
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors, materials, eras, fits, gender, style/vibe
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_ALIASES: Record<string, string[]> = {
  black: ['black', 'noir'],
  white: ['white', 'ivory', 'off-white', 'off white'],
  grey: ['grey', 'gray', 'charcoal', 'heather grey', 'heather gray'],
  navy: ['navy', 'midnight'],
  blue: ['blue', 'cobalt', 'royal blue', 'baby blue', 'light blue'],
  red: ['red', 'burgundy', 'maroon', 'crimson', 'wine'],
  green: ['green', 'forest green', 'hunter green', 'sage', 'mint'],
  olive: ['olive', 'army green'],
  khaki: ['khaki'],
  brown: ['brown', 'chocolate', 'espresso', 'mocha'],
  tan: ['tan', 'camel'],
  beige: ['beige', 'nude', 'sand', 'stone'],
  cream: ['cream', 'ecru'],
  pink: ['pink', 'blush', 'rose', 'fuchsia', 'hot pink'],
  purple: ['purple', 'lavender', 'lilac', 'plum'],
  orange: ['orange', 'rust', 'terracotta'],
  yellow: ['yellow', 'mustard', 'gold'],
  silver: ['silver', 'metallic'],
};

const COLOR_ENTRIES = Object.entries(COLOR_ALIASES)
  .flatMap(([canonical, aliases]) => aliases.map((alias) => ({ canonical, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function detectColors(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, alias } of COLOR_ENTRIES) {
    if (matchesPhrase(normalized, alias)) found.push(canonical);
  }
  return uniq(found);
}

export const MATERIAL_WORDS = [
  'leather', 'suede', 'denim', 'wool', 'cashmere', 'corduroy', 'cord', 'fleece',
  'nylon', 'cotton', 'silk', 'linen', 'velvet', 'satin', 'sherpa', 'shearling',
  'gore-tex', 'goretex', 'flannel', 'tweed', 'mohair', 'canvas',
] as const;

export function detectMaterials(tokens: string[], normalized: string): string[] {
  const found: string[] = [];
  for (const m of MATERIAL_WORDS) {
    if (m.includes('-') || m.includes(' ')) {
      if (normalized.includes(m)) found.push(m === 'cord' ? 'corduroy' : m);
    } else if (tokens.includes(m)) {
      found.push(m === 'cord' ? 'corduroy' : m);
    }
  }
  return uniq(found);
}

/** Normalize any decade/era phrasing to a canonical tag like "90s" / "y2k". */
export function detectEra(normalized: string): string | undefined {
  if (/\by2k\b/.test(normalized)) return 'y2k';
  if (/\bnineties\b/.test(normalized)) return '90s';
  if (/\beighties\b/.test(normalized)) return '80s';
  if (/\bseventies\b/.test(normalized)) return '70s';
  if (/\bsixties\b/.test(normalized)) return '60s';
  // 1900s decades: 60s–90s, optionally prefixed by "19", with optional apostrophe.
  const oldDecade = normalized.match(/\b(?:19)?([6-9])0'?s\b/);
  if (oldDecade) return `${oldDecade[1]}0s`;
  // 2000s decades: 2000s / 00s / 2010s / 10s / 2020s / 20s.
  const newDecade = normalized.match(/\b(?:20)?([0-2])0'?s\b/);
  if (newDecade) return `20${newDecade[1]}0s`;
  return undefined;
}

export const FIT_ALIASES: Record<string, string[]> = {
  oversized: ['oversized', 'oversize', 'boxy'],
  baggy: ['baggy', 'loose', 'relaxed', 'wide leg', 'wide-leg'],
  slim: ['slim', 'slim fit', 'skinny', 'fitted', 'tailored'],
  cropped: ['cropped', 'crop'],
  straight: ['straight leg', 'straight-leg', 'straight fit'],
  distressed: ['distressed', 'destroyed', 'ripped', 'thrashed'],
  faded: ['faded', 'washed', 'sun faded'],
};

const FIT_ENTRIES = Object.entries(FIT_ALIASES)
  .flatMap(([canonical, aliases]) => aliases.map((alias) => ({ canonical, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function detectFits(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, alias } of FIT_ENTRIES) {
    if (matchesPhrase(normalized, alias)) found.push(canonical);
  }
  return uniq(found);
}

export function detectGender(normalized: string): 'mens' | 'womens' | 'unisex' | 'kids' | undefined {
  if (/\b(women'?s|womens|woman|ladies|female)\b/.test(normalized)) return 'womens';
  if (/\b(men'?s|mens|man|male)\b/.test(normalized)) return 'mens';
  if (/\b(kids?|childrens?|youth|toddler)\b/.test(normalized)) return 'kids';
  if (/\bunisex\b/.test(normalized)) return 'unisex';
  return undefined;
}

export const STYLE_TAGS: Record<string, string[]> = {
  streetwear: ['streetwear', 'street style'],
  workwear: ['workwear'],
  gorpcore: ['gorpcore', 'gorp'],
  blokecore: ['blokecore'],
  y2k: ['y2k'],
  grunge: ['grunge'],
  preppy: ['preppy', 'prep', 'ivy', 'old money', 'quiet luxury'],
  minimalist: ['minimalist', 'minimal', 'clean'],
  coastal: ['coastal', 'coastal grandmother', 'coquette'],
  skater: ['skater', 'skate'],
  cottagecore: ['cottagecore'],
  boho: ['boho', 'bohemian'],
  athleisure: ['athleisure', 'gym', 'activewear'],
  goth: ['goth', 'gothic', 'grungy'],
};

const STYLE_ENTRIES = Object.entries(STYLE_TAGS)
  .flatMap(([canonical, aliases]) => aliases.map((alias) => ({ canonical, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function detectStyleTags(normalized: string): string[] {
  const found: string[] = [];
  for (const { canonical, alias } of STYLE_ENTRIES) {
    if (matchesPhrase(normalized, alias)) found.push(canonical);
  }
  return uniq(found);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes & condition
// ─────────────────────────────────────────────────────────────────────────────

const LETTER_SIZES = new Set(['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl']);

export function detectSizes(tokens: string[], normalized: string): string[] {
  const sizes: string[] = [];
  for (const t of tokens) {
    if (LETTER_SIZES.has(t)) sizes.push(t.toUpperCase());
  }
  // "size 10", "size m", "waist 32", "32x30", shoe "us 10"
  const sizeWord = normalized.match(/\bsize\s+([a-z0-9]{1,4})\b/);
  if (sizeWord) sizes.push(sizeWord[1].toUpperCase());
  const waist = normalized.match(/\bwaist\s+(\d{2})\b/) || normalized.match(/\b(\d{2})\s*x\s*\d{2}\b/);
  if (waist) sizes.push(waist[1]);
  return uniq(sizes);
}

export function detectCondition(normalized: string): 'new' | 'used' | undefined {
  if (/\b(nwt|new with tags|brand new|deadstock|bnwt|unworn)\b/.test(normalized)) return 'new';
  if (/\b(used|worn|pre-owned|preowned|thrifted|second hand|secondhand)\b/.test(normalized)) return 'used';
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Negation / exclusions ("no logo", "not distressed", "without holes")
// ─────────────────────────────────────────────────────────────────────────────

export function detectExclusions(normalized: string): string[] {
  const excludes: string[] = [];
  const re = /\b(?:no|not|without|non|anti|minus|except|excluding)\s+([a-z][a-z-]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const word = m[1];
    // Skip stray grammar words that follow "not"/"no" but aren't attributes.
    if (['the', 'too', 'that', 'sure', 'really', 'very', 'and'].includes(word)) continue;
    excludes.push(word);
  }
  return uniq(excludes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Filler words to strip from the marketplace query
// ─────────────────────────────────────────────────────────────────────────────

export const FILLER_WORDS = new Set([
  'looking', 'for', 'find', 'me', 'some', 'something', 'a', 'an', 'the', 'i', 'want',
  'need', 'show', 'get', 'please', 'any', 'good', 'nice', 'cool', 'really', 'kinda',
  'sort', 'of', 'like', 'similar', 'to', 'style', 'vibe', 'vibes', 'aesthetic',
  'that', 'is', 'are', 'with', 'in', 'my', 'size', 'cheap', 'affordable', 'budget',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Internal utilities
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-phrase match with soft boundaries (handles multi-word phrases). */
function matchesPhrase(normalized: string, phrase: string): boolean {
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(phrase)}(?:$|[^a-z0-9])`);
  return re.test(normalized);
}
