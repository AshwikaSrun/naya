import Link from 'next/link';
import { ALL_CAMPUSES } from '@/lib/campuses';
import { CAMPUS_IMAGES } from '@/lib/fallbackProducts';

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

        <header className="relative mb-10 overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="grid grid-cols-3 gap-0.5 md:grid-cols-6">
            <div><img src="/finds/purduevintagehoodie.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/michiganvintagecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/Illinoisvintagehoodie.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/ohiostatevintagecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/pennstatevintagehoodie.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/wisconsinvintagecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/purduevintagecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/michiganvintagehoodie.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/indianavintagecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/texasvintagehoodie.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/arizonavintagecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
            <div><img src="/finds/michstatecrewneck.jpg" alt="" className="h-32 w-full object-cover md:h-40" /></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/90">campus mode</p>
            <h1 className="font-naya-serif mt-2 text-3xl font-light text-white md:text-4xl">
              find vintage gear for your school.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90">
              tap your school to get trending searches, vintage merch, and campus finds.
            </p>
          </div>
        </header>

        <p className="font-naya-sans mb-6 text-[10px] lowercase tracking-[0.2em] text-text-muted">campus mode available</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_CAMPUSES.map((c) => {
            const imgs = CAMPUS_IMAGES[c.slug];
            const imageSrc = imgs ? `/finds/${imgs.hoodie}` : '/finds/purduevintagehoodie.jpg';
            return (
              <Link
                key={c.slug}
                href={`/campus/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white transition-all hover:border-black/20 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                  <img
                    src={imageSrc}
                    alt={`Vintage ${c.name} gear`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="font-naya-serif text-base font-medium lowercase tracking-[0.08em] text-white">
                        {c.name.toLowerCase()}
                      </span>
                    </span>
                    <span className="text-[10px] lowercase tracking-[0.15em] text-white/80 transition-colors group-hover:text-white">
                      campus mode →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {otherSchools.length > 0 && (
          <>
            <p className="font-naya-sans mb-6 mt-14 text-[10px] lowercase tracking-[0.2em] text-text-muted">other schools</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherSchools.map((school) => (
                <Link
                  key={school.name}
                  href={`/?q=${encodeURIComponent(school.query)}&platform=all`}
                  className="group flex items-center justify-between rounded-xl border border-black/10 bg-white px-5 py-4 text-left transition-all hover:border-black/20 hover:shadow-sm"
                >
                  <span className="font-naya-serif text-sm font-medium lowercase tracking-[0.08em] text-text-primary">
                    {school.name.toLowerCase()}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.26em] text-text-muted transition-colors group-hover:text-text-primary">
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
