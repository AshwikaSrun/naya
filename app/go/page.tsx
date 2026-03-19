'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function RedirectContent() {
  const params = useSearchParams();
  const url = params.get('url') || '';
  const title = params.get('title') || '';
  const price = params.get('price') || '';
  const source = params.get('source') || '';
  const image = params.get('image') || '';

  const [countdown, setCountdown] = useState(3);
  const [redirected, setRedirected] = useState(false);

  // Log click-through for analytics
  useEffect(() => {
    if (!url) return;
    fetch('/api/click-through', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, source: source || 'unknown', title: title || undefined, price: price || undefined }),
    }).catch(() => {});
  }, [url, source, title, price]);

  useEffect(() => {
    if (!url) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRedirected(true);
          window.location.href = url;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [url]);

  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-6">
        <div className="text-center">
          <p className="font-naya-serif text-2xl font-light text-black">no destination found</p>
          <Link href="/" className="mt-4 inline-block text-sm text-black/40 underline transition-colors hover:text-black">
            back to naya
          </Link>
        </div>
      </div>
    );
  }

  const platformColors: Record<string, string> = {
    ebay: '#E53238',
    grailed: '#000000',
    depop: '#FF2300',
    poshmark: '#7F0353',
  };

  const platformColor = platformColors[source.toLowerCase()] || '#000';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-6">
      <div className="w-full max-w-md">
        {/* Naya logo */}
        <div className="mb-10 text-center">
          <Link href="/" className="font-naya-serif text-2xl font-light tracking-tight text-black">
            naya
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 rounded-xl border border-black/5 bg-black/[0.02] px-4 py-3">
          <p className="text-center text-[11px] leading-relaxed text-black/50">
            You are leaving naya and going to an external marketplace. naya does not hold inventory, process payments, or ship products — your purchase will be completed on the external site.
          </p>
        </div>

        {/* Product preview card */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          {image && (
            <div className="relative aspect-square w-full bg-neutral-100">
              <Image
                src={image}
                alt={title || 'Product'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                unoptimized
              />
            </div>
          )}

          <div className="p-5">
            {title && (
              <p className="line-clamp-2 text-[14px] leading-snug text-black/80">{title}</p>
            )}
            <div className="mt-2 flex items-center justify-between">
              {price && (
                <span className="text-xl font-semibold text-black">${price}</span>
              )}
              {source && (
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: platformColor }}
                >
                  {source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Redirect status */}
        <div className="mt-8 text-center">
          {!redirected ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <div className="relative h-10 w-10">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="16"
                      fill="none"
                      stroke="#e5e5e5"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18" cy="18" r="16"
                      fill="none"
                      stroke="black"
                      strokeWidth="2"
                      strokeDasharray={`${(1 - countdown / 3) * 100.53} 100.53`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-black">
                    {countdown}
                  </span>
                </div>
              </div>
              <p className="text-sm text-black/50">
                taking you to <span className="font-medium capitalize text-black/70">{source || 'the listing'}</span>
              </p>
              <button
                type="button"
                onClick={() => { window.location.href = url; }}
                className="mt-4 text-[11px] uppercase tracking-[0.15em] text-black/30 underline transition-colors hover:text-black"
              >
                go now
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-black/50">redirecting...</p>
              <a
                href={url}
                className="mt-2 inline-block text-[11px] uppercase tracking-[0.15em] text-black/30 underline transition-colors hover:text-black"
              >
                click here if not redirected
              </a>
            </>
          )}
        </div>

        {/* Back to Naya */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.15em] text-black/25 transition-colors hover:text-black/50"
          >
            back to naya
          </Link>
        </div>

        {/* Powered by badge */}
        <div className="mt-6 text-center">
          <p className="text-[9px] uppercase tracking-[0.3em] text-black/15">
            found via naya — resale search engine
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
        <p className="font-naya-serif text-xl font-light text-black/30">loading...</p>
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}
