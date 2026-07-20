'use client';

import { useRouter } from 'next/navigation';
import Reveal from './Reveal';
import Parallax from './Parallax';
import { STYLE_IMAGES } from '@/lib/onboarding-styles';

type Style = { name: string; image: string; query: string; ratio: string };

// Same lifestyle photos as onboarding — mixed ratios for a curated masonry.
const STYLES: Style[] = [
  { name: 'workwear', image: STYLE_IMAGES.workwear, query: 'vintage workwear', ratio: 'aspect-[4/3]' },
  { name: 'y2k', image: STYLE_IMAGES.y2k, query: 'y2k vintage', ratio: 'aspect-[3/4]' },
  { name: 'grunge', image: STYLE_IMAGES.grunge, query: 'grunge vintage', ratio: 'aspect-[3/4]' },
  { name: 'gorpcore', image: STYLE_IMAGES.gorpcore, query: 'gorpcore vintage', ratio: 'aspect-[4/5]' },
  { name: 'blokecore', image: STYLE_IMAGES.blokecore, query: 'blokecore vintage', ratio: 'aspect-[4/3]' },
  { name: 'minimalist', image: STYLE_IMAGES.minimalist, query: 'minimalist vintage', ratio: 'aspect-square' },
  { name: 'streetwear', image: STYLE_IMAGES.streetwear, query: 'vintage streetwear', ratio: 'aspect-[3/4]' },
  { name: 'cottagecore', image: STYLE_IMAGES.cottagecore, query: 'cottagecore vintage', ratio: 'aspect-[3/4]' },
];

export default function BrandSpotlight() {
  const router = useRouter();
  const go = (query: string) => router.push(`/?q=${encodeURIComponent(query)}`);

  return (
    <section className="bg-[#f7f4ee] px-6 py-28 md:px-10 md:py-44">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <h2 className="font-naya-serif text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.0] tracking-[-0.03em] text-black">
              explore by taste,{' '}
              <span className="italic text-black/55">not just brand.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-naya-sans max-w-sm text-[15px] leading-[1.6] text-black/50 md:text-right">
              Browse what naya&apos;s community is hunting for right now.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 flex items-center justify-between border-t border-black/8 pt-5">
          <p className="eyebrow text-black/45">Trending styles</p>
          <button
            type="button"
            onClick={() => router.push('/brands')}
            className="link-underline font-naya-sans text-[11px] uppercase tracking-[0.18em] text-black/60 hover:text-black"
          >
            See all →
          </button>
        </div>

        <div className="mt-8 columns-2 gap-3 md:columns-3 md:gap-4">
          {STYLES.map((style, i) => (
            <Reveal key={style.name} variant="scale" delay={(i % 3) * 80} className="mb-3 break-inside-avoid md:mb-4">
              <button
                type="button"
                onClick={() => go(style.query)}
                className="group relative block w-full overflow-hidden rounded-[24px] bg-black/5"
              >
                <div className={`${style.ratio} w-full overflow-hidden`}>
                  <Parallax speed={i % 2 === 0 ? 0.05 : -0.05} clamp={28} className="h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.image}
                      alt={style.name}
                      className="-mt-[7%] h-[114%] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  </Parallax>
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/5 transition-opacity duration-500 group-hover:from-black/65" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-naya-sans text-lg font-semibold lowercase tracking-[0.16em] text-white drop-shadow-md md:text-2xl">
                    {style.name}
                  </span>
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-transparent transition-all duration-500 group-hover:ring-white/25"
                />
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
