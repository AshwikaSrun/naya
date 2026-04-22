'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { CampusConfig } from '@/lib/campuses';

function pickCampusSet(all: CampusConfig[]) {
  const wanted = ['michigan', 'purdue', 'texas', 'ohio-state', 'wisconsin'] as const;
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const picked: CampusConfig[] = [];
  for (const slug of wanted) {
    const c = bySlug.get(slug);
    if (c) picked.push(c);
  }
  if (picked.length < 3) {
    for (const c of all) {
      if (picked.length >= 3) break;
      if (!picked.some((p) => p.slug === c.slug)) picked.push(c);
    }
  }
  return picked.slice(0, 3);
}

export default function CampusModeTeaser(props: { campuses: CampusConfig[] }) {
  const { campuses } = props;
  const featured = useMemo(() => pickCampusSet(campuses), [campuses]);

  return (
    <section className="bg-night-bg px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/55">
                campus mode
              </p>
              <h2 className="font-naya-serif mt-3 text-3xl font-light leading-[1.05] tracking-[-0.01em] text-black md:text-5xl">
                see what people at{' '}
                <span className="italic text-black/80">your school</span>{' '}
                are buying right now.
              </h2>
              <p className="font-naya-sans mt-3 max-w-2xl text-sm font-light leading-relaxed text-black/60">
                social proof + identity. tap a school to explore what&rsquo;s trending on that campus this week.
              </p>
            </div>

            <Link
              href="/college"
              className="font-naya-sans inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-white transition-all hover:bg-black/80"
            >
              choose your campus →
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:mt-10 md:grid-cols-3">
            {featured.map((c) => (
              <Link
                key={c.slug}
                href={`/campus/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-night-bg p-5 text-left transition-all hover:-translate-y-0.5 hover:border-black/15 hover:shadow-sm"
              >
                {/* School-color aura — soft radial tint, subtle so text stays readable */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.5]"
                  aria-hidden
                  style={{
                    background: `radial-gradient(600px circle at 15% 0%, ${c.color}28, transparent 55%)`,
                  }}
                />
                {/* Colored accent stripe on the left */}
                <span
                  className="pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-r-sm"
                  style={{ background: c.color }}
                  aria-hidden
                />

                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                        <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/55">
                          trending at {c.name.toLowerCase()}
                        </p>
                      </div>
                      <p className="font-naya-serif mt-2 truncate text-2xl font-light lowercase text-black">
                        {c.name.toLowerCase()}
                      </p>
                    </div>
                    <span className="text-black/25 transition-transform group-hover:translate-x-0.5">→</span>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {c.defaultTrending.slice(0, 3).map((t) => (
                      <div
                        key={t.query}
                        className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-left"
                      >
                        <span className="h-1 w-1 rounded-full" style={{ background: c.color }} />
                        <span className="font-naya-sans truncate text-[11px] lowercase text-black/75">
                          {t.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
