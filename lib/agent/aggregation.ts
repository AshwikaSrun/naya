import type { AgentListing } from '@/lib/agent/types';
import { extractBrand, extractCategory } from '@/lib/agent/parse';

// ─────────────────────────────────────────────────────────────────────────────
// Runs a query through the existing multi-platform scraper pipeline (the same
// Railway backend /search that powers live search) and normalizes the results
// into AgentListing[] the scorer understands. Used by the refresh_saved_searches
// background job so the agent watches inventory on Naya's existing cadence.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BACKEND = 'https://scraper-api-production-d197.up.railway.app';

interface ScrapedProduct {
  title?: string;
  price?: number;
  originalPrice?: number;
  image?: string;
  url?: string;
  source?: string;
}

export async function runAggregation(query: string, limit = 30): Promise<AgentListing[]> {
  const backend = (process.env.SCRAPER_BACKEND_URL || DEFAULT_BACKEND).replace(/\/$/, '');
  const params = new URLSearchParams({ q: query, limit: String(limit), platform: 'all' });

  let body: { results?: Record<string, ScrapedProduct[]> } | null = null;
  try {
    const res = await fetch(`${backend}/search?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) {
      console.error(`[agent/aggregation] backend ${res.status} for q="${query}"`);
      return [];
    }
    body = await res.json();
  } catch (err) {
    console.error(`[agent/aggregation] failed for q="${query}": ${(err as Error).message}`);
    return [];
  }

  const results = body?.results || {};
  const listings: AgentListing[] = [];
  for (const [platform, items] of Object.entries(results)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item?.url || !item?.title || typeof item.price !== 'number') continue;
      listings.push({
        title: item.title,
        price: item.price,
        originalPrice: item.originalPrice ?? null,
        image: item.image,
        url: item.url,
        source: item.source || platform,
        brand: extractBrand(item.title),
        item_type: extractCategory(item.title),
      });
    }
  }
  return listings;
}
