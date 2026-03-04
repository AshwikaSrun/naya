import Link from 'next/link';

const colleges = [
  { name: 'Illinois', query: 'Illinois merch' },
  { name: 'Indiana', query: 'Indiana merch' },
  { name: 'Iowa', query: 'Iowa merch' },
  { name: 'Maryland', query: 'Maryland merch' },
  { name: 'Michigan', query: 'Michigan merch' },
  { name: 'Michigan State', query: 'Michigan State merch' },
  { name: 'Minnesota', query: 'Minnesota merch' },
  { name: 'Nebraska', query: 'Nebraska merch' },
  { name: 'Northwestern', query: 'Northwestern merch' },
  { name: 'Ohio State', query: 'Ohio State merch' },
  { name: 'Oregon', query: 'Oregon merch' },
  { name: 'Penn State', query: 'Penn State merch' },
  { name: 'Purdue', query: 'Purdue merch' },
  { name: 'Rutgers', query: 'Rutgers merch' },
  { name: 'UCLA', query: 'UCLA merch' },
  { name: 'USC', query: 'USC merch' },
  { name: 'Washington', query: 'Washington merch' },
  { name: 'Wisconsin', query: 'Wisconsin merch' },
];

export default function CollegePage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>college collection</span>
        </div>

        <header className="relative mb-10 overflow-hidden border border-black/10 bg-white px-6 py-10 md:px-8">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/brands/purdue.jpg')" }}
          ></div>
          <div className="absolute inset-0 bg-black/55"></div>
          <div className="relative max-w-3xl text-white">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">
              big ten
            </p>
            <h1 className="mt-4 text-3xl font-[var(--font-playfair)] md:text-4xl">
              All colleges, one collection
            </h1>
            <p className="mt-4 text-sm text-white/85 leading-relaxed">
              Tap a school to search second-hand team gear and campus classics.
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colleges.map((school) => (
            <Link
              key={school.name}
              href={`/?q=${encodeURIComponent(school.query)}&platform=all`}
              className="flex items-center justify-between border border-black/10 bg-white px-5 py-4 text-left transition-all hover:border-black/30"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-text-primary font-[var(--font-playfair)]">
                {school.name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.26em] text-text-muted">
                search →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
