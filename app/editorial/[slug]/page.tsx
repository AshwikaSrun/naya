import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import GuideToc from '@/components/GuideToc';
import GuideIcon from '@/components/GuideIcon';
import { GUIDES, getGuide } from '@/lib/guides';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Guide not found · naya' };
  return {
    title: `${guide.title} · naya`,
    description: guide.excerpt,
    openGraph: { title: guide.title, description: guide.excerpt, images: [guide.image], type: 'article' },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-night-bg">
      <SiteHeader overHero active="/editorial" />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden bg-black">
        <div
          aria-hidden
          className="absolute inset-0 scale-105 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url('${guide.image}')` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-[#0a0a0a]" />
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-36 md:pb-20 md:pt-44">
          <Link
            href="/editorial"
            className="font-naya-sans inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-white"
          >
            <span aria-hidden>←</span> the newsletter
          </Link>
          <div className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/55">
            <span className="font-naya-sans inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white/80">
              <GuideIcon name={guide.icon} className="h-3.5 w-3.5" />
              {guide.category}
            </span>
            <span className="font-naya-sans">{guide.readTime}</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span className="font-naya-sans">{guide.date}</span>
          </div>
          <h1 className="font-naya-serif mt-5 text-balance text-4xl font-light leading-[1.02] tracking-[-0.01em] text-white md:text-6xl">
            {guide.title}
          </h1>
          <p className="font-naya-sans mt-5 max-w-2xl text-[15px] leading-relaxed text-white/70 md:text-lg">
            {guide.subtitle}
          </p>
        </div>
      </section>

      {/* ── Body + TOC ── */}
      <section className="px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_15rem]">
          <article className="max-w-2xl">
            {guide.sections.map((s) => (
              <div key={s.id} id={s.id} className="scroll-mt-28 [&:not(:first-child)]:mt-12">
                <h2 className="font-naya-serif text-3xl font-light leading-tight text-black md:text-4xl">
                  {s.heading}
                </h2>
                {s.body.map((p, i) => (
                  <p key={i} className="font-naya-sans mt-4 text-[15px] leading-[1.75] text-black/65">
                    {p}
                  </p>
                ))}
              </div>
            ))}

            {/* CTA band */}
            <div className="mt-16 rounded-3xl border border-black/8 bg-white p-8 md:p-10">
              <p className="font-naya-sans text-[10px] uppercase tracking-[0.24em] text-black/40">try it now</p>
              <h3 className="font-naya-serif mt-3 text-3xl font-light leading-[1.05] text-black md:text-4xl">
                put this into practice with naya.
              </h3>
              <p className="font-naya-sans mt-4 max-w-md text-[14px] leading-relaxed text-black/55">
                describe the piece you want and naya searches the entire vintage market at once,
                scored for quality and de-duped. start free.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="group font-naya-sans inline-flex items-center gap-2 rounded-full bg-black px-6 py-3.5 text-[12px] lowercase tracking-[0.12em] text-white transition-colors hover:bg-neutral-800"
                >
                  start shopping
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/pricing"
                  className="font-naya-sans inline-flex items-center rounded-full border border-black/12 px-6 py-3.5 text-[12px] lowercase tracking-[0.12em] text-black/70 transition-colors hover:border-black/30 hover:text-black"
                >
                  see pricing
                </Link>
              </div>
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <GuideToc sections={guide.sections} />
            </div>
          </aside>
        </div>
      </section>

      {/* ── Related ── */}
      <section className="border-t border-black/8 px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.24em] text-black/40">related guides</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {related.map((g) => (
              <Link
                key={g.slug}
                href={`/editorial/${g.slug}`}
                className="naya-lift group flex items-center gap-5 rounded-2xl border border-black/8 bg-white p-5"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image} alt={g.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="min-w-0">
                  <p className="font-naya-sans text-[10px] uppercase tracking-[0.16em] text-black/40">{g.category}</p>
                  <h3 className="font-naya-serif mt-1 text-xl font-light leading-tight text-black">{g.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
