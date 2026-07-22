'use client';

import Link from 'next/link';
import Magnetic from './Magnetic';
import Reveal from './Reveal';

export default function ClosingCta() {
  return (
    <section className="relative overflow-hidden px-6 pb-32 pt-8 md:px-10 md:pb-44">
      {/* Full-bleed magazine backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/editorial/hero-magazines.png"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#f7f4ee]/78" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f4ee]/90 via-[#f7f4ee]/55 to-[#f7f4ee]/85" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center pt-16 text-center md:pt-24">
        <Reveal>
          <h2 className="font-naya-serif text-balance text-[clamp(2.75rem,6vw,5rem)] font-light leading-[1.0] tracking-[-0.035em] text-black">
            search once.{' '}
            <span className="italic text-black/55">get matched forever.</span>
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="font-naya-sans mt-8 max-w-md text-[14px] leading-relaxed text-black/50">
            join the waitlist, set up your taste profile, and try a short search trial.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Magnetic strength={0.4}>
              <Link href="/onboarding" className="pill-solid px-8 py-4 text-[13px]">
                join &amp; set up
              </Link>
            </Magnetic>
            <Link href="/finds" className="pill-outline px-7 py-4 text-[13px]">
              browse live finds
            </Link>
          </div>
        </Reveal>

        <Reveal delay={240}>
          <p className="font-naya-sans mt-10 text-[13px] text-black/55">updated hourly</p>
        </Reveal>
      </div>
    </section>
  );
}
