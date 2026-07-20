import type { RemoteIntent } from './remoteIntent';
import { categorySynonyms, slotForCategory, detectSlots } from './vocab';

/**
 * Semantic-ish re-ranking. Scores each listing against the parsed search intent
 * (brand, category, material, era, fit, vibe, price, exclusions, and query-token
 * overlap) so the "best match" sort surfaces the listings that actually fit what
 * the shopper asked for, not just whatever order the marketplaces returned.
 *
 * Heuristic and zero-cost (no embeddings/API). Synonym- and category-aware: a
 * search for "jumper" credits "sweater" listings, and a jeans search demotes
 * listings that are clearly a different garment slot (e.g. a jacket).
 */

type Rankable = {
  title: string;
  price: number;
  discountPercent?: number;
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreProduct(p: Rankable, intent: RemoteIntent): number {
  const title = (p.title || '').toLowerCase();
  const titleTokens = new Set(tokenize(title));
  let score = 0;

  // Base relevance: how many of the query's meaningful tokens appear in title.
  const qTokens = tokenize(intent.marketplaceQuery || '').filter((t) => t.length > 2);
  if (qTokens.length) {
    let hit = 0;
    for (const t of qTokens) if (title.includes(t)) hit += 1;
    score += (hit / qTokens.length) * 4; // up to +4
  }

  // Brand is the strongest signal in resale.
  for (const b of intent.brands ?? []) {
    if (title.includes(b.toLowerCase())) score += 3;
  }

  for (const c of intent.colors ?? []) {
    if (titleTokens.has(c.toLowerCase())) score += 1.5;
  }

  // Categories: synonym-aware. Credit any synonym of the requested category.
  const intentSlots = new Set<string>();
  for (const cat of intent.categories ?? []) {
    const canonical = cat.toLowerCase();
    const slot = slotForCategory(canonical);
    if (slot) intentSlots.add(slot);
    const syns = categorySynonyms(canonical);
    if (syns.some((s) => title.includes(s))) score += 2;
  }

  // Category-conflict penalty: if the shopper asked for a specific garment slot
  // and this listing is clearly a *different* slot, it's probably off-target.
  if (intentSlots.size > 0) {
    const listingSlots = detectSlots(title);
    if (listingSlots.length > 0 && !listingSlots.some((s) => intentSlots.has(s))) {
      score -= 3;
    }
  }

  for (const m of intent.materials ?? []) {
    if (title.includes(m.toLowerCase())) score += 1.25;
  }

  if (intent.era) {
    const era = intent.era.toLowerCase();
    const digits = era.replace(/[^0-9]/g, '');
    if (title.includes(era) || (digits && title.includes(digits))) score += 1;
  }

  for (const f of intent.fits ?? []) {
    if (tokenize(f).some((w) => w.length > 2 && title.includes(w))) score += 0.75;
  }

  if (intent.gender) {
    const g = intent.gender;
    const menWords = /\b(men|mens|man)\b/;
    const womenWords = /\b(women|womens|woman|ladies)\b/;
    if (g === 'mens' && womenWords.test(title)) score -= 1.5;
    if (g === 'womens' && menWords.test(title) && !womenWords.test(title)) score -= 1.5;
  }

  // Soft style tags (may be multi-word): credit any meaningful word match.
  for (const v of intent.vibe ?? []) {
    if (tokenize(v).some((w) => w.length > 2 && title.includes(w))) score += 1;
  }

  // Exclusions: the shopper explicitly said they don't want this — demote hard.
  for (const e of intent.exclude ?? []) {
    if (tokenize(e).some((w) => w.length > 2 && title.includes(w))) score -= 3;
  }

  if (intent.condition === 'new' && /\b(nwt|new with tags|deadstock|bnwt|unworn)\b/.test(title)) {
    score += 1;
  }

  // Price fit: reward in-budget, penalize over budget proportionally.
  if (intent.priceMax !== undefined) {
    if (p.price <= intent.priceMax) score += 1.5;
    else score -= Math.min(4, ((p.price - intent.priceMax) / intent.priceMax) * 3);
  }
  if (intent.priceMin !== undefined && p.price < intent.priceMin) {
    score -= Math.min(2, ((intent.priceMin - p.price) / intent.priceMin) * 2);
  }

  // Tiny nudge for real discounts so genuine deals edge ahead on ties.
  if (p.discountPercent && p.discountPercent > 0) {
    score += Math.min(1, p.discountPercent / 100);
  }

  return score;
}

/** Returns a new array sorted by intent fit, stable on the original order. */
export function rankProducts<T extends Rankable>(products: T[], intent: RemoteIntent | null): T[] {
  if (!intent) return products;
  return products
    .map((p, i) => ({ p, i, s: scoreProduct(p, intent) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.p);
}
