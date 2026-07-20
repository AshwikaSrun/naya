import Link from 'next/link';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Reveal from '@/components/Reveal';
import EmailSignup from '@/components/EmailSignup';
import GuideIcon from '@/components/GuideIcon';
import { GUIDES } from '@/lib/guides';

export const metadata: Metadata = {
  title: 'The naya Newsletter · Vintage Shopping Guides',
  description:
    'Expert guides, insider tips, and insights to master vintage and second-hand shopping. From keyword strategy to fit, authentication, and sustainable style.',
};

export default function NewsletterHub() {
  const [featured, ...rest] = GUIDES;

  return (
    <div className="min-h-screen bg-night-bg">
      <SiteHeader active="/editorial" />

      {/* ── Header ── */}
      <section className="px-6 pt-36 md:px-10 md:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="font-naya-sans text-[10px] uppercase tracking-[0.32em] text-black/45">
              learn &amp; explore
            </p>
            <h1 className="font-naya-serif mt-4 text-balance text-5xl font-light leading-[0.98] tracking-[-0.02em] text-black md:text-7xl">
              the naya <span className="italic">newsletter.</span>
            </h1>
            <p className="font-naya-sans mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-black/55 md:text-lg">
              expert guides, insider tips, and field notes to help you master vintage and
              second-hand shopping. written by the naya editorial team.
            </p>
          </Reveal>

          <Reveal delay={120} className="mx-auto mt-8 max-w-md">
            <div className="rounded-full border border-black/10 bg-white p-1.5 pl-2 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.5)]">
              <EmailSignup source="newsletter_hub" variant="light" />
            </div>
            <p className="font-naya-sans mt-2.5 text-[11px] text-black/35">
              one thoughtful email a week. no spam, ever.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="px-6 pt-16 md:px-10 md:pt-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <Link
              href={`/editorial/${featured.slug}`}
              className="naya-lift group grid overflow-hidden rounded-3xl border border-black/8 bg-white md:grid-cols-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden md:aspect-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center p-8 md:p-12">
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-black/40">
                  <span className="font-naya-sans rounded-full bg-black/[0.05] px-3 py-1">{featured.category}</span>
                  <span className="font-naya-sans">{featured.readTime}</span>
                </div>
                <h2 className="font-naya-serif mt-5 text-3xl font-light leading-[1.05] text-black md:text-4xl">
                  {featured.title}
                </h2>
                <p className="font-naya-sans mt-4 max-w-md text-[14px] leading-relaxed text-black/55">
                  {featured.subtitle}
                </p>
                <span className="font-naya-sans mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-black/70">
                  read guide
                  <span aria-hidden className="inline-block h-px w-8 bg-black/40 transition-all group-hover:w-14 group-hover:bg-black" />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {rest.map((g, i) => (
            <Reveal key={g.slug} delay={i * 90}>
              <Link
                href={`/editorial/${g.slug}`}
                className="naya-lift group flex h-full flex-col rounded-2xl border border-black/8 bg-white p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.05] text-black/70">
                    <GuideIcon name={g.icon} />
                  </span>
                  <span aria-hidden className="text-black/25 transition-all group-hover:translate-x-0.5 group-hover:text-black/60">→</span>
                </div>
                <div className="mt-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-black/40">
                  <span className="font-naya-sans">{g.category}</span>
                  <span className="h-1 w-1 rounded-full bg-black/20" />
                  <span className="font-naya-sans">{g.readTime}</span>
                </div>
                <h3 className="font-naya-serif mt-3 text-2xl font-light leading-[1.1] text-black">{g.title}</h3>
                <p className="font-naya-sans mt-3 flex-1 text-[13px] leading-relaxed text-black/55">{g.excerpt}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
