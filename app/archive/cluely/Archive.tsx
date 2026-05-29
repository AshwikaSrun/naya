'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// CLUELY · VINTAGE ARCHIVE
// A naya editorial archive page treating Cluely (est. 2024) as a vintage brand.
// Fully self-contained — see page.tsx header for removal instructions.
// ─────────────────────────────────────────────────────────────────────────────

// Cluely's mark — a paper airplane inside a ring. Recreated as SVG so it can be
// embroidered / printed / aged onto the archive pieces. The "send" plane path is
// the same silhouette used in their product UI.
const PLANE = 'M2 21 L23 12 L2 3 L2 10 L17 12 L2 14 Z';

type Palette = { body: string; accent: string; logo: string };

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
    fit: 'boxy · true to era',
    lore:
      "Sourced from the personal collection of an early Cluely beta tester. Believed to be from the limited internal run distributed before the public launch in spring 2024. Heavy honest fade across the chest panel and consistent wash texture on the cuffs — exactly what you want from a piece this rare. Hood drawstrings intact.",
    garment: 'hoodie',
    palette: { body: '#2c2a28', accent: '#0e0e0e', logo: '#e7e1d2' },
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
      "From the rumored team-only logo drop that never reached retail. The off-white colorway shows the kind of soft yellowing that only happens with natural light exposure over time. Print sits crisp on the chest with no cracking. Tagged made in Los Angeles.",
    garment: 'tee',
    palette: { body: '#ece2c6', accent: '#d6cdb0', logo: '#c8102e' },
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
    garment: 'stickers',
    palette: { body: '#f3ecd8', accent: '#cdbf9e', logo: '#1a1a1a' },
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
    garment: 'quarterzip',
    palette: { body: '#3a3a3a', accent: '#1f1f1f', logo: '#e7e1d2' },
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
    garment: 'lanyard',
    palette: { body: '#1f4fa0', accent: '#143a78', logo: '#ece2c6' },
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Archive() {
  return (
    <div className="min-h-screen bg-night-bg">
      <SimpleHeader />
      <ArchiveHero />
      <CuratorNote />
      <CampaignPoster />

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-20 md:px-10 md:pb-16 md:pt-28">
        <div className="flex items-baseline justify-between border-b border-black/10 pb-5">
          <h2 className="font-naya-serif text-3xl font-light tracking-[-0.01em] text-black md:text-4xl">
            the collection
          </h2>
          <span className="font-naya-sans text-[10px] uppercase tracking-[0.24em] text-black/45">
            5 pieces · by offer
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="flex flex-col gap-20 md:gap-28">
          {ITEMS.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      <CareLabel />
      <ArchiveFooter />
    </div>
  );
}

// ─── Cluely mark ─────────────────────────────────────────────────────────────

function CluelyMark({
  className = '',
  color = 'currentColor',
  ring = true,
}: {
  className?: string;
  color?: string;
  ring?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      {ring && <circle cx="32" cy="32" r="29" stroke={color} strokeWidth="2.4" />}
      <g transform="rotate(-8 32 32)">
        <g transform="translate(18 18) scale(1.18)" fill={color}>
          <path d={PLANE} />
        </g>
      </g>
    </svg>
  );
}

/** Inline mark for use inside garment SVGs (200×240 space). */
function PlaneMark({
  cx,
  cy,
  r,
  color,
  ring = true,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  ring?: boolean;
}) {
  const scale = (r * 1.5) / 24;
  return (
    <g>
      {ring && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={Math.max(0.8, r * 0.11)} />
      )}
      <g transform={`rotate(-8 ${cx} ${cy})`}>
        <g transform={`translate(${cx - r * 0.82}, ${cy - r * 0.66}) scale(${scale})`} fill={color}>
          <path d={PLANE} />
        </g>
      </g>
    </g>
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
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:py-32">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/50">
          brand archive · vol. 01
        </p>

        <div className="mt-6 flex items-center gap-5 md:gap-7">
          <CluelyMark className="h-14 w-14 shrink-0 text-black md:h-20 md:w-20" />
          <h1 className="font-naya-serif text-6xl font-light leading-[0.9] tracking-[-0.02em] text-black md:text-8xl lg:text-[9rem]">
            Cluely.
          </h1>
        </div>

        <p className="font-naya-serif mt-4 text-2xl font-light italic text-black/65 md:text-3xl">
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

// ─── Curator's note (delivers the joke, deadpan) ─────────────────────────────

function CuratorNote() {
  return (
    <section className="border-b border-black/5 bg-white/40">
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-10 md:py-20">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/45">
          curator&apos;s note
        </p>
        <p className="font-naya-serif mt-5 text-xl font-light leading-[1.5] text-black/80 md:text-2xl md:leading-[1.5]">
          Cluely spent its first year becoming one of the most-talked-about companies in
          New York and — true to form — never released a single piece of merch. What
          follows is the archive that{' '}
          <span className="italic">should have existed</span>: deadstock and lightly-worn
          artifacts from the pre-IPO era, authenticated and catalogued by naya editorial.
        </p>
        <p className="font-naya-sans mt-6 text-[12px] uppercase tracking-[0.2em] text-black/40">
          — the archive desk
        </p>
      </div>
    </section>
  );
}

// ─── Campaign poster — Cluely's sky world, aged into a found vintage print ────

function CampaignPoster() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 md:px-10 md:pt-24">
      <div
        className="relative overflow-hidden rounded-2xl shadow-[0_10px_40px_-18px_rgba(20,40,80,0.5)]"
        style={{
          background:
            'linear-gradient(180deg, #2f63b4 0%, #4f8ad6 38%, #9cc1e6 64%, #ecdcb0 88%, #f3e6c2 100%)',
        }}
      >
        {/* Stars */}
        <div aria-hidden className="absolute inset-0">
          {[
            [12, 18],
            [22, 30],
            [34, 14],
            [48, 26],
            [70, 16],
            [82, 32],
            [90, 20],
            [60, 12],
          ].map(([l, t], i) => (
            <span
              key={i}
              className="absolute h-[2px] w-[2px] rounded-full bg-white"
              style={{ left: `${l}%`, top: `${t}%`, opacity: 0.55 }}
            />
          ))}
        </div>

        {/* Sun glow near horizon */}
        <div
          aria-hidden
          className="absolute right-[12%] top-[52%] h-40 w-40 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,247,224,0.95) 0%, rgba(255,236,189,0.55) 35%, rgba(255,236,189,0) 70%)',
          }}
        />

        {/* Mountains */}
        <svg
          viewBox="0 0 1000 240"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[55%] w-full"
        >
          <path
            d="M0 240 L0 150 L130 96 L250 150 L360 70 L500 158 L590 104 L720 168 L840 96 L930 150 L1000 120 L1000 240 Z"
            fill="#2a4f86"
            opacity="0.55"
          />
          <path
            d="M0 240 L0 188 L150 150 L300 196 L430 138 L560 192 L690 150 L820 196 L940 160 L1000 184 L1000 240 Z"
            fill="#1f3f6f"
            opacity="0.8"
          />
        </svg>

        {/* Content */}
        <div className="relative px-7 py-16 text-center md:px-12 md:py-24 lg:py-28">
          <div className="mb-7 flex items-center justify-center gap-2">
            <CluelyMark className="h-6 w-6 text-white" />
            <span className="font-naya-sans text-[11px] uppercase tracking-[0.34em] text-white/85">
              Cluely
            </span>
          </div>
          <h3 className="font-naya-serif mx-auto max-w-2xl text-3xl font-light leading-[1.12] tracking-[-0.01em] text-white drop-shadow-sm md:text-5xl">
            every wardrobe can use a little more{' '}
            <span className="italic">intelligence.</span>
          </h3>
          <p className="font-naya-sans mx-auto mt-6 max-w-md text-[12px] uppercase tracking-[0.26em] text-white/75">
            Spring 2024 campaign · archival print
          </p>
        </div>

        {/* Aged paper grain + sepia + vignette so it reads as a recovered print */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.16]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.85 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 52%, rgba(60,40,15,0.28) 100%)',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />

        {/* Corner caption */}
        <span className="font-naya-sans absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.2em] text-white/55">
          found condition · creasing consistent with storage
        </span>
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
          <dt className="text-black/35">fit</dt>
          <dd className="text-black/75">{item.fit}</dd>
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

