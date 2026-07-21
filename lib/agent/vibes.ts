/**
 * Vibe / aesthetic taste layer for the shopping agent.
 *
 * Style tags from onboarding (cottagecore, gorpcore, …) rarely appear literally
 * in marketplace titles. This module maps each vibe to:
 *   - marketplace search queries (what we actually scrape)
 *   - title proxies (floral, prairie, linen…) used when scoring + inferring
 *     taste from saves
 */

import { STYLE_TAGS, detectStyleTags, normalizeText, uniq } from '@/lib/vocab';

/** Marketplace queries that surface each vibe even when the tag word is absent. */
export const VIBE_SEARCH_QUERIES: Record<string, string[]> = {
  cottagecore: ['floral prairie dress', 'linen puff sleeve blouse', 'eyelet milkmaid dress'],
  coastal: ['linen coastal set', 'striped boatneck sweater', 'white cotton sundress'],
  boho: ['boho floral maxi dress', 'crochet top bohemian', 'embroidered peasant blouse'],
  preppy: ['polo ralph lauren sweater', 'cable knit tennis sweater', 'oxford button down'],
  minimalist: ['minimalist black blazer', 'clean white button up', 'tailored trousers'],
  workwear: ['carhartt detroit jacket', 'dickies work pants', 'canvas chore coat'],
  streetwear: ['oversized graphic hoodie', 'baggy cargo pants streetwear', 'boxy tee streetwear'],
  gorpcore: ['patagonia fleece pullover', 'salomon trail sneakers', 'the north face fleece'],
  blokecore: ['football jersey vintage', 'adidas track jacket', 'scarves football casual'],
  y2k: ['y2k low rise jeans', 'butterfly top 2000s', 'rhinestone baby tee'],
  grunge: ['flannel shirt vintage', 'distressed band tee', 'ripped black jeans'],
  skater: ['baggy skate jeans', 'skate hoodie oversized', 'vans old skool'],
  athleisure: ['lululemon leggings', 'nike tech fleece', 'yoga set matching'],
  goth: ['black lace top gothic', 'platform boots gothic', 'velvet black dress'],
};

/** Extra title proxies beyond STYLE_TAGS aliases — for scoring + save inference. */
export const VIBE_TITLE_PROXIES: Record<string, string[]> = {
  cottagecore: [
    'cottagecore', 'cottage core', 'prairie', 'milkmaid', 'eyelet', 'puff sleeve',
    'babydoll', 'floral midi', 'floral maxi', 'linen dress', 'smocked', 'ruffle dress',
  ],
  coastal: [
    'coastal', 'linen set', 'boatneck', 'nautical', 'striped sweater', 'coverup',
    'sundress', 'resort wear', 'beach linen',
  ],
  boho: [
    'boho', 'bohemian', 'crochet', 'peasant blouse', 'embroidered', 'fringe',
    'maxi skirt', 'kimono', 'festival',
  ],
  preppy: [
    'preppy', 'cable knit', 'tennis sweater', 'oxford', 'country club', 'ivy',
    'argyle', 'crest', 'old money', 'quiet luxury',
  ],
  minimalist: [
    'minimalist', 'clean fit', 'tailored', 'capsule', 'sleek', 'simple black',
  ],
  workwear: [
    'workwear', 'chore coat', 'detroit jacket', 'double knee', 'carpenter',
    'utility', 'canvas jacket',
  ],
  streetwear: [
    'streetwear', 'boxy tee', 'graphic hoodie', 'baggy cargo', 'drip',
  ],
  gorpcore: [
    'gorpcore', 'fleece pullover', 'trail', 'hiking', 'softshell', 'outdoor',
  ],
  blokecore: [
    'blokecore', 'football jersey', 'soccer jersey', 'track jacket', 'scarf casual',
  ],
  y2k: [
    'y2k', '2000s', 'low rise', 'baby tee', 'butterfly', 'rhinestone', 'velour',
  ],
  grunge: [
    'grunge', 'flannel', 'band tee', 'distressed', 'thrashed', 'plaid shirt',
  ],
  skater: [
    'skater', 'skate', 'baggy jeans', 'board short', 'old skool',
  ],
  athleisure: [
    'athleisure', 'leggings', 'yoga', 'tech fleece', 'matching set', 'activewear',
  ],
  goth: [
    'goth', 'gothic', 'lace black', 'velvet black', 'platform', 'corset',
  ],
};

/** All searchable terms for a vibe (aliases + proxies). */
export function vibeTerms(vibe: string): string[] {
  const key = vibe.toLowerCase().trim();
  const aliases = STYLE_TAGS[key] ?? [key];
  const proxies = VIBE_TITLE_PROXIES[key] ?? [];
  return uniq([...aliases, ...proxies].map((t) => t.toLowerCase()));
}

/** Infer vibe tags from a listing title (for saves → taste profile). */
export function inferVibesFromTitle(title: string | null | undefined): string[] {
  if (!title) return [];
  const normalized = normalizeText(title);
  const fromDict = detectStyleTags(normalized);
  const fromProxies: string[] = [];
  for (const [vibe, terms] of Object.entries(VIBE_TITLE_PROXIES)) {
    if (fromDict.includes(vibe) || fromProxies.includes(vibe)) continue;
    if (terms.some((t) => normalized.includes(t))) fromProxies.push(vibe);
  }
  return uniq([...fromDict, ...fromProxies]).slice(0, 4);
}

/** Build watch queries for the user's style tags (up to one primary query each). */
export function vibeWatchQueries(styleTags: string[], max = 4): string[] {
  const out: string[] = [];
  for (const tag of styleTags) {
    if (out.length >= max) break;
    const key = tag.toLowerCase().trim();
    const queries = VIBE_SEARCH_QUERIES[key];
    if (queries?.length) out.push(queries[0]);
    else if (key) out.push(key);
  }
  return out;
}

export { STYLE_TAGS };
