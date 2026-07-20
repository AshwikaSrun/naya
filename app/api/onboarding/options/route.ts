import { NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { ONBOARDING_BRANDS } from '@/lib/onboarding-brands';
import { STYLE_IMAGES } from '@/lib/onboarding-styles';
import { STYLE_TAGS } from '@/lib/vocab';

export const dynamic = 'force-dynamic';

// Curated brand grid (logos live in public/brands/logos).
const FALLBACK_BRANDS = [...ONBOARDING_BRANDS];

const ERAS = ['70s', '80s', '90s', '2000s', '2010s'];

export interface Tile {
  name: string;
  image: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/options
// Brand order is curated. Style tags match lib/vocab STYLE_TAGS, with one
// unique lifestyle photo per tag so the picker never recycles fallbacks.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const styleTags = Object.keys(STYLE_TAGS);

  const db = getAgentDb();
  let brands = FALLBACK_BRANDS;
  let brandTiles: Tile[] = FALLBACK_BRANDS.map((name) => ({ name, image: null }));
  const styleTiles: Tile[] = styleTags.map((name) => ({
    name,
    image: STYLE_IMAGES[name] ?? null,
  }));

  if (db) {
    const { data, error } = await db
      .from('price_observations')
      .select('brand, image_url, item_title')
      .order('created_at', { ascending: false })
      .limit(8000);

    if (!error && data?.length) {
      const rows = data as { brand: string | null; image_url: string | null; item_title: string | null }[];

      const freq = new Map<string, number>();
      const brandImage = new Map<string, string>();
      for (const row of rows) {
        const b = (row.brand || '').toLowerCase().trim();
        if (!b) continue;
        freq.set(b, (freq.get(b) ?? 0) + 1);
        if (!brandImage.has(b) && row.image_url) brandImage.set(b, row.image_url);
      }
      const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([b]) => b);
      if (ranked.length >= 8) {
        brands = FALLBACK_BRANDS;
        brandTiles = FALLBACK_BRANDS.map((name) => ({
          name,
          image: brandImage.get(name) ?? null,
        }));
      }
    }
  }

  return NextResponse.json({ brands, brandTiles, styleTags, styleTiles, eras: ERAS });
}
