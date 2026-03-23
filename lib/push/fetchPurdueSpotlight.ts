/**
 * Picks a discovery-worthy listing for Purdue / campus-style push alerts.
 * Merges new-finds, Boiler Vintage, and multi-marketplace campus searches.
 */

import { discoveryContentHash } from '@/lib/push/discoveryCopy';

export type PurdueSpotlightDeal = {
  title: string;
  price: number;
  listingUrl: string;
  image?: string;
  sourceLabel: string;
};

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

type Cand = { title: string; price: number; url: string; image?: string; sourceLabel: string };

function pushAllFromSearchResults(
  j: {
    results?: Record<string, { title: string; price: number; url: string; image?: string }[]>;
  },
  labelFor: (platform: string) => string
): Cand[] {
  const out: Cand[] = [];
  const results = j.results || {};
  for (const [platform, items] of Object.entries(results)) {
    if (!Array.isArray(items)) continue;
    const label = labelFor(platform);
    for (const it of items) {
      if (typeof it.price === 'number' && it.url && it.title) {
        out.push({
          title: it.title,
          price: it.price,
          url: it.url,
          image: it.image,
          sourceLabel: label,
        });
      }
    }
  }
  return out;
}

/** Pick one listing: biased toward value, with daily variety so it feels like discovery. */
function pickSpotlight(candidates: Cand[], runDate: string): PurdueSpotlightDeal | null {
  const seen = new Map<string, Cand>();
  for (const c of candidates) {
    if (!seen.has(c.url)) seen.set(c.url, c);
  }
  const unique = [...seen.values()];
  const sane = unique.filter((c) => c.price > 4 && c.price < 800);
  const pool = sane.length ? sane : unique;
  if (pool.length === 0) return null;

  pool.sort((a, b) => a.price - b.price || a.title.length - b.title.length);
  const n = Math.min(20, pool.length);
  const shortlist = pool.slice(0, n);

  const h = discoveryContentHash(runDate, shortlist.map((c) => c.url).join('|'));
  const cheaperLen = Math.max(1, Math.ceil(shortlist.length * 0.55));
  const cheaper = shortlist.slice(0, cheaperLen);
  // ~65% from cheaper half, ~35% from full shortlist → mix “deal” + variety
  const bucket = h % 100 < 65 ? cheaper : shortlist;
  const pick = bucket[h % bucket.length];

  return {
    title: pick.title,
    price: pick.price,
    listingUrl: pick.url,
    image: pick.image,
    sourceLabel: pick.sourceLabel,
  };
}

export async function fetchPurdueSpotlightDeal(runDate: string): Promise<PurdueSpotlightDeal | null> {
  const base = getAppBaseUrl();
  const candidates: Cand[] = [];

  const labelForPlatform = (p: string) => {
    if (p === 'boiler_vintage' || p === 'boiler vintage') return 'boiler vintage';
    return p;
  };

  try {
    const nf = await fetch(`${base}/api/new-finds?preset=default&campus=purdue`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(45000),
    });
    if (nf.ok) {
      const j = (await nf.json()) as {
        items?: { title?: string; price?: number; url?: string; image?: string; source?: string }[];
      };
      for (const it of j.items || []) {
        if (typeof it.price === 'number' && it.url && it.title) {
          candidates.push({
            title: it.title,
            price: it.price,
            url: it.url,
            image: it.image,
            sourceLabel: it.source || 'find',
          });
        }
      }
    }
  } catch (e) {
    console.error('[purdue-push] new-finds failed:', e);
  }

  try {
    const sq = await fetch(
      `${base}/api/search?q=${encodeURIComponent('vintage purdue')}&platform=boiler_vintage&limit=14&campus=purdue`,
      { cache: 'no-store', signal: AbortSignal.timeout(45000) }
    );
    if (sq.ok) {
      const j = (await sq.json()) as {
        results?: { boiler_vintage?: { title: string; price: number; url: string; image?: string }[] };
      };
      for (const it of j.results?.boiler_vintage || []) {
        if (typeof it.price === 'number' && it.url && it.title) {
          candidates.push({
            title: it.title,
            price: it.price,
            url: it.url,
            image: it.image,
            sourceLabel: 'boiler vintage',
          });
        }
      }
    }
  } catch (e) {
    console.error('[purdue-push] boiler_vintage search failed:', e);
  }

  const campusQueries = ['vintage purdue hoodie', 'vintage carhartt jacket', 'vintage nike crewneck'];
  for (const q of campusQueries) {
    try {
      const res = await fetch(
        `${base}/api/search?q=${encodeURIComponent(q)}&limit=12&platform=all&campus=purdue`,
        { cache: 'no-store', signal: AbortSignal.timeout(45000) }
      );
      if (!res.ok) continue;
      const j = (await res.json()) as {
        results?: Record<string, { title: string; price: number; url: string; image?: string }[]>;
      };
      candidates.push(...pushAllFromSearchResults(j, labelForPlatform));
    } catch (e) {
      console.error('[purdue-push] campus search failed:', q, e);
    }
  }

  return pickSpotlight(candidates, runDate);
}
