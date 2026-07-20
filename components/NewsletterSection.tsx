'use client';

import Link from 'next/link';
import EmailSignup from './EmailSignup';
import Reveal from './Reveal';
import { GUIDES } from '@/lib/guides';

/**
 * Homepage newsletter fold: signup on the left, featured guide card on the
 * right (image + editorial copy). One job: get the reader onto the weekly
 * list or into a guide.
 */
export default function NewsletterSection() {
  const featured = GUIDES[0];

  return (
    <section className="bg-[#f7f4ee] px-6 py-28 md:px-10 md:py-44">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <Reveal>
              <p className="eyebrow text-black/40">the naya newsletter</p>
              <h2 className="font-naya-serif mt-5 text-balance text-[clamp(2.5rem,5vw,4.25rem)] font-light leading-[1.0] tracking-[-0.03em] text-black">
                field notes for{' '}
                <span className="italic text-black/55">better finds.</span>
              </h2>
              <p className="font-naya-sans mt-6 max-w-sm text-[15px] leading-[1.6] text-black/50">
                One thoughtful email a week. Keyword tricks, era cues, and the
                pieces worth hunting before they go.
              </p>
            </Reveal>

            <Reveal delay={120} className="mt-8 max-w-md">
              <div className="rounded-full border border-black/10 bg-white p-1.5 pl-2 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.45)]">
                <EmailSignup source="homepage_newsletter" variant="light" />
              </div>
              <p className="font-naya-sans mt-3 text-[11px] text-black/35">
                no spam, ever. unsubscribe anytime.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <Link
                href="/editorial"
                className="link-underline font-naya-sans mt-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-black/55 hover:text-black"
              >
                browse all guides
              </Link>
            </Reveal>
          </div>

          <Reveal variant="scale" delay={90} className="md:col-span-7">
            <Link
              href={`/editorial/${featured.slug}`}
              className="group grid overflow-hidden rounded-[28px] bg-white shadow-[0_40px_100px_-50px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-out hover:-translate-y-0.5 md:grid-cols-2"
            >
              <div className="relative aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>

              <div className="flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-12">
                <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-black/40">
                  <span className="font-naya-sans rounded-full border border-black/10 px-3 py-1">
                    {featured.category}
                  </span>
                  <span className="font-naya-sans">{featured.readTime}</span>
                </div>

                <h3 className="font-naya-serif mt-5 text-balance text-[clamp(1.55rem,2.6vw,2.15rem)] font-light leading-[1.12] tracking-[-0.02em] text-black">
                  {featured.title}
                </h3>

                <p className="font-naya-sans mt-4 text-[14px] leading-[1.55] text-black/50">
                  {featured.subtitle}
                </p>

                <span className="font-naya-sans mt-8 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-black/70">
                  read guide
                  <span
                    aria-hidden
                    className="h-px w-8 bg-black/35 transition-all duration-300 group-hover:w-12 group-hover:bg-black/70"
                  />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
