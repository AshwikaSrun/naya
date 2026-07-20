import Link from 'next/link';

const COLS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: 'product',
    links: [
      { href: '/finds', label: 'shop' },
      { href: '/app', label: 'concierge' },
      { href: '/pricing', label: 'pricing' },
      { href: '/college', label: 'campus' },
    ],
  },
  {
    title: 'learn',
    links: [
      { href: '/editorial', label: 'newsletter' },
      { href: '/brands', label: 'brands' },
      { href: '/insights', label: 'insights' },
    ],
  },
  {
    title: 'company',
    links: [
      { href: '/privacy', label: 'privacy' },
      { href: '/terms', label: 'terms' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#0a0a0a] px-6 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-naya-serif text-2xl font-light lowercase tracking-[0.14em] text-white">naya</span>
              <span className="font-naya-sans translate-y-[-0.35em] rounded-full bg-white/12 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-white/65">
                beta
              </span>
            </div>
            <p className="font-naya-sans mt-4 max-w-xs text-sm leading-relaxed text-white/45">
              your AI stylist for the entire vintage market. describe it, and naya finds it
              across every marketplace at once.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="font-naya-sans text-[10px] uppercase tracking-[0.24em] text-white/35">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-naya-sans text-[13px] lowercase tracking-[0.04em] text-white/65 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-7 md:flex-row md:items-center">
          <span className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-white/35">
            &copy; 2026 naya editorial · new york
          </span>
          <a
            href="mailto:nayaeditorialshop@gmail.com"
            className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-white/70"
          >
            nayaeditorialshop@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
