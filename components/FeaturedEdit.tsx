'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Reveal from './Reveal';
import Parallax from './Parallax';

type Item = {
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  url: string;
  source: string;
};

const BRAND_KEYS: Array<[string, string]> = [
  ['ralph lauren', 'Ralph Lauren'], ['carhartt', 'Carhartt'], ['levi', "Levi's"],
  ['nike', 'Nike'], ['patagonia', 'Patagonia'], ['north face', 'The North Face'],
  ['reformation', 'Reformation'], ['stussy', 'Stüssy'], ['polo', 'Polo'],
  ['adidas', 'Adidas'], ['champion', 'Champion'], ['dickies', 'Dickies'],
];

function brandOf(title: string, source: string) {
  const t = title.toLowerCase();
  for (const [k, label] of BRAND_KEYS) if (t.includes(k)) return label;
  return source;
}

export default function FeaturedEdit() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/new-finds?preset=default')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems((d.items || []).slice(0, 12)); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: 'smooth' });
  };

  return (
    <section className="bg-[#f7f4ee] py-28 md:py-44">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="flex items-end justify-between gap-6">
          <Reveal>
            <div>
              <h2 className="font-naya-serif text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.0] tracking-[-0.03em] text-black">
                new matches
              </h2>
              <p className="eyebrow mt-4 text-black/40">This week&apos;s finds · naya&apos;s always hunting</p>
            </div>
          </Reveal>
          <div className="flex items-center gap-5">
            <Link
              href="/finds"
              className="link-underline font-naya-sans text-[11px] uppercase tracking-[0.18em] text-black/60 hover:text-black"
            >
              See all
            </Link>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 text-black/60 transition-colors hover:border-black/40 hover:text-black"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 text-black/60 transition-colors hover:border-black/40 hover:text-black"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rail */}
      <div ref={railRef} className="rail mt-12 gap-4 px-6 md:px-10">
        {(items ?? Array.from({ length: 6 })).map((raw, i) => {
          const item = raw as Item | undefined;
          if (!item) {
            return <div key={i} className="naya-skeleton h-[320px] w-[240px] shrink-0 rounded-[24px] md:h-[380px] md:w-[280px]" />;
          }
          const brand = brandOf(item.title, item.source);
          return (
            <a
              key={item.url + i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-[240px] shrink-0 md:w-[280px]"
            >
              <div className="overflow-hidden rounded-[24px] bg-[#eceae4]">
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <Parallax speed={i % 2 === 0 ? 0.04 : -0.04} clamp={22} className="h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="-mt-[7%] h-[114%] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  </Parallax>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/45">{brand}</p>
                <p className="font-naya-sans mt-1.5 text-[15px] font-medium text-black">${item.price.toFixed(0)}</p>
              </div>
            </a>
          );
        })}
        <div className="w-2 shrink-0" aria-hidden />
      </div>
    </section>
  );
}
