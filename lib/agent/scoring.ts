// ─────────────────────────────────────────────────────────────────────────────
// Rule-based personalized scoring engine.
//
//   score_listing(listing, user_profile, saved_searches) -> (score, reason)
//
// Deliberately NOT an LLM call per listing (see MVP non-goals): it's a weighted
// sum of cheap deterministic signals plus keyword-overlap similarity, so it runs
// in microseconds and scales to every incoming scrape result.
//
// Base weights (from the spec):
//   brand 25% · category 15% · price 15% · style/era 25% · saved-search 20%
//   size    -> hard gate (mismatch => score 0), not a weight
//
// Only components the user actually has data for are counted; their weights are
// renormalized to sum to 1 so a cold-start profile (e.g. brands only) can still
// reach the delivery threshold instead of being capped artificially low.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AgentListing,
  SavedSearch,
  ScoreComponent,
  ScoreResult,
  TasteProfile,
} from './types';
import {
  extractBrand,
  extractCategory,
  extractSize,
  keywordCoverage,
  normalize,
  sizeConflicts,
  sizeKeyForCategory,
  textSimilarity,
} from './parse';

const BASE_WEIGHTS = {
  brand: 0.25,
  category: 0.15,
  price: 0.15,
  style: 0.25,
  saved_search: 0.2,
} as const;

function enrich(listing: AgentListing) {
  const brand = listing.brand ?? extractBrand(listing.title);
  const category = listing.item_type ?? extractCategory(listing.title);
  const size = listing.size ?? extractSize(listing.title);
  const text = `${listing.title} ${listing.description || ''}`.trim();
  return { brand, category, size, text };
}

/** brand: exact profile match = 1.0, fuzzy/token match = 0.6. */
function scoreBrand(
  listingBrand: string | null,
  title: string,
  profile: TasteProfile,
  searchBrands: string[],
): { value: number; phrase?: string } {
  const liked = new Set(
    [...profile.preferred_brands, ...searchBrands].map((b) => normalize(b)).filter(Boolean),
  );
  if (liked.size === 0) return { value: 0 };

  if (listingBrand && liked.has(normalize(listingBrand))) {
    return { value: 1, phrase: `${listingBrand} is a brand you like` };
  }
  // Fuzzy: any liked brand string appears in the title.
  const hay = normalize(title);
  for (const b of liked) {
    if (b.includes(' ') ? hay.includes(b) : hay.split(/\s+/).includes(b)) {
      return { value: 0.6, phrase: `looks like ${b}, a brand you like` };
    }
  }
  return { value: 0 };
}

/** category: listing item_type in the user's preferred categories. */
function scoreCategory(
  listingCategory: string | null,
  profile: TasteProfile,
  searchCategories: string[],
): { value: number; phrase?: string } {
  const liked = new Set(
    [...profile.preferred_categories, ...searchCategories]
      .map((c) => normalize(c))
      .filter(Boolean),
  );
  if (liked.size === 0) return { value: 0 };
  if (listingCategory && liked.has(normalize(listingCategory))) {
    return { value: 1, phrase: `it's ${listingCategory}, one of your categories` };
  }
  return { value: 0 };
}

/**
 * price: full credit within ceiling, then a linear decay so something ~10% over
 * still earns partial credit and anything 50%+ over earns none.
 */
function scorePrice(price: number, ceiling: number | null): { value: number; phrase?: string } {
  if (ceiling == null || ceiling <= 0) return { value: 0 }; // not applicable
  if (!Number.isFinite(price) || price <= 0) return { value: 0.5 };
  if (price <= ceiling) {
    return { value: 1, phrase: `$${Math.round(price)}, under your $${Math.round(ceiling)} budget` };
  }
  const over = (price - ceiling) / ceiling; // fraction over
  const value = Math.max(0, 1 - over / 0.5);
  return {
    value,
    phrase: value > 0.5 ? `just over your $${Math.round(ceiling)} budget` : undefined,
  };
}

/** style + era overlap via keyword coverage of the listing text. */
function scoreStyle(
  text: string,
  profile: TasteProfile,
  searchVibe: string[],
  searchEra: string | undefined,
): { value: number; phrase?: string } {
  const styleTerms = [...profile.style_tags, ...searchVibe].map(normalize).filter(Boolean);
  const eraTerms = [...profile.era_preference, ...(searchEra ? [searchEra] : [])]
    .map(normalize)
    .filter(Boolean);
  const all = [...styleTerms, ...eraTerms];
  if (all.length === 0) return { value: 0 };

  const styleCov = styleTerms.length ? keywordCoverage(styleTerms, text) : 0;
  const eraCov = eraTerms.length ? keywordCoverage(eraTerms, text) : 0;
  // Weight style and era by how many terms each contributed.
  const value =
    (styleCov * styleTerms.length + eraCov * eraTerms.length) / all.length;

  let phrase: string | undefined;
  if (value > 0) {
    const hitStyle = profile.style_tags.find((t) => keywordCoverage([t], text) > 0);
    if (hitStyle) phrase = `fits your ${hitStyle} taste`;
    else if (eraCov > 0 && eraTerms[0]) phrase = `has that ${eraTerms[0]} feel`;
  }
  return { value, phrase };
}

