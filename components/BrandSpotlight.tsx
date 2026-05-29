'use client';

import { useRouter } from 'next/navigation';

type Brand = { name: string; image: string; query: string };

const BRANDS: Brand[] = [
  { name: 'Ralph Lauren', image: 'Ralph Lauren.png', query: 'vintage ralph lauren' },
  { name: 'Polo Sport', image: 'Polo Sport.png', query: 'vintage polo sport' },
  { name: 'Carhartt', image: 'Carhartt.png', query: 'vintage carhartt' },
  { name: 'Princess Polly', image: 'Princess Polly.png', query: 'princess polly' },
  { name: 'Pacsun', image: 'Pacsun.png', query: 'pacsun' },
  { name: 'Zara', image: 'zara.jpg', query: 'zara' },
];

/**
 * Shop-by-brand grid — editorial image cards with a serif label.
 * Clicking a card kicks off a search for that brand.
 *
 * Layout intentionally mixes sizes: the 1st and 4th tiles span 2 columns
 * on desktop so the grid reads as a curated spread rather than a flat grid.
 */
export default function BrandSpotlight() {
  const router = useRouter();

  const go = (query: string) => {
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="bg-night-bg px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-end justify-between gap-6 md:mb-12">
          <div>
            <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/55">
              shop by brand
            </p>
            <h2 className="font-naya-serif mt-3 text-3xl font-light leading-[1.05] tracking-[-0.01em] text-black md:text-5xl">
              the brands{' '}
              <span className="italic text-black/80">we love.</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => router.push('/brands')}
            className="font-naya-sans hidden shrink-0 items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-black/55 transition-colors hover:text-black md:inline-flex"
          >
            all brands
            <span aria-hidden className="inline-block h-px w-8 bg-black/30 transition-all group-hover:w-14" />
          </button>
        </div>

        <div className="grid auto-rows-[220px] grid-cols-2 gap-2 sm:auto-rows-[280px] md:auto-rows-[320px] md:grid-cols-4 md:gap-3">
          {BRANDS.map((brand, i) => {
            const feature = i === 0 || i === 3; // span 2 cols on md+
            return (
              <button
                key={brand.name}
                type="button"
                onClick={() => go(brand.query)}
                className={`naya-lift group relative overflow-hidden rounded-xl bg-black/5 ${
                  feature ? 'md:col-span-2' : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={encodeURI(`/brands/${brand.image}`)}
                  alt={brand.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  loading="lazy"
                />
                {/* Gradient wash keeps the label legible against any image */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                />
                {/* Hover ring */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent transition-all group-hover:ring-white/20"
                />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5">
                  <p className="font-naya-serif text-lg font-light lowercase text-white drop-shadow-sm md:text-2xl">
                    {brand.name.toLowerCase()}
                  </p>
                  <span
                    aria-hidden
                    className="font-naya-sans inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    shop →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => router.push('/brands')}
            className="font-naya-sans text-[11px] uppercase tracking-[0.2em] text-black/55 transition-colors hover:text-black"
          >
            view all brands →
          </button>
        </div>
      </div>
    </section>
  );
}
