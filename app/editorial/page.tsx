import Link from 'next/link';

export default function EditorialPage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>editorial</span>
        </div>

        <header className="mb-10 border-b border-black/10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent-pink">
            editorial
          </p>
          <h1 className="mt-4 text-3xl text-text-primary font-[var(--font-playfair)] md:text-4xl">
            Second-hand, styled for campus life
          </h1>
          <p className="mt-4 text-sm text-text-secondary leading-relaxed">
            Curated edits that keep your wardrobe smart, affordable, and low-waste.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-black/10 bg-white p-8 text-left">
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent-pink">
              featured editorial
            </p>
            <h2 className="mt-4 text-3xl text-text-primary font-[var(--font-playfair)]">
              Campus-ready essentials
            </h2>
            <p className="mt-4 text-sm text-text-secondary leading-relaxed">
              Focus on quality staples that last: denim, vintage knits, and easy layers
              you can wear everywhere.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {['everyday denim', 'easy layers', 'budget finds'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="border border-black/10 bg-white p-8 text-left">
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent-green">
              style notes
            </p>
            <ul className="mt-4 space-y-4 text-sm text-text-secondary">
              <li>Prioritize quality, not hype.</li>
              <li>Mix vintage with basics for easy fits.</li>
              <li>Buy fewer, wear longer.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
