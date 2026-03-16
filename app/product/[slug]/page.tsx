import Image from 'next/image';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to shop
          </Link>
          <span>{source}</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border-dark bg-night-card p-6 shadow-soft">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-night-surface">
              {image ? (
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-text-muted">
                  image unavailable
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-text-muted">
              editorial selection
            </p>
            <h1 className="mb-6 text-3xl font-semibold uppercase tracking-[0.12em] text-text-primary md:text-4xl">
              {title}
            </h1>
            <p className="mb-8 text-sm uppercase tracking-[0.25em] text-text-secondary">
              ${price}
            </p>

            <div className="space-y-4 text-sm uppercase tracking-[0.2em] text-text-muted">
              <p>Condition: curated</p>
              <p>Era: curated mix</p>
              <p>Shipping: based on seller</p>
            </div>

            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex items-center justify-center rounded-full bg-orange-glow px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-night-bg transition-colors hover:bg-orange-accent"
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
