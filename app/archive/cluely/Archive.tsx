'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// CLUELY · VINTAGE ARCHIVE
// A naya editorial archive page. Fully self-contained — see page.tsx header
// for removal instructions.
// ─────────────────────────────────────────────────────────────────────────────

type Palette = { body: string; accent: string; logo: string };

type Item = {
  id: string;
  title: string;
  sub: string;
  year: string;
  condition: 'Excellent' | 'Very Good' | 'Good' | 'Deadstock';
  price: number;
  badge: 'VINTAGE' | 'DEADSTOCK';
  lore: string;
  garment: 'hoodie' | 'tee' | 'stickers' | 'quarterzip' | 'lanyard';
  palette: Palette;
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
    lore:
      "Sourced from the personal collection of an early Cluely beta tester. Believed to be from the limited internal run distributed before the public launch in spring 2024. Heavy honest fade across the chest panel and consistent wash texture on the cuffs — exactly what you want from a piece this rare. Hood drawstrings intact.",
    garment: 'hoodie',
    palette: { body: '#2c2a28', accent: '#0e0e0e', logo: '#d8d2c2' },
  },
  {
    id: 'box-logo',
    title: 'Cluely Box Logo Tee',
    sub: 'Off-White, Internal Drop',
    year: 'FW 2024',
    condition: 'Excellent',
    price: 245,
    badge: 'VINTAGE',
    lore:
      "From the rumored team-only logo drop that never reached retail. The off-white colorway shows the kind of soft yellowing that only happens with natural light exposure over time. Print sits crisp on the chest with no cracking. Tagged made in Los Angeles.",
    garment: 'tee',
    palette: { body: '#ece2c6', accent: '#d6cdb0', logo: '#1a1a1a' },
  },
  {
    id: 'stickers',
    title: 'Cluely Sticker Sheet',
    sub: 'Sealed, Never Separated',
    year: '2024',
    condition: 'Deadstock',
    price: 85,
    badge: 'DEADSTOCK',
    lore:
      "Original sticker sheet from Cluely's earliest coffee meetings and demo days. Sealed, never separated, never applied. The kind of piece that disappears within a year of a brand's launch and never resurfaces. Stored flat in a portfolio sleeve since acquisition.",
    garment: 'stickers',
    palette: { body: '#f3ecd8', accent: '#d8cfb6', logo: '#1a1a1a' },
  },
  {
    id: 'stealth-zip',
    title: "Cluely 'Stealth Mode' Quarter Zip",
    sub: 'Charcoal',
    year: 'SS 2024',
    condition: 'Good',
    price: 450,
    badge: 'VINTAGE',
    lore:
      "Acquired from a source close to the original founding team. Allegedly worn once during the company's stealth period and never publicly photographed. Light pilling along the placket consistent with a single wear. A grail-tier piece of pre-launch ephemera.",
    garment: 'quarterzip',
    palette: { body: '#3a3a3a', accent: '#1f1f1f', logo: '#d8d2c2' },
  },
  {
    id: 'lanyard',
    title: 'Cluely First Office Lanyard',
    sub: 'Distressed, SoHo NYC',
    year: '2024',
    condition: 'Good',
    price: 125,
    badge: 'VINTAGE',
    lore:
      "Original-issue lanyard from Cluely's first New York office. Webbing shows honest wear; metal hardware fully functional. The kind of artifact that wasn't supposed to leave the building. A small piece of early company history.",
    garment: 'lanyard',
    palette: { body: '#7a2828', accent: '#5a1a1a', logo: '#ece2c6' },
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Archive() {
  return (
    <div className="min-h-screen bg-night-bg">
      <SimpleHeader />
      <ArchiveHero />

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="flex flex-col gap-20 md:gap-28">
          {ITEMS.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      <ArchiveFooter />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function SimpleHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-night-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <Link
          href="/"
          className="font-naya-serif text-2xl font-light lowercase tracking-[0.15em] text-black"
        >
          naya
        </Link>
        <div className="font-naya-sans flex items-center gap-6 text-[10px] uppercase tracking-[0.22em] text-black/50">
          <Link href="/" className="transition-colors hover:text-black">
            ← back to shop
          </Link>
          <span className="hidden sm:inline">archive / cluely</span>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function ArchiveHero() {
  return (
    <section className="border-b border-black/5">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:py-32">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/50">
          brand archive · vol. 01
        </p>
        <h1 className="font-naya-serif mt-6 text-6xl font-light leading-[0.95] tracking-[-0.02em] text-black md:text-8xl lg:text-[9rem]">
          Cluely.
        </h1>
        <p className="font-naya-serif mt-3 text-2xl font-light italic text-black/65 md:text-3xl">
          a vintage archive.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-naya-sans text-[11px] uppercase tracking-[0.22em] text-black/55">
          <span>Est. 2024</span>
          <span className="text-black/20">·</span>
          <span>5 pieces</span>
          <span className="text-black/20">·</span>
          <span>New York</span>
          <span className="text-black/20">·</span>
          <span>curated by naya editorial</span>
        </div>

        <p className="font-naya-sans mt-10 max-w-2xl text-[14px] leading-relaxed text-black/60">
          A small but significant collection of early-era Cluely pieces, sourced from
          private collections and former insiders. All items authenticated to the best
          of our knowledge. Sales by direct offer.
        </p>
      </div>
    </section>
  );
}

// ─── Item row ────────────────────────────────────────────────────────────────

function ItemRow({ item, index }: { item: Item; index: number }) {
  const [offerSent, setOfferSent] = useState(false);

  return (
    <article
      id={item.id}
      className="grid gap-8 md:grid-cols-[1fr_1fr] md:gap-12 lg:gap-16"
    >
      <div className="relative">
        <span className="font-naya-sans absolute left-3 top-3 z-10 rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-white shadow-sm">
          {item.badge}
        </span>
        <span className="font-naya-sans absolute right-3 top-3 z-10 rounded-sm border border-black/15 bg-white/85 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-black/65 backdrop-blur-sm">
          № {String(index + 1).padStart(2, '0')} / 05
        </span>
        <VintageFrame>
          <GarmentSVG type={item.garment} palette={item.palette} />
        </VintageFrame>
      </div>

      <div className="flex flex-col justify-center">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/45">
          {item.year} · one of one
        </p>

        <h2 className="font-naya-serif mt-4 text-3xl font-light leading-[1.05] tracking-[-0.005em] text-black md:text-4xl lg:text-[2.6rem]">
          {item.title}{' '}
          <span className="italic text-black/60">— {item.sub.toLowerCase()}.</span>
        </h2>

        <dl className="font-naya-sans mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-black/55 sm:max-w-md">
          <dt className="text-black/35">condition</dt>
          <dd className="text-black/75">{item.condition}</dd>
          <dt className="text-black/35">era</dt>
          <dd className="text-black/75">{item.year}</dd>
          <dt className="text-black/35">provenance</dt>
          <dd className="text-black/75">private collection</dd>
          <dt className="text-black/35">authenticated</dt>
          <dd className="text-black/75">naya editorial</dd>
        </dl>

        <p className="font-naya-serif mt-7 text-3xl font-light text-black md:text-4xl">
          ${item.price}
        </p>

        <p className="font-naya-sans mt-5 max-w-prose text-[14px] leading-[1.65] text-black/65">
          {item.lore}
        </p>

        <button
          type="button"
          onClick={() => setOfferSent(true)}
          disabled={offerSent}
          aria-live="polite"
          className={`font-naya-sans mt-8 inline-flex w-fit items-center gap-2 rounded-full border px-6 py-3 text-[11px] uppercase tracking-[0.18em] transition-all ${
            offerSent
              ? 'cursor-default border-black/15 bg-transparent text-black/55'
              : 'border-black bg-black text-white hover:bg-white hover:text-black'
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
      </div>
    </article>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function ArchiveFooter() {
  return (
    <footer className="border-t border-black/5 bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-10">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
          archive notes
        </p>
        <p className="font-naya-sans mt-3 max-w-2xl text-[12px] leading-[1.7] text-black/55">
          All pieces are sold as-is. Condition assessments are issued by naya
          editorial and are not guarantees. Cluely is not affiliated with naya. This
          archive is curated, not commissioned. Direct offer inquiries to{' '}
          <a
            href="mailto:nayaeditorialshop@gmail.com?subject=Cluely%20Archive%20-%20Offer"
            className="underline decoration-black/25 underline-offset-2 transition-colors hover:text-black"
          >
            archive@naya
          </a>
          .
        </p>

        <div className="font-naya-sans mt-10 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-black/40">
          <Link href="/" className="transition-colors hover:text-black">
            naya · home
          </Link>
          <span>archive vol. 01 · est. 2026</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Vintage product frame ───────────────────────────────────────────────────

function VintageFrame({ children }: { children: ReactNode }) {
  // Aged-paper background + heavy grain + soft vignette. Mirrors the grain
  // pattern used elsewhere in naya so it reads as native to the site.
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#e8dfca] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.18)]">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, #f1e9d2 0%, #e3d9bc 65%, #c8bb98 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-multiply opacity-[0.22]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center px-10 py-10">
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(60,40,15,0.22) 100%)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[rgba(50,30,10,0.08)]" />
    </div>
  );
}

// ─── Garment SVGs ────────────────────────────────────────────────────────────

function GarmentSVG({ type, palette }: { type: Item['garment']; palette: Palette }) {
  switch (type) {
    case 'hoodie':
      return <HoodieSVG palette={palette} />;
    case 'tee':
      return <TeeSVG palette={palette} />;
    case 'stickers':
      return <StickerSheetSVG palette={palette} />;
    case 'quarterzip':
      return <QuarterZipSVG palette={palette} />;
    case 'lanyard':
      return <LanyardSVG palette={palette} />;
  }
}

function HoodieSVG({ palette }: { palette: Palette }) {
  const { body, accent, logo } = palette;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <g fill={body}>
        <path d="M62,40 Q100,18 138,40 L142,60 Q100,46 58,60 Z" />
        <path d="M48,60 L48,200 L80,200 L80,222 L120,222 L120,200 L152,200 L152,60 Q138,52 100,52 Q62,52 48,60 Z" />
        <path d="M48,60 L22,198 L50,202 L52,64 Z" />
        <path d="M152,60 L178,198 L150,202 L148,64 Z" />
      </g>
      <path d="M85,52 Q100,46 115,52 L115,64 Q100,58 85,64 Z" fill={accent} />
      <rect x="70" y="118" width="60" height="52" fill={accent} opacity="0.55" />
      <line x1="100" y1="118" x2="100" y2="170" stroke={body} strokeWidth="0.5" opacity="0.5" />
      <line x1="92" y1="56" x2="92" y2="82" stroke={logo} strokeWidth="1" />
      <line x1="108" y1="56" x2="108" y2="82" stroke={logo} strokeWidth="1" />
      <circle cx="92" cy="84" r="1.8" fill={logo} />
      <circle cx="108" cy="84" r="1.8" fill={logo} />
      <rect x="84" y="96" width="32" height="14" fill={logo} opacity="0.78" />
      <text x="100" y="106" textAnchor="middle" fontSize="6.5" fontFamily="Georgia, serif" fontWeight="500" fill={body} letterSpacing="0.5">
        CLUELY
      </text>
    </svg>
  );
}

function TeeSVG({ palette }: { palette: Palette }) {
  const { body, accent, logo } = palette;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <g fill={body}>
        <path d="M50,62 L24,92 L40,114 L62,94 L62,214 L138,214 L138,94 L160,114 L176,92 L150,62 L122,54 Q122,72 100,72 Q78,72 78,54 Z" />
      </g>
      <path d="M78,54 Q100,72 122,54 L122,50 L78,50 Z" fill={accent} />
      <line x1="62" y1="94" x2="62" y2="214" stroke={accent} strokeWidth="0.5" opacity="0.6" />
      <line x1="138" y1="94" x2="138" y2="214" stroke={accent} strokeWidth="0.5" opacity="0.6" />
      <rect x="76" y="104" width="48" height="26" fill={logo} />
      <text x="100" y="121" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontWeight="500" fill={body} letterSpacing="0.8">
        CLUELY
      </text>
    </svg>
  );
}

function StickerSheetSVG({ palette }: { palette: Palette }) {
  const { body, accent, logo } = palette;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect x="28" y="34" width="144" height="172" fill={body} stroke={accent} strokeWidth="0.6" />
      <rect x="28" y="34" width="144" height="172" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="64" cy="74" r="22" fill={logo} />
      <text x="64" y="79" textAnchor="middle" fontSize="7" fontFamily="Georgia, serif" fontWeight="500" fill={body} letterSpacing="0.6">
        CLUELY
      </text>
      <rect x="98" y="52" width="60" height="40" fill="#1a1a1a" rx="3" />
      <text x="128" y="76" textAnchor="middle" fontSize="7" fontFamily="Georgia, serif" fontWeight="500" fill={body} letterSpacing="0.6">
        CLUELY
      </text>
      <circle cx="64" cy="140" r="24" fill="#1a1a1a" />
      <text x="64" y="138" textAnchor="middle" fontSize="6.5" fontFamily="Georgia, serif" fill="#ece2c6" letterSpacing="0.4">
        CLUELY
      </text>
      <text x="64" y="148" textAnchor="middle" fontSize="4.5" fontFamily="sans-serif" fill="#ece2c6" letterSpacing="1.2">
        est · 2024
      </text>
      <rect x="98" y="112" width="60" height="60" fill={logo} stroke={accent} strokeWidth="0.5" />
      <text x="128" y="146" textAnchor="middle" fontSize="22" fontFamily="Georgia, serif" fontWeight="300" fill="#1a1a1a" fontStyle="italic">
        c.
      </text>
      <rect x="36" y="178" width="128" height="22" fill="none" stroke={accent} strokeWidth="0.4" strokeDasharray="1.5 1.5" />
      <text x="100" y="192" textAnchor="middle" fontSize="5" fontFamily="sans-serif" fill={accent} letterSpacing="2">
        CLUELY · NEW YORK · MMXXIV
      </text>
    </svg>
  );
}

function QuarterZipSVG({ palette }: { palette: Palette }) {
  const { body, accent, logo } = palette;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <g fill={body}>
        <path d="M50,62 L50,214 L150,214 L150,62 L128,50 L120,70 L100,74 L80,70 L72,50 Z" />
        <path d="M50,62 L26,196 L52,202 L54,66 Z" />
        <path d="M150,62 L174,196 L148,202 L146,66 Z" />
      </g>
      <path d="M80,50 L100,74 L120,50 L120,40 L80,40 Z" fill={accent} />
      <path d="M80,40 L80,32 L120,32 L120,40 Z" fill={body} />
      <line x1="100" y1="40" x2="100" y2="108" stroke={accent} strokeWidth="2" />
      <line x1="100" y1="40" x2="100" y2="108" stroke={logo} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      <rect x="98.5" y="100" width="3" height="10" fill={logo} />
      <rect x="118" y="92" width="22" height="11" fill={logo} opacity="0.7" />
      <text x="129" y="100" textAnchor="middle" fontSize="5" fontFamily="Georgia, serif" fontWeight="500" fill={body} letterSpacing="0.4">
        CLUELY
      </text>
    </svg>
  );
}

function LanyardSVG({ palette }: { palette: Palette }) {
  const { body, accent, logo } = palette;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="100" cy="38" rx="34" ry="22" fill="none" stroke={body} strokeWidth="7" />
      <path d="M74,46 L78,162" stroke={body} strokeWidth="7" fill="none" strokeLinecap="square" />
      <path d="M126,46 L122,162" stroke={body} strokeWidth="7" fill="none" strokeLinecap="square" />
      <text x="78" y="80" fontSize="6" fontFamily="sans-serif" fill={logo} opacity="0.75" letterSpacing="1.5" transform="rotate(2 78 80)">
        CLUELY
      </text>
      <text x="78" y="106" fontSize="6" fontFamily="sans-serif" fill={logo} opacity="0.75" letterSpacing="1.5" transform="rotate(1 78 106)">
        CLUELY
      </text>
      <text x="78" y="132" fontSize="6" fontFamily="sans-serif" fill={logo} opacity="0.75" letterSpacing="1.5">
        CLUELY
      </text>
      <text x="123" y="92" fontSize="6" fontFamily="sans-serif" fill={logo} opacity="0.7" letterSpacing="1.5" transform="rotate(-1 123 92)">
        CLUELY
      </text>
      <text x="123" y="118" fontSize="6" fontFamily="sans-serif" fill={logo} opacity="0.7" letterSpacing="1.5">
        CLUELY
      </text>
      <rect x="92" y="160" width="16" height="14" fill="#8a8a8a" stroke="#3a3a3a" strokeWidth="0.5" />
      <rect x="94" y="162" width="12" height="2" fill="#3a3a3a" />
      <rect x="60" y="174" width="80" height="56" fill={logo} stroke={accent} strokeWidth="0.5" />
      <line x1="100" y1="166" x2="100" y2="174" stroke="#3a3a3a" strokeWidth="1.5" />
      <text x="100" y="195" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontWeight="500" fill={body} letterSpacing="0.6">
        CLUELY
      </text>
      <line x1="72" y1="202" x2="128" y2="202" stroke={accent} strokeWidth="0.3" />
      <text x="100" y="213" textAnchor="middle" fontSize="5" fontFamily="sans-serif" fill={accent} letterSpacing="1.4">
        VISITOR · TEAM
      </text>
      <text x="100" y="223" textAnchor="middle" fontSize="5" fontFamily="sans-serif" fill={accent} letterSpacing="1.4">
        SOHO · NYC · 2024
      </text>
    </svg>
  );
}
