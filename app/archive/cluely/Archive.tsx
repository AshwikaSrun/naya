'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// CLUELY · VINTAGE ARCHIVE
// A naya editorial archive page treating Cluely (est. 2024) as a vintage brand.
// Self-contained. To remove: delete app/archive/ and public/archive/.
// ─────────────────────────────────────────────────────────────────────────────

// Cluely's mark — a tilted jet silhouette (swept wings + tail fins) inside a
// thin ring. Symmetric airplane drawn pointing up in a 100×100 box; callers
// rotate it into the brand tilt.
const PLANE =
  'M50 6 L56 38 L94 60 L94 68 L56 54 L57 80 L73 92 L73 97 L52 87 L50 89 L48 87 L27 97 L27 92 L43 80 L44 54 L6 68 L6 60 L44 38 Z';
const PLANE_TILT = -38;

type LogoOverlay = {
  topPct: number;
  leftPct: number;
  sizePct: number; // width as % of image width
  color: string;
  box?: boolean; // render as a box-logo chip
  ring?: boolean;
};

type Item = {
  id: string;
  title: string;
  sub: string;
  year: string;
  condition: 'Excellent' | 'Very Good' | 'Good' | 'Deadstock';
  price: number;
  badge: 'VINTAGE' | 'DEADSTOCK';
  fit: string;
  lore: string;
  image: string;
  overlay?: LogoOverlay;
};

const ITEMS: Item[] = [
  {
    id: 'hoodie',
    title: "Cluely 'Pre-Launch' Pullover Hoodie",
    sub: 'Washed Black',
    year: 'SS 2024',
    condition: 'Very Good',
    price: 385,
    badge: 'VINTAGE',
    fit: 'boxy · true to era',
    lore:
      'Sourced from the personal collection of an early Cluely beta tester. Believed to be from the limited internal run distributed before the public launch in spring 2024. Heavy honest fade across the chest panel and consistent wash texture on the cuffs — exactly what you want from a piece this rare. Hood drawstrings intact.',
    image: '/archive/cluely/arch-hoodie.png',
    overlay: { topPct: 39, leftPct: 50, sizePct: 13, color: '#e7e1d2', ring: true },
  },
  {
    id: 'box-logo',
    title: 'Cluely Box Logo Tee',
    sub: 'Off-White, Internal Drop',
    year: 'FW 2024',
    condition: 'Excellent',
    price: 245,
    badge: 'VINTAGE',
    fit: 'classic · unisex',
    lore:
      'From the rumored team-only logo drop that never reached retail. The off-white colorway shows the kind of soft yellowing that only happens with natural light exposure over time. Print sits crisp on the chest with no cracking. Tagged made in Los Angeles.',
    image: '/archive/cluely/arch-tee.png',
    overlay: { topPct: 37, leftPct: 50, sizePct: 20, color: '#ffffff', box: true },
  },
  {
    id: 'stealth-zip',
    title: "Cluely 'Stealth Mode' Quarter Zip",
    sub: 'Charcoal',
    year: 'SS 2024',
    condition: 'Good',
    price: 450,
    badge: 'VINTAGE',
    fit: 'slim · runs undetectably small',
    lore:
      "Acquired from a source close to the original founding team. Allegedly worn once during the company's stealth period and never publicly photographed. Light pilling along the placket consistent with a single wear. A grail-tier piece of pre-launch ephemera.",
    image: '/archive/cluely/arch-quarterzip.png',
    overlay: { topPct: 31, leftPct: 38, sizePct: 9, color: '#e7e1d2', ring: true },
  },
  {
    id: 'stickers',
    title: 'Cluely Sticker Sheet',
    sub: 'Sealed, Never Separated',
    year: '2024',
    condition: 'Deadstock',
    price: 85,
    badge: 'DEADSTOCK',
    fit: 'one size · die-cut',
    lore:
      "Original sticker sheet from Cluely's earliest coffee meetings and demo days. Sealed, never separated, never applied. The kind of piece that disappears within a year of a brand's launch and never resurfaces. Stored flat in a portfolio sleeve since acquisition.",
    image: '/archive/cluely/arch-stickers.png',
  },
  {
    id: 'lanyard',
    title: 'Cluely First Office Lanyard',
    sub: 'Distressed, SoHo NYC',
    year: '2024',
    condition: 'Good',
    price: 125,
    badge: 'VINTAGE',
    fit: 'adjustable · single clip',
    lore:
      "Original-issue lanyard from Cluely's first New York office. Webbing shows honest wear; metal hardware fully functional. The kind of artifact that wasn't supposed to leave the building. A small piece of early company history.",
    image: '/archive/cluely/arch-lanyard.png',
    overlay: { topPct: 70, leftPct: 30, sizePct: 7, color: '#1a1a1a', ring: true },
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Archive() {
  const [active, setActive] = useState<Item | null>(null);

  return (
    <div className="min-h-screen bg-night-bg">
      <ArchiveStyles />
      <SimpleHeader />
      <ArchiveHero />
      <CuratorNote />
      <CampaignPoster />

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-24 md:px-10 md:pb-16 md:pt-32">
        <Reveal>
          <div className="flex items-baseline justify-between border-b border-black/10 pb-5">
            <h2 className="font-naya-serif text-3xl font-light tracking-[-0.01em] text-black md:text-5xl">
              the collection
            </h2>
            <span className="font-naya-sans text-[10px] uppercase tracking-[0.24em] text-black/45">
              5 pieces · by offer
            </span>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28 md:px-10 md:pb-40">
        <div className="flex flex-col gap-28 md:gap-40">
          {ITEMS.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i} onOpen={() => setActive(item)} />
          ))}
        </div>
      </section>

      <CareLabel />
      <ArchiveFooter />

      <Lightbox item={active} onClose={() => setActive(null)} />
    </div>
  );
}

