import Link from 'next/link';
import { ALL_CAMPUSES } from '@/lib/campuses';

const otherSchools = [
  { name: 'Iowa', query: 'Iowa merch' },
  { name: 'Maryland', query: 'Maryland merch' },
  { name: 'Minnesota', query: 'Minnesota merch' },
  { name: 'Nebraska', query: 'Nebraska merch' },
  { name: 'Northwestern', query: 'Northwestern merch' },
  { name: 'Oregon', query: 'Oregon merch' },
  { name: 'Rutgers', query: 'Rutgers merch' },
  { name: 'UCLA', query: 'UCLA merch' },
  { name: 'USC', query: 'USC merch' },
  { name: 'Washington', query: 'Washington merch' },
];

export default function CollegePage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>campus collection</span>
        </div>

        <header className="relative mb-10 overflow-hidden border border-black/10 bg-white px-6 py-10 md:px-8">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/brands/purdue.jpg')" }}
          ></div>
          <div className="absolute inset-0 bg-black/55"></div>
          <div className="relative max-w-3xl text-white">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">
              campus mode
            </p>
            <h1 className="font-naya-serif mt-4 text-3xl font-light md:text-4xl">
              find vintage gear for your school.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              tap your school to get trending searches, vintage merch, and campus finds.
            </p>
          </div>
        </header>

        <p className="font-naya-sans mb-6 text-[10px] lowercase tracking-[0.2em] text-text-muted">campus mode available</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_CAMPUSES.map((c) => (
            <Link
              key={c.slug}
              href={`/campus/${c.slug}`}
              className="group flex items-center justify-between border border-black/10 bg-white px-5 py-4 text-left transition-all hover:border-black/30"
            >
              <span className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                <span className="font-naya-serif text-sm font-medium lowercase tracking-[0.08em] text-text-primary">
                  {c.name.toLowerCase()}
                </span>
              </span>
              <span className="text-[10px] lowercase tracking-[0.15em] text-text-muted transition-colors group-hover:text-text-primary">
                campus mode →
              </span>
            </Link>
          ))}
        </div>

        {otherSchools.length > 0 && (
          <>
            <p className="font-naya-sans mb-6 mt-14 text-[10px] lowercase tracking-[0.2em] text-text-muted">other schools</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherSchools.map((school) => (
                <Link
                  key={school.name}
                  href={`/?q=${encodeURIComponent(school.query)}&platform=all`}
                  className="flex items-center justify-between border border-black/10 bg-white px-5 py-4 text-left transition-all hover:border-black/30"
                >
                  <span className="font-naya-serif text-sm font-medium lowercase tracking-[0.08em] text-text-primary">
                    {school.name.toLowerCase()}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.26em] text-text-muted">
                    search →
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