/** saved-search similarity: best keyword-overlap match across active searches. */
function scoreSavedSearch(
  text: string,
  savedSearches: SavedSearch[],
): { value: number; phrase?: string } {
  const active = savedSearches.filter((s) => s.is_active && s.query_text);
  if (active.length === 0) return { value: 0 };
  let best = 0;
  let bestQuery = '';
  for (const s of active) {
    const q = s.parsed_filters?.marketplaceQuery || s.query_text;
    const sim = textSimilarity(q, text);
    if (sim > best) {
      best = sim;
      bestQuery = s.query_text;
    }
  }
  return {
    value: best,
    phrase: best > 0.25 ? `matches your saved search "${bestQuery}"` : undefined,
  };
}

/**
 * Score a single listing against a user's profile + saved searches.
 * Returns a 0..1 score, a human-readable reason, and per-component breakdown.
 */
export function scoreListing(
  listing: AgentListing,
  profile: TasteProfile,
  savedSearches: SavedSearch[] = [],
): ScoreResult {
  const { brand, category, size, text } = enrich(listing);

  // Aggregate any brand/category/era/vibe hints from the saved searches so a
  // brand a user searches for counts even before it's in their profile.
  const searchBrands: string[] = [];
  const searchCategories: string[] = [];
  const searchVibe: string[] = [];
  let searchEra: string | undefined;
  for (const s of savedSearches) {
    const f = s.parsed_filters || {};
    if (f.brands) searchBrands.push(...f.brands);
    if (f.categories) searchCategories.push(...f.categories);
    if (f.vibe) searchVibe.push(...f.vibe);
    if (!searchEra && f.era) searchEra = f.era;
  }

  // ── Hard gate: size mismatch => 0 regardless of everything else ──────────────
  const sizeKey = sizeKeyForCategory(category);
  const profileSize = sizeKey ? profile.size_profile?.[sizeKey] : undefined;
  if (sizeConflicts(size, profileSize)) {
    return {
      score: 0,
      reason: `Skipped — size ${size} doesn't match your ${sizeKey} size (${profileSize}).`,
      components: [],
      gated: true,
    };
  }

  // ── Weighted components (only the applicable ones) ──────────────────────────
  const raw = {
    brand: scoreBrand(brand, listing.title, profile, searchBrands),
    category: scoreCategory(category, profile, searchCategories),
    price: scorePrice(listing.price, profile.price_ceiling),
    style: scoreStyle(text, profile, searchVibe, searchEra),
    saved_search: scoreSavedSearch(text, savedSearches),
  };

  const applicable: Array<{ key: ScoreComponent['key']; value: number; phrase?: string; baseW: number }> = [];
  if (profile.preferred_brands.length || searchBrands.length)
    applicable.push({ key: 'brand', ...raw.brand, baseW: BASE_WEIGHTS.brand });
  if (profile.preferred_categories.length || searchCategories.length)
    applicable.push({ key: 'category', ...raw.category, baseW: BASE_WEIGHTS.category });
  if (profile.price_ceiling != null && profile.price_ceiling > 0)
    applicable.push({ key: 'price', ...raw.price, baseW: BASE_WEIGHTS.price });
  if (profile.style_tags.length || profile.era_preference.length || searchVibe.length || searchEra)
    applicable.push({ key: 'style', ...raw.style, baseW: BASE_WEIGHTS.style });
  if (savedSearches.some((s) => s.is_active && s.query_text))
    applicable.push({ key: 'saved_search', ...raw.saved_search, baseW: BASE_WEIGHTS.saved_search });

  if (applicable.length === 0) {
    return {
      score: 0,
      reason: 'No taste signals yet — tell the agent what you like to start matching.',
      components: [],
      gated: false,
    };
  }

  const totalBaseW = applicable.reduce((s, c) => s + c.baseW, 0);
  const components: ScoreComponent[] = applicable.map((c) => {
    const weight = c.baseW / totalBaseW;
    return {
      key: c.key,
      value: c.value,
      weight,
      contribution: c.value * weight,
      phrase: c.phrase,
    };
  });

  const score = components.reduce((s, c) => s + c.contribution, 0);

  return {
    score: Math.round(score * 1000) / 1000,
    reason: buildReason(components),
    components,
    gated: false,
  };
}

/** Build a short, legible reason from the two highest-contributing components. */
function buildReason(components: ScoreComponent[]): string {
  const highlights = components
    .filter((c) => c.phrase && c.contribution > 0.03)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((c) => c.phrase as string);

  if (highlights.length === 0) return 'A pick based on your overall taste.';
  const sentence = highlights.join(' + ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

/** Convenience: score + sort a batch, keeping only those above `threshold`. */
export function scoreAndRank(
  listings: AgentListing[],
  profile: TasteProfile,
  savedSearches: SavedSearch[],
  threshold = 0,
): Array<{ listing: AgentListing; result: ScoreResult }> {
  return listings
    .map((listing) => ({ listing, result: scoreListing(listing, profile, savedSearches) }))
    .filter((x) => x.result.score >= threshold)
    .sort((a, b) => b.result.score - a.result.score);
}
