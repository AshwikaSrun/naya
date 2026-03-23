import Image from 'next/image';
import Link from 'next/link';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { getDepopImageUrl, DEPOP_WIDTH_HERO } from '@/lib/depopImage';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500'],
});

interface ProductPageProps {
  searchParams: Promise<{
    title?: string;
    price?: string;
    image?: string;
    url?: string;
    source?: string;
  }>;
}

export default async function ProductPage({ searchParams }: ProductPageProps) {
  const params = await searchParams;
  const title = params.title ?? 'Editorial piece';
  const price = params.price ?? '--';
  const image = params.image;
  const url = params.url;
  const source = params.source ?? 'source';

  /** Query string carries raw CDN URLs; Depop defaults are tiny — upscale for full-bleed hero */
  const heroImage =
    image &&
    (source.toLowerCase() === 'depop' || image.includes('depop.com'))
      ? getDepopImageUrl(image, DEPOP_WIDTH_HERO)
      : image;

  return (
    <div className={`${dmSans.className} min-h-screen bg-night-bg`}>
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-[10px] lowercase tracking-[0.15em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to shop
          </Link>
          <span className="lowercase">{source}</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border-dark bg-night-card p-6 shadow-soft">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-night-surface">
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] lowercase tracking-[0.15em] text-text-muted">
                  image unavailable
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-4 text-[10px] lowercase tracking-[0.2em] text-text-muted">
              editorial selection
            </p>
            <h1
              className={`${cormorant.className} mb-6 text-3xl font-light lowercase leading-snug tracking-[0.04em] text-text-primary md:text-4xl lg:text-[2.75rem]`}
            >
              {title}
            </h1>
            <p
              className={`${cormorant.className} mb-8 text-2xl font-light text-text-secondary md:text-3xl`}
            >
              {price.startsWith('$') ? price : `$${price}`}
            </p>

            <div className="space-y-3 text-xs font-light lowercase leading-relaxed tracking-[0.08em] text-text-muted">
              <p>condition: curated</p>
              <p>era: curated mix</p>
              <p>shipping: based on seller</p>
            </div>

            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex items-center justify-center rounded-full bg-orange-glow px-8 py-3.5 text-[11px] font-medium lowercase tracking-[0.12em] text-night-bg transition-colors hover:bg-orange-accent"
              >
                view on seller
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
