import Link from 'next/link';

const featuredCategories: Array<{ title: string; description: string; query: string }> = [
  {
    title: 'Vintage denim',
    description: '501s, cargos, and lived-in washes.',
    query: 'vintage denim',
  },
  {
    title: 'Outerwear',
    description: 'Leather, puffers, and layered classics.',
    query: 'vintage outerwear',
  },
  {
    title: 'Graphic tees',
    description: 'Band tees, sports, and pop culture.',
    query: 'vintage graphic tee',
  },
  {
    title: 'Accessories',
    description: 'Bags, belts, and statement jewelry.',
    query: 'vintage accessories',
  },
];

export default function FeaturedPage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>featured</span>
        </div>

        <header className="mb-10 border-b border-black/10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent-green">
            featured categories
          </p>
          <h1 className="mt-4 text-3xl text-text-primary font-[var(--font-playfair)] md:text-4xl">
            Shop the archive
          </h1>
          <p className="mt-4 text-sm text-text-secondary leading-relaxed">
            Curated categories that make second-hand shopping feel effortless.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {featuredCategories.map((category) => (
            <Link
              key={category.title}
              href={`/?q=${encodeURIComponent(category.query)}&platform=all`}
              className="group border border-black/10 bg-white p-6 text-left transition-all hover:border-black/30"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] text-text-muted">
                {category.title}
              </p>
              <p className="mt-3 text-lg text-text-primary font-[var(--font-playfair)]">
                {category.description}
              </p>
              <p className="mt-6 text-[11px] uppercase tracking-[0.26em] text-orange-glow">
                search now →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
