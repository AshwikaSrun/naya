'use client';

import Link from 'next/link';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Get naya',
    links: [
      { label: 'Chrome extension', href: '/' },
      { label: 'iOS app', href: '/' },
    ],
  },
  {
    title: 'Shopping',
    links: [
      { label: 'Live finds', href: '/finds' },
      { label: 'Brands', href: '/brands' },
      { label: 'Deals', href: '/deals' },
      { label: 'Editorial', href: '/editorial' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Campus', href: '/college' },
      { label: 'Concierge', href: '/app' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: 'mailto:nayaeditorialshop@gmail.com' },
      { label: 'FAQ', href: '/' },
    ],
  },
];

function Social({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/[0.04] hover:text-black"
    >
      {children}
    </a>
  );
}

export default function PhiaFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#f7f4ee] px-6 pb-14 pt-24 md:px-10">
      {/* Watermark */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-6%] flex justify-center">
        <span className="font-naya-serif select-none text-[26vw] font-light leading-none tracking-[-0.03em] text-black/[0.04] md:text-[22vw]">
          naya
        </span>
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <span className="font-naya-serif text-3xl font-light lowercase tracking-[0.12em] text-black">naya</span>
            <p className="font-naya-sans mt-4 max-w-[16rem] text-[13px] leading-relaxed text-black/45">
              Your AI stylist for the entire resale market. One search across every marketplace.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-naya-sans text-[13px] font-medium text-black">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="font-naya-sans text-[13px] text-black/45 transition-colors hover:text-black"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-black/[0.07] pt-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1">
            <Social label="X (Twitter)">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </Social>
            <Social label="Instagram">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" /></svg>
            </Social>
            <Social label="LinkedIn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 002.5 6 2.5 2.5 0 005 8.5 2.5 2.5 0 007.5 6 2.5 2.5 0 004.98 3.5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.35c0-1.27-.02-2.9-1.77-2.9s-2.04 1.38-2.04 2.8V21H9z" /></svg>
            </Social>
          </div>
          <p className="font-naya-sans text-[11px] tracking-[0.02em] text-black/35">
            © 2026 naya · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
