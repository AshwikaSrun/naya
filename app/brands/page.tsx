import Link from 'next/link';

const brands = [
  'Ralph Lauren',
  'Polo Sport',
  'Carhartt',
  'Zara',
  'Levi\'s',
  'Nike',
  'Adidas',
  'New Balance',
  'Reebok',
  'Converse',
  'Champion',
  'Patagonia',
  'The North Face',
  'Columbia',
  'Arc\'teryx',
  'L.L.Bean',
  'Doc Martens',
  'Birkenstock',
  'Urban Outfitters',
  'Brandy Melville',
  'Dickies',
  'Lululemon',
  'Aritzia',
  'Free People',
  'Madewell',
  'Everlane',
  'Abercrombie',
  'Hollister',
  'American Eagle',
  'H&M',
  'Uniqlo',
  'Gap',
  'Banana Republic',
  'J.Crew',
  'COS',
  'ASOS',
  'Pacsun',
  'Princess Polly',
  'Reformation',
  'Mango',
  'Acne Studios',
  'Maison Margiela',
  'Rag & Bone',
  'AllSaints',
  'Guess',
  'True Religion',
  'Stussy',
  'Supreme',
  'Fear of God',
  'Stone Island',
  'Moncler',
  'Balenciaga',
  'Gucci',
  'Prada',
  'Burberry',
  'Coach',
  'Louis Vuitton',
  'Tommy Hilfiger',
  'Calvin Klein',
  'Diesel',
  'Helly Hansen',
  'UGG',
];

export default function BrandsPage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>brand directory</span>
        </div>

        <header className="relative mb-10 overflow-hidden border border-black/10 bg-white px-6 py-10 md:px-8">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/brands/disco.jpg')" }}
          ></div>
          <div className="absolute inset-0 bg-black/55"></div>
          <div className="relative max-w-3xl text-white">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/80">
              brands
            </p>
            <h1 className="mt-4 text-3xl font-[var(--font-playfair)] md:text-4xl">
              Search by brand
            </h1>
            <p className="mt-4 text-sm text-white/85 leading-relaxed">
              Jump straight to the labels you love. Every click runs a full second-hand
              search across the live marketplaces.
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link
              key={brand}
              href={`/?q=${encodeURIComponent(brand)}&platform=all`}
              className="flex items-center justify-between border border-black/10 bg-white px-5 py-4 text-left transition-all hover:border-black/30"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-text-primary font-[var(--font-playfair)]">
                {brand}
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
