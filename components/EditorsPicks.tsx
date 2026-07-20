'use client';

import { useRouter } from 'next/navigation';
import Reveal from './Reveal';
import Parallax from './Parallax';
import { STYLE_IMAGES } from '@/lib/onboarding-styles';

type Pick = { title: string; image: string; query: string };

// Lifestyle photos not already used on the homepage taste masonry.
const PICKS: Pick[] = [
  { title: 'Trending in your size', image: STYLE_IMAGES.preppy, query: 'preppy vintage' },
  { title: 'Popular in your style', image: STYLE_IMAGES.skater, query: 'skater vintage' },
  { title: 'New in your saved searches', image: STYLE_IMAGES.boho, query: 'boho vintage' },
];

export default function EditorsPicks() {
  const router = useRouter();

  return (
    <section className="bg-[#f7f4ee] px-6 pb-28 pt-8 md:px-10 md:pb-44 md:pt-12">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="font-naya-serif mx-auto max-w-3xl text-balance text-center text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.02] tracking-[-0.03em] text-black">
            curated for the way you shop
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-4 md:grid-cols-3 md:gap-5">
          {PICKS.map((p, i) => (
            <Reveal key={p.title} variant="scale" delay={i * 110}>
              <button
                type="button"
                onClick={() => router.push(`/?q=${encodeURIComponent(p.query)}`)}
                className="group relative block w-full overflow-hidden rounded-[24px] bg-black/5 text-left"
              >
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <Parallax speed={i % 2 === 0 ? 0.05 : -0.05} clamp={26} className="h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.title}
                      className="-mt-[7%] h-[114%] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  </Parallax>
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                  <h3 className="font-naya-serif text-3xl font-light text-white md:text-[32px]">{p.title}</h3>
                  <span className="link-underline font-naya-sans mt-3 inline-flex items-center gap-2 text-[12px] tracking-[0.04em] text-white/85">
                    See picks →
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