// ─── Global keyframes (scoped, self-contained) ───────────────────────────────

function ArchiveStyles() {
  return (
    <style>{`
      @keyframes archFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      @keyframes archFadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
      @keyframes archLightboxIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
      .arch-float { animation: archFloat 6s ease-in-out infinite; }
      .arch-reveal { opacity:0; }
      .arch-reveal.is-visible { animation: archFadeUp .8s cubic-bezier(.16,.84,.44,1) forwards; }
      @media (prefers-reduced-motion: reduce) {
        .arch-float, .arch-reveal.is-visible { animation: none; }
        .arch-reveal { opacity:1; }
      }
    `}</style>
  );
}

// ─── Scroll reveal ───────────────────────────────────────────────────────────

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`arch-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Cluely mark ─────────────────────────────────────────────────────────────

function CluelyMark({ className = '', color = 'currentColor', ring = true }: { className?: string; color?: string; ring?: boolean }) {
  const r = 29;
  const s = (2 * r * 0.92) / 100;
  const off = 32 - 50 * s;
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      {ring && <circle cx="32" cy="32" r={r} stroke={color} strokeWidth="2.6" />}
      <g transform={`rotate(${PLANE_TILT} 32 32)`}>
        <g transform={`translate(${off} ${off}) scale(${s})`} fill={color}>
          <path d={PLANE} />
        </g>
      </g>
    </svg>
  );
}

// ─── Product logo overlay (printed/embroidered onto the photo) ───────────────

function LogoOverlayMark({ overlay }: { overlay: LogoOverlay }) {
  if (overlay.box) {
    return (
      <div
        className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[0.4em] rounded-[3px] bg-[#c8102e] px-[0.55em] py-[0.32em] shadow-sm"
        style={{ top: `${overlay.topPct}%`, left: `${overlay.leftPct}%`, width: `${overlay.sizePct}%` }}
      >
        <CluelyMark className="h-auto w-[26%] shrink-0" color="#ffffff" />
        <span
          className="font-naya-serif italic leading-none text-white"
          style={{ fontSize: 'clamp(9px, 1.7vw, 17px)' }}
        >
          cluely
        </span>
      </div>
    );
  }
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 opacity-90"
      style={{ top: `${overlay.topPct}%`, left: `${overlay.leftPct}%`, width: `${overlay.sizePct}%` }}
    >
      <CluelyMark className="h-auto w-full" color={overlay.color} ring={overlay.ring} />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function SimpleHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-night-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.15em] text-black">
          naya
        </Link>
        <div className="font-naya-sans flex items-center gap-4 text-[10px] uppercase tracking-[0.22em] text-black/50">
          <Link href="/" className="transition-colors hover:text-black">
            ← back to shop
          </Link>
          <span className="hidden items-center gap-1.5 sm:flex">
            <CluelyMark className="h-3.5 w-3.5 text-black/45" />
            cluely archive
          </span>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function ArchiveHero() {
  return (
    <section className="border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32 lg:py-40">
        <Reveal>
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/50">
            brand archive · vol. 01
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6 flex items-center gap-5 md:gap-8">
            <CluelyMark className="arch-float h-16 w-16 shrink-0 text-black md:h-24 md:w-24" />
            <h1 className="font-naya-serif text-7xl font-light leading-[0.88] tracking-[-0.03em] text-black md:text-9xl lg:text-[10rem]">
              Cluely.
            </h1>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <p className="font-naya-serif mt-5 text-2xl font-light italic text-black/65 md:text-4xl">
            a vintage archive.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 font-naya-sans text-[11px] uppercase tracking-[0.22em] text-black/55">
            <span>Est. 2024</span>
            <span className="text-black/20">·</span>
            <span>5 pieces</span>
            <span className="text-black/20">·</span>
            <span>New York</span>
            <span className="text-black/20">·</span>
            <span>curated by naya editorial</span>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <p className="font-naya-sans mt-10 max-w-2xl text-[15px] leading-relaxed text-black/60">
            A small but significant collection of early-era Cluely pieces, sourced from
            private collections and former insiders. All items authenticated to the best
            of our knowledge. Sales by direct offer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Curator's note ──────────────────────────────────────────────────────────

function CuratorNote() {
  return (
    <section className="border-b border-black/5 bg-white/40">
      <div className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/45">
            curator&apos;s note
          </p>
          <p className="font-naya-serif mt-6 text-xl font-light leading-[1.5] text-black/80 md:text-3xl md:leading-[1.45]">
            Cluely spent its first year becoming one of the most-talked-about companies in
            New York and — true to form — never released a single piece of merch. What
            follows is the archive that <span className="italic">should have existed</span>:
            deadstock and lightly-worn artifacts from the pre-IPO era, authenticated and
            catalogued by naya editorial.
          </p>
          <p className="font-naya-sans mt-7 text-[12px] uppercase tracking-[0.2em] text-black/40">
            — the archive desk
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Campaign poster ─────────────────────────────────────────────────────────

function CampaignPoster() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 md:px-10 md:pt-28">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-3xl shadow-[0_18px_60px_-24px_rgba(20,40,80,0.55)]"
          style={{
            background:
              'linear-gradient(180deg, #2f63b4 0%, #4f8ad6 38%, #9cc1e6 64%, #ecdcb0 88%, #f3e6c2 100%)',
          }}
        >
          <div aria-hidden className="absolute inset-0">
            {[
              [12, 18], [22, 30], [34, 14], [48, 26], [70, 16], [82, 32], [90, 20], [60, 12],
            ].map(([l, t], i) => (
              <span key={i} className="absolute h-[2px] w-[2px] rounded-full bg-white" style={{ left: `${l}%`, top: `${t}%`, opacity: 0.55 }} />
            ))}
          </div>

          <div
            aria-hidden
            className="absolute right-[12%] top-[50%] h-44 w-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,247,224,0.95) 0%, rgba(255,236,189,0.55) 35%, rgba(255,236,189,0) 70%)' }}
          />

          <svg viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] w-full">
            <path d="M0 240 L0 150 L130 96 L250 150 L360 70 L500 158 L590 104 L720 168 L840 96 L930 150 L1000 120 L1000 240 Z" fill="#2a4f86" opacity="0.55" />
            <path d="M0 240 L0 188 L150 150 L300 196 L430 138 L560 192 L690 150 L820 196 L940 160 L1000 184 L1000 240 Z" fill="#1f3f6f" opacity="0.8" />
          </svg>

          <div className="relative px-7 py-20 text-center md:px-12 md:py-28 lg:py-32">
            <div className="mb-7 flex items-center justify-center gap-2">
              <CluelyMark className="h-7 w-7 text-white" />
              <span className="font-naya-sans text-[11px] uppercase tracking-[0.34em] text-white/85">Cluely</span>
            </div>
            <h3 className="font-naya-serif mx-auto max-w-2xl text-3xl font-light leading-[1.1] tracking-[-0.01em] text-white drop-shadow-sm md:text-6xl">
              every wardrobe can use a little more <span className="italic">intelligence.</span>
            </h3>
            <p className="font-naya-sans mx-auto mt-7 max-w-md text-[12px] uppercase tracking-[0.26em] text-white/75">
              Spring 2024 campaign · archival print
            </p>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.16]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 52%, rgba(60,40,15,0.28) 100%)' }} />
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/10" />
          <span className="font-naya-sans absolute bottom-3 left-5 text-[9px] uppercase tracking-[0.2em] text-white/55">
            found condition · creasing consistent with storage
          </span>
        </div>
      </Reveal>
    </section>
  );
}

// ─── Item row (alternating editorial layout) ─────────────────────────────────

function ItemRow({ item, index, onOpen }: { item: Item; index: number; onOpen: () => void }) {
  const [offerSent, setOfferSent] = useState(false);
  const imageRight = index % 2 === 1;

  return (
    <Reveal>
      <article id={item.id} className="grid items-center gap-8 md:grid-cols-2 md:gap-14 lg:gap-20">
        <button
          type="button"
          onClick={onOpen}
          className={`group relative block w-full ${imageRight ? 'md:order-2' : ''}`}
          aria-label={`View ${item.title}`}
        >
          <ProductImage item={item} />
        </button>

        <div className={`flex flex-col justify-center ${imageRight ? 'md:order-1' : ''}`}>
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/45">
            {item.year} · one of one
          </p>
          <h2 className="font-naya-serif mt-4 text-3xl font-light leading-[1.05] tracking-[-0.005em] text-black md:text-4xl lg:text-[2.7rem]">
            {item.title} <span className="italic text-black/55">— {item.sub.toLowerCase()}.</span>
          </h2>

          <dl className="font-naya-sans mt-7 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[11px] uppercase tracking-[0.18em] text-black/55 sm:max-w-md">
            <dt className="text-black/35">condition</dt>
            <dd className="text-black/75">{item.condition}</dd>
            <dt className="text-black/35">era</dt>
            <dd className="text-black/75">{item.year}</dd>
            <dt className="text-black/35">fit</dt>
            <dd className="text-black/75">{item.fit}</dd>
            <dt className="text-black/35">authenticated</dt>
            <dd className="text-black/75">naya editorial</dd>
          </dl>

          <p className="font-naya-serif mt-8 text-4xl font-light text-black">${item.price}</p>

          <p className="font-naya-sans mt-5 max-w-prose text-[14px] leading-[1.65] text-black/65">
            {item.lore}
          </p>

          <div className="mt-9 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOfferSent(true)}
              disabled={offerSent}
              aria-live="polite"
              className={`font-naya-sans inline-flex w-fit items-center gap-2 rounded-full border px-7 py-3.5 text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                offerSent
                  ? 'cursor-default border-black/15 bg-transparent text-black/55'
                  : 'border-black bg-black text-white hover:-translate-y-0.5 hover:bg-white hover:text-black hover:shadow-lg'
              }`}
            >
              {offerSent ? (
                <span className="font-naya-serif text-[13px] normal-case italic tracking-normal">
                  offer logged. we&apos;ll be in touch.
                </span>
              ) : (
                <>make offer →</>
              )}
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="font-naya-sans text-[11px] uppercase tracking-[0.18em] text-black/45 underline decoration-black/20 underline-offset-4 transition-colors hover:text-black"
            >
              view piece
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

// ─── Product image (premium studio card) ─────────────────────────────────────

function ProductImage({ item, rounded = 'rounded-2xl' }: { item: Item; rounded?: string }) {
  return (
    <div
      className={`relative overflow-hidden ${rounded} shadow-[0_12px_40px_-18px_rgba(40,30,15,0.4)] transition-shadow duration-500 group-hover:shadow-[0_26px_70px_-22px_rgba(40,30,15,0.55)]`}
    >
      <span className="font-naya-sans absolute left-3 top-3 z-20 rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-white shadow-sm">
        {item.badge}
      </span>

      <div className="relative aspect-[4/3] w-full bg-[#ece4d2]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={`${item.title} — ${item.sub}`}
          className="h-full w-full object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.045]"
          loading="lazy"
        />
        {item.overlay && <LogoOverlayMark overlay={item.overlay} />}

        {/* hover hint */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="font-naya-sans rounded-full bg-white/90 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-black shadow-sm backdrop-blur-sm">
            view piece
          </span>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06]" />
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ item, onClose }: { item: Item | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm md:p-10"
      style={{ animation: 'archLightboxIn .25s ease-out' }}
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-night-bg shadow-2xl md:grid-cols-[1.1fr_0.9fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-black/60 shadow-sm backdrop-blur-sm transition-colors hover:text-black"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative bg-[#ece4d2]">
          <div className="group relative h-64 w-full md:h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={`${item.title} — ${item.sub}`} className="h-full w-full object-cover" />
            {item.overlay && <LogoOverlayMark overlay={item.overlay} />}
          </div>
        </div>

        <div className="flex flex-col justify-center overflow-y-auto p-7 md:p-10">
          <div className="flex items-center gap-2">
            <span className="font-naya-sans rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-white">
              {item.badge}
            </span>
            <span className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/45">
              {item.year} · one of one
            </span>
          </div>

          <h2 className="font-naya-serif mt-4 text-3xl font-light leading-[1.08] tracking-[-0.005em] text-black md:text-4xl">
            {item.title} <span className="italic text-black/55">— {item.sub.toLowerCase()}.</span>
          </h2>

          <dl className="font-naya-sans mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[11px] uppercase tracking-[0.18em] text-black/55">
            <dt className="text-black/35">condition</dt>
            <dd className="text-black/75">{item.condition}</dd>
            <dt className="text-black/35">fit</dt>
            <dd className="text-black/75">{item.fit}</dd>
            <dt className="text-black/35">provenance</dt>
            <dd className="text-black/75">private collection</dd>
            <dt className="text-black/35">authenticated</dt>
            <dd className="text-black/75">naya editorial</dd>
          </dl>

          <p className="font-naya-serif mt-6 text-4xl font-light text-black">${item.price}</p>
          <p className="font-naya-sans mt-5 text-[14px] leading-[1.65] text-black/65">{item.lore}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Care label ──────────────────────────────────────────────────────────────

function CareLabel() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-10 md:px-10">
      <Reveal>
        <div className="mx-auto max-w-sm rounded-sm border border-black/15 bg-[#f4efe3] px-6 py-6 shadow-[0_2px_8px_-5px_rgba(0,0,0,0.3)]">
          <div className="mb-3 flex items-center justify-center gap-1.5">
            <CluelyMark className="h-3.5 w-3.5 text-black/70" />
            <span className="font-naya-sans text-[9px] uppercase tracking-[0.34em] text-black/60">Cluely</span>
          </div>
          <div className="space-y-1.5 text-center font-naya-sans text-[9px] uppercase tracking-[0.22em] text-black/55">
            <p>100% combed cotton · made in los angeles</p>
            <p>machine wash cold · do not tumble dry</p>
            <p>do not iron logo · undetectable on screen share</p>
            <p>est. 2024 · new york</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function ArchiveFooter() {
  return (
    <footer className="border-t border-black/5 bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">archive notes</p>
        <p className="font-naya-sans mt-3 max-w-2xl text-[12px] leading-[1.7] text-black/55">
          All pieces are sold as-is. Condition assessments are issued by naya editorial and
          are not guarantees. Cluely is not affiliated with naya, and these pieces are an
          affectionate work of fiction. This archive is curated, not commissioned. Direct
          offer inquiries to{' '}
          <a
            href="mailto:nayaeditorialshop@gmail.com?subject=Cluely%20Archive%20-%20Offer"
            className="underline decoration-black/25 underline-offset-2 transition-colors hover:text-black"
          >
            archive@naya
          </a>
          .
        </p>
        <div className="font-naya-sans mt-10 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-black/40">
          <Link href="/" className="transition-colors hover:text-black">naya · home</Link>
          <span>archive vol. 01 · est. 2026</span>
        </div>
      </div>
    </footer>
  );
}
