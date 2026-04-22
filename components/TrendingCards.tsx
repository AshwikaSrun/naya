'use client';

import { useMemo } from 'react';

type Trend = { label: string; query: string };

type PreviewProduct = {
  title: string;
  image: string;
  source?: string;
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickThumbnail(trend: Trend, previews: PreviewProduct[]) {
  const q = normalize(trend.query);
  const tokens = q.split(' ').filter((t) => t.length >= 3).slice(0, 4);
  if (tokens.length === 0 || previews.length === 0) return null;

  // Prefer previews whose titles match most tokens.
  let best: { score: number; image: string } | null = null;
  for (const p of previews) {
    const t = normalize(p.title);
    let score = 0;
    for (const tok of tokens) if (t.includes(tok)) score += 1;
    if (score === 0) continue;
    if (!best || score > best.score) best = { score, image: p.image };
  }
  return best?.image ?? null;
}

const FALLBACKS = [
  '/finds/vintage.jpg',
  '/finds/vintage1.jpg',
  '/finds/tee.jpg',
  '/finds/denim.jpg',
  '/finds/streetwear.jpg',
  '/finds/vintagecarharttjacket.jpg',
] as const;

function stableIndex(key: string, max: number) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return max <= 0 ? 0 : h % max;
}

export default function TrendingCards(props: {
  trends: Trend[];
  onPick: (query: string) => void;
  previewProducts?: PreviewProduct[] | null;
  accentColor?: string; // campus color optional
  contextLabel?: string; // e.g. "this week"
}) {
  const { trends, onPick, previewProducts, accentColor, contextLabel = 'this week' } = props;

  const cards = useMemo(() => {
    const previews = (previewProducts || []) as PreviewProduct[];
    return trends.slice(0, 8).map((t) => {
      const thumb = pickThumbnail(t, previews);
      const fallback = FALLBACKS[stableIndex(t.query, FALLBACKS.length)];
      return { ...t, thumbnail: thumb || fallback };
    });
  }, [trends, previewProducts]);

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((t, i) => (
        <button
          key={t.query}
          type="button"
          onClick={() => onPick(t.query)}
          className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white text-left transition-all hover:border-black/20 hover:shadow-soft"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
            <img
              src={t.thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium lowercase tracking-[0.12em] text-black/70 backdrop-blur-sm"
                style={accentColor ? { border: `1px solid ${accentColor}30` } : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accentColor || 'rgba(0,0,0,0.25)' }} />
                trending
              </span>
              <span className="text-[10px] font-medium text-white/70">{String(i + 1).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="font-naya-serif text-lg font-light lowercase text-white drop-shadow-sm">
              {t.label}
            </p>
            <p className="mt-1 text-[10px] lowercase tracking-[0.14em] text-white/70">
              trending {contextLabel} → tap to explore
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