// ─── Quirky woven care label ─────────────────────────────────────────────────

function CareLabel() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-8 md:px-10">
      <div className="mx-auto max-w-sm rounded-sm border border-black/15 bg-[#f4efe3] px-6 py-6 shadow-[0_2px_8px_-5px_rgba(0,0,0,0.3)]">
        <div className="mb-3 flex items-center justify-center gap-1.5">
          <CluelyMark className="h-3.5 w-3.5 text-black/70" />
          <span className="font-naya-sans text-[9px] uppercase tracking-[0.34em] text-black/60">
            Cluely
          </span>
        </div>
        <div className="space-y-1.5 text-center font-naya-sans text-[9px] uppercase tracking-[0.22em] text-black/55">
          <p>100% combed cotton · made in los angeles</p>
          <p>machine wash cold · do not tumble dry</p>
          <p>do not iron logo · undetectable on screen share</p>
          <p>est. 2024 · new york</p>
        </div>
      </div>
    </section>
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
          All pieces are sold as-is. Condition assessments are issued by naya editorial
          and are not guarantees. Cluely is not affiliated with naya, and these pieces are
          an affectionate work of fiction. This archive is curated, not commissioned.
          Direct offer inquiries to{' '}
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
      {/* embroidered chest mark */}
      <PlaneMark cx={100} cy={102} r={9} color={logo} />
      <text x="100" y="120" textAnchor="middle" fontSize="6" fontFamily="Georgia, serif" fontWeight="500" fill={logo} letterSpacing="1.6">
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
      {/* Supreme-style red box logo with the Cluely mark */}
      <rect x="64" y="104" width="72" height="30" fill={logo} />
      <PlaneMark cx={80} cy={119} r={8} color="#ffffff" />
      <text x="115" y="124" textAnchor="middle" fontSize="11" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="500" fill="#ffffff" letterSpacing="0.3">
        cluely
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
      {/* round mark sticker */}
      <circle cx="64" cy="74" r="24" fill={logo} />
      <PlaneMark cx={64} cy={74} r={13} color={body} ring />
      {/* dark wordmark sticker */}
      <rect x="98" y="54" width="62" height="38" fill="#1a1a1a" rx="3" />
      <PlaneMark cx={114} cy={73} r={8} color="#ece2c6" ring={false} />
      <text x="142" y="78" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontStyle="italic" fill="#ece2c6" letterSpacing="0.3">
        cluely
      </text>
      {/* big die-cut plane */}
      <rect x="98" y="112" width="62" height="60" fill={logo} stroke={accent} strokeWidth="0.5" />
      <PlaneMark cx={129} cy={142} r={20} color="#1a1a1a" ring={false} />
      {/* small round */}
      <circle cx="64" cy="142" r="24" fill="#1a1a1a" />
      <text x="64" y="140" textAnchor="middle" fontSize="6.5" fontFamily="Georgia, serif" fontStyle="italic" fill="#ece2c6" letterSpacing="0.3">
        cluely
      </text>
      <text x="64" y="150" textAnchor="middle" fontSize="4.5" fontFamily="sans-serif" fill="#ece2c6" letterSpacing="1.2">
        est · 2024
      </text>
      {/* footer strip */}
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
      {/* small embroidered mark, chest-right */}
      <PlaneMark cx={128} cy={96} r={8} color={logo} />
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
      {/* repeating wordmark down the strap */}
      <text x="78" y="80" fontSize="5.5" fontFamily="Georgia, serif" fontStyle="italic" fill={logo} opacity="0.8" letterSpacing="1" transform="rotate(2 78 80)">cluely</text>
      <text x="78" y="104" fontSize="5.5" fontFamily="Georgia, serif" fontStyle="italic" fill={logo} opacity="0.8" letterSpacing="1" transform="rotate(1 78 104)">cluely</text>
      <text x="78" y="128" fontSize="5.5" fontFamily="Georgia, serif" fontStyle="italic" fill={logo} opacity="0.8" letterSpacing="1">cluely</text>
      <text x="122" y="92" fontSize="5.5" fontFamily="Georgia, serif" fontStyle="italic" fill={logo} opacity="0.75" letterSpacing="1" transform="rotate(-1 122 92)">cluely</text>
      <text x="122" y="116" fontSize="5.5" fontFamily="Georgia, serif" fontStyle="italic" fill={logo} opacity="0.75" letterSpacing="1">cluely</text>
      {/* clip */}
      <rect x="92" y="160" width="16" height="14" fill="#8a8a8a" stroke="#3a3a3a" strokeWidth="0.5" />
      <rect x="94" y="162" width="12" height="2" fill="#3a3a3a" />
      {/* badge card */}
      <rect x="58" y="174" width="84" height="58" fill={logo} stroke={accent} strokeWidth="0.5" />
      <line x1="100" y1="166" x2="100" y2="174" stroke="#3a3a3a" strokeWidth="1.5" />
      <PlaneMark cx={74} cy={192} r={9} color={body} />
      <text x="120" y="190" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="500" fill={body} letterSpacing="0.3">cluely</text>
      <line x1="64" y1="204" x2="136" y2="204" stroke={accent} strokeWidth="0.3" />
      <text x="100" y="214" textAnchor="middle" fontSize="5" fontFamily="sans-serif" fill={accent} letterSpacing="1.4">VISITOR · TEAM</text>
      <text x="100" y="224" textAnchor="middle" fontSize="5" fontFamily="sans-serif" fill={accent} letterSpacing="1.4">SOHO · NYC · 2024</text>
    </svg>
  );
}
