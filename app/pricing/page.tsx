'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Reveal from '@/components/Reveal';

const FREE_FEATURES = [
  'unlimited natural-language search',
  'all 4 marketplaces, searched at once',
  'ai concierge, 3 chats per day',
  'price-drop tracking on 5 finds',
  'save favorites & shared boards',
  'campus mode',
];

const PREMIUM_FEATURES = [
  'unlimited ai concierge',
  'image search, find any piece by photo',
  'unlimited price-drop & restock alerts',
  'advanced filters & semantic ranking',
  'early access to new drops',
  'priority support',
];

function Check({ muted = false }: { muted?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
        muted ? 'bg-black/[0.06] text-black/40' : 'bg-black text-white'
      }`}
    >
      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function UpgradeCTA({ label }: { label: string }) {
  const cls =
    'group inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 font-naya-sans text-[12px] font-medium lowercase tracking-[0.12em] text-white transition-colors hover:bg-neutral-800';
  return (
    <Link href="/onboarding" className={cls}>
      {label}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const premiumPrice = yearly ? '4.99' : '5.99';

  return (
    <div className="min-h-screen bg-night-bg">
      <SiteHeader overHero active="/pricing" />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden bg-black">
        <div
          aria-hidden
          className="absolute inset-0 scale-105 bg-cover bg-center"
          style={{ backgroundImage: "url('/editorial/naya-pricing.png')" }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/55" />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-16 pt-40 text-center md:pb-20 md:pt-48">
          <p className="naya-enter naya-enter-1 font-naya-sans text-[10px] uppercase tracking-[0.3em] text-white/55">
            naya membership
          </p>
          <h1 className="naya-enter naya-enter-2 font-naya-serif mt-4 text-balance text-5xl font-light leading-[0.98] tracking-[-0.02em] text-white md:text-7xl">
            the smartest way to{' '}
            <span className="italic text-white/80">shop vintage.</span>
          </h1>
          <p className="naya-enter naya-enter-3 font-naya-sans mt-5 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-lg">
            the average naya member saves over $90 per find by buying second-hand.
            start free, upgrade when you want more.
          </p>

          {/* Billing toggle */}
          <div className="naya-enter naya-enter-4 mt-9 inline-flex items-center rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`font-naya-sans rounded-full px-5 py-2 text-[11px] lowercase tracking-[0.1em] transition-colors ${
                !yearly ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`font-naya-sans inline-flex items-center gap-2 rounded-full px-5 py-2 text-[11px] lowercase tracking-[0.1em] transition-colors ${
                yearly ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              yearly
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] tracking-[0.08em] ${yearly ? 'bg-black/10 text-black/70' : 'bg-white/15 text-white/70'}`}>
                save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="px-6 md:px-10">
        <div className="mx-auto -mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {/* Free */}
          <Reveal className="rounded-3xl border border-black/8 bg-white p-8 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.4)] md:p-10">
            <h2 className="font-naya-serif text-3xl font-light text-black">naya free</h2>
            <p className="font-naya-sans mt-2 text-[13px] text-black/50">
              everything you need to start shopping vintage smarter.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-naya-serif text-5xl font-light text-black">$0</span>
              <span className="font-naya-sans text-sm text-black/45">/month</span>
            </div>
            <Link
              href="/"
              className="font-naya-sans mt-7 inline-flex w-full items-center justify-center rounded-full border border-black/12 px-6 py-4 text-[12px] lowercase tracking-[0.12em] text-black/70 transition-colors hover:border-black/30 hover:text-black"
            >
              start shopping
            </Link>
            <ul className="mt-8 space-y-3.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="font-naya-sans flex gap-3 text-[13px] leading-snug text-black/70">
                  <Check muted />
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Premium */}
          <Reveal
            delay={120}
            className="relative rounded-3xl border border-black/80 bg-[#0a0a0a] p-8 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.7)] md:p-10"
          >
            <span className="font-naya-sans absolute right-7 top-8 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] lowercase tracking-[0.12em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              most popular
            </span>
            <h2 className="font-naya-serif text-3xl font-light text-white">naya premium</h2>
            <p className="font-naya-sans mt-2 text-[13px] text-white/50">
              unlimited concierge, image search, and instant alerts.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-naya-serif text-5xl font-light text-white">${premiumPrice}</span>
              <span className="font-naya-sans text-sm text-white/45">/month</span>
            </div>
            <p className="font-naya-sans mt-1 h-4 text-[11px] tracking-[0.04em] text-white/40">
              {yearly ? 'billed annually at $59.88' : 'billed monthly · cancel anytime'}
            </p>
            <div className="mt-6">
              <UpgradeCTA label={CLERK_ENABLED ? 'sign up to upgrade' : 'get premium'} />
            </div>
            <p className="font-naya-sans mt-4 text-[11px] uppercase tracking-[0.2em] text-white/35">
              everything in free, plus
            </p>
            <ul className="mt-4 space-y-3.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="font-naya-sans flex gap-3 text-[13px] leading-snug text-white/80">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-black">
                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-14 text-center">
            <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/45">why members upgrade</p>
            <h2 className="font-naya-serif mt-3 text-4xl font-light leading-[1.05] text-black md:text-5xl">
              built to find the <span className="italic">one</span>, faster.
            </h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                t: 'one prompt, every market',
                d: 'describe a piece in plain english. naya searches eBay, Grailed, Depop, and Poshmark together and de-dupes the results.',
              },
              {
                t: 'never miss a drop',
                d: 'set alerts on a brand, size, or exact piece. premium members get unlimited price-drop and restock notifications.',
              },
              {
                t: 'find it by photo',
                d: 'upload a screenshot or runway shot. image search surfaces the closest real listings across the market.',
              },
            ].map((c) => (
              <Reveal key={c.t} className="rounded-2xl border border-black/8 bg-white p-7 naya-lift">
                <h3 className="font-naya-serif text-2xl font-light text-black">{c.t}</h3>
                <p className="font-naya-sans mt-3 text-[13px] leading-relaxed text-black/55">{c.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FAQ />

      <SiteFooter />
    </div>
  );
}

const FAQS = [
  {
    q: 'is naya free to use?',
    a: 'yes. naya free includes unlimited natural-language search across all four marketplaces, the ai concierge (3 chats a day), and price tracking on 5 finds. premium unlocks unlimited concierge, image search, and alerts.',
  },
  {
    q: 'does naya sell clothing directly?',
    a: 'no. naya is a search layer over the resale market. you buy directly from the seller on eBay, Grailed, Depop, or Poshmark. we just make the entire market searchable from one prompt.',
  },
  {
    q: 'can i cancel anytime?',
    a: 'always. premium is month-to-month (or annual if you want the discount). cancel in one click and you keep premium until the end of your billing period.',
  },
  {
    q: 'how much can i actually save?',
    a: 'members save over $90 per find on average versus buying new, by surfacing the lowest in-market price and flagging price drops before they sell out.',
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-night-bg px-6 pb-28 md:px-10">
      <div className="mx-auto max-w-3xl">
        <Reveal className="mb-10 text-center">
          <h2 className="font-naya-serif text-4xl font-light text-black md:text-5xl">questions, answered.</h2>
        </Reveal>
        <div className="divide-y divide-black/10 border-y border-black/10">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <button
                key={f.q}
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full flex-col items-start gap-3 py-6 text-left"
              >
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="font-naya-serif text-xl font-light text-black md:text-2xl">{f.q}</span>
                  <span className={`font-naya-sans shrink-0 text-2xl font-light text-black/40 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </div>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <p className="overflow-hidden font-naya-sans max-w-2xl text-[14px] leading-relaxed text-black/55">{f.a}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
