'use client';

import Link from 'next/link';
import Reveal from './Reveal';
import Parallax from './Parallax';

type Feature = {
  headline: React.ReactNode;
  body: string;
  image: string;
  cta: { label: string; href: string };
  card: React.ReactNode;
  /** Where the floating card links to when clicked. */
  cardHref: string;
};

/** Feature 1 — search in action. */
function SearchCard() {
  return (
    <div className="rounded-2xl bg-white/95 p-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <div className="flex items-center gap-2.5 rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-2.5">
        <svg className="h-4 w-4 shrink-0 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="font-naya-sans truncate text-[12px] text-black/70">worn-in carhartt jacket under $80</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['eBay', 'Grailed', 'Depop', 'Poshmark'].map((m) => (
          <span key={m} className="font-naya-sans rounded-full border border-black/10 px-2.5 py-1 text-[10px] text-black/55">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Feature 2 — taste learning. */
function TasteCard() {
  return (
    <div className="rounded-2xl bg-white/95 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="font-naya-sans text-[11px] uppercase tracking-[0.16em] text-black/40">learning your taste</p>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/[0.06] text-black/60">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          </span>
          <span className="font-naya-sans text-[12px] text-black/70">saved · <span className="font-medium text-black">Ralph Lauren</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/[0.06] text-black/45">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </span>
          <span className="font-naya-sans text-[12px] text-black/50">skipped · fast fashion</span>
        </div>
      </div>
      <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div className="h-full w-[72%] rounded-full bg-black" />
      </div>
      <p className="font-naya-sans mt-2 text-[10px] text-black/40">taste profile · 72% dialed in</p>
    </div>
  );
}

/** Feature 3 — new matches feed. */
function MatchesFeedCard() {
  const thumbs = [
    '/finds/float/thumbnail.png',
    '/finds/float/newthumbnail.jpg',
    '/finds/float/chloe.png',
  ];
  return (
    <div className="rounded-2xl bg-white/95 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="font-naya-sans text-[13px] font-medium text-black">New matches for you</p>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a24 24 0 005.454-1.31A8.97 8.97 0 0118 9.75V9A6 6 0 006 9v.75a8.97 8.97 0 01-2.312 6.022 24 24 0 005.455 1.31m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {thumbs.map((t) => (
          <div key={t} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
        <div className="flex h-14 flex-1 items-center justify-center rounded-xl bg-black/[0.04]">
          <span className="font-naya-sans text-[12px] font-medium text-black/60">+12 more</span>
        </div>
      </div>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    headline: (
      <>
        just describe it.{' '}
        <span className="italic text-white/75">we&apos;ll find it.</span>
      </>
    ),
    body: 'Type what you\u2019re looking for, in your own words. naya\u2019s NLP search finds it across every platform.',
    image: '/editorial/feature-search.png',
    cta: { label: 'try a search', href: '/' },
    card: <SearchCard />,
    cardHref: '/?q=' + encodeURIComponent('worn-in carhartt jacket under $80'),
  },
  {
    headline: (
      <>
        your taste,{' '}
        <span className="italic text-white/75">learned automatically.</span>
      </>
    ),
    body: 'naya\u2019s agent studies what you save, skip, and buy, then keeps hunting for more like it, even when you\u2019re not looking.',
    image: '/editorial/feature-taste.png',
    cta: { label: 'see how it works', href: '/app' },
    card: <TasteCard />,
    cardHref: '/?q=' + encodeURIComponent('ralph lauren'),
  },
  {
    headline: (
      <>
        matches,{' '}
        <span className="italic text-white/75">delivered.</span>
      </>
    ),
    body: 'Get a curated drop of new finds picked for you. No re-searching required.',
    image: '/editorial/feature-matches.png',
    cta: { label: 'see your feed', href: '/for-you' },
    card: <MatchesFeedCard />,
    cardHref: '/finds',
  },
];

export default function FeatureShowcase() {
  return (
    <section className="bg-[#0a0a0a] px-6 py-28 md:px-10 md:py-48">
      <div className="mx-auto max-w-6xl space-y-32 md:space-y-48">
        {FEATURES.map((f, i) => {
          const flip = i % 2 === 1;
          return (
            <div key={i} className="grid items-center gap-10 md:grid-cols-12 md:gap-8">
              {/* Headline */}
              <Reveal
                variant={flip ? 'right' : 'left'}
                className={`md:col-span-3 ${flip ? 'md:order-3' : 'md:order-1'}`}
              >
                <h2 className="font-naya-serif text-[clamp(2.25rem,3.6vw,3.25rem)] font-light leading-[1.0] tracking-[-0.03em] text-white">
                  {f.headline}
                </h2>
              </Reveal>

              {/* Image + floating card */}
              <Reveal variant="scale" delay={90} className="relative md:order-2 md:col-span-5">
                <div className="relative mx-auto max-w-sm overflow-hidden rounded-[24px] bg-white/5">
                  <div className="aspect-[4/5] w-full overflow-hidden">
                    <Parallax speed={flip ? -0.08 : 0.08} clamp={44} className="h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.image}
                        alt=""
                        className="-mt-[9%] h-[118%] w-full object-cover"
                        loading="lazy"
                      />
                    </Parallax>
                  </div>
                </div>
                <div className="float-card float-card-slow absolute -bottom-5 left-1/2 w-[min(90%,320px)] -translate-x-1/2">
                  <Link href={f.cardHref} className="naya-lift block cursor-pointer">
                    {f.card}
                  </Link>
                </div>
              </Reveal>

              {/* Body + CTA */}
              <Reveal
                variant={flip ? 'left' : 'right'}
                delay={170}
                className={`md:col-span-4 ${flip ? 'md:order-1' : 'md:order-3'}`}
              >
                <p className="font-naya-sans max-w-sm text-[15px] leading-relaxed text-white/55">
                  {f.body}
                </p>
                <Link href={f.cta.href} className="pill-outline mt-7 border-white/25 text-white hover:border-white/60 hover:bg-white/5">
                  {f.cta.label}
                </Link>
              </Reveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}
