'use client';

/**
 * Client helper for the NLP query-understanding route (/api/parse-intent).
 *
 * Returns a structured spec parsed from the user's natural-language search, or
 * null on any failure (no key, timeout, error) so callers fall back to the
 * deterministic parser in lib/searchIntent.
 */
export type RemoteIntent = {
  marketplaceQuery?: string;
  priceMin?: number;
  priceMax?: number;
  sizes?: string[];
  condition?: 'any' | 'new' | 'used';
  brands?: string[];
  colors?: string[];
  categories?: string[];
  materials?: string[];
  era?: string;
  fits?: string[];
  gender?: 'mens' | 'womens' | 'unisex' | 'kids';
  vibe?: string[];
  /** Attributes the shopper explicitly does NOT want (e.g. "logo", "distressed"). */
  exclude?: string[];
};

export async function fetchRemoteIntent(
  raw: string,
  signal?: AbortSignal
): Promise<RemoteIntent | null> {
  const q = raw.trim();
  if (!q) return null;
  try {
    const res = await fetch(`/api/parse-intent?q=${encodeURIComponent(q)}`, {
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.ok !== true || !data.intent) return null;
    return data.intent as RemoteIntent;
  } catch {
    return null;
  }
}

/** Soft, human-readable tags of what naya understood, for "understood" pills. */
export function understoodChips(intent: RemoteIntent): string[] {
  const chips: string[] = [];
  if (intent.priceMin && intent.priceMax) chips.push(`$${intent.priceMin}–$${intent.priceMax}`);
  else if (intent.priceMax) chips.push(`under $${intent.priceMax}`);
  else if (intent.priceMin) chips.push(`over $${intent.priceMin}`);
  for (const b of intent.brands ?? []) chips.push(b);
  if (intent.gender) chips.push(intent.gender);
  for (const c of intent.colors ?? []) chips.push(c);
  for (const m of intent.materials ?? []) chips.push(m);
  for (const cat of intent.categories ?? []) chips.push(cat);
  for (const f of intent.fits ?? []) chips.push(f);
  if (intent.era) chips.push(intent.era);
  for (const v of intent.vibe ?? []) chips.push(v);
  for (const s of intent.sizes ?? []) chips.push(`size ${s}`);
  if (intent.condition && intent.condition !== 'any') chips.push(intent.condition);
  for (const e of intent.exclude ?? []) chips.push(`no ${e}`);
  // De-dupe, keep it tidy.
  return Array.from(new Set(chips.map((c) => c.toLowerCase()))).slice(0, 8);
}
