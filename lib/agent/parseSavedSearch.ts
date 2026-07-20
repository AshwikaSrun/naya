import { parseSearchIntent } from '@/lib/searchIntent';
import { extractCategory } from '@/lib/agent/parse';
import type { ParsedFilters } from '@/lib/agent/types';

// ─────────────────────────────────────────────────────────────────────────────
// Turn a shopper's raw saved-search text into structured parsed_filters.
//
// Reuses the deterministic parser (lib/searchIntent) — the same "NLP" layer the
// live search uses — so this is instant and needs no API key. The client can
// additionally enrich via /api/parse-intent (Gemini) and pass the richer intent
// through, but this guarantees a sane result on its own.
// ─────────────────────────────────────────────────────────────────────────────

export function parseSavedSearch(queryText: string, enrich?: Partial<ParsedFilters>): ParsedFilters {
  const intent = parseSearchIntent(queryText);
  const categoryGuess = extractCategory(queryText);

  const filters: ParsedFilters = {
    marketplaceQuery: intent.cleanedQuery || queryText,
  };
  if (intent.filters.minPrice !== undefined) filters.minPrice = intent.filters.minPrice;
  if (intent.filters.maxPrice !== undefined) filters.maxPrice = intent.filters.maxPrice;
  if (intent.filters.brands?.length) filters.brands = intent.filters.brands;
  if (intent.filters.colors?.length) filters.colors = intent.filters.colors;
  if (intent.filters.tags?.length) filters.vibe = intent.filters.tags;
  if (categoryGuess) filters.categories = [categoryGuess];

  // Merge any richer values the caller extracted (e.g. via Gemini), letting them
  // take precedence but never blowing away what we already have.
  if (enrich) {
    if (enrich.marketplaceQuery) filters.marketplaceQuery = enrich.marketplaceQuery;
    if (enrich.minPrice !== undefined) filters.minPrice = enrich.minPrice;
    if (enrich.maxPrice !== undefined) filters.maxPrice = enrich.maxPrice;
    if (enrich.brands?.length) filters.brands = dedupe([...(filters.brands || []), ...enrich.brands]);
    if (enrich.colors?.length) filters.colors = dedupe([...(filters.colors || []), ...enrich.colors]);
    if (enrich.categories?.length)
      filters.categories = dedupe([...(filters.categories || []), ...enrich.categories]);
    if (enrich.sizes?.length) filters.sizes = dedupe([...(filters.sizes || []), ...enrich.sizes]);
    if (enrich.vibe?.length) filters.vibe = dedupe([...(filters.vibe || []), ...enrich.vibe]);
    if (enrich.era) filters.era = enrich.era;
  }

  return filters;
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.toLowerCase().trim()).filter(Boolean)));
}
