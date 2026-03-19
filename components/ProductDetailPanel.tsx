'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { addToCart, isInCart } from './CartPanel';
import { addToCompare, isInCompare, removeFromCompare } from '@/lib/compare';
import { addPriceAlert, getPriceAlerts } from '@/lib/priceAlerts';
import { recordProductView } from '@/lib/impact';
import { deriveCompleteTheLookQuery } from '@/lib/completeTheLook';

interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
}

interface ProductDetailPanelProps {
  product: Product | null;
  onClose: () => void;
}

function extractMeta(title: string) {
  const lower = title.toLowerCase();
  const sizeMatch = lower.match(/\b(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,2}x\d{1,2}|\d{2})\b/);
  const colorMatch = lower.match(/\b(black|white|blue|red|green|navy|grey|gray|brown|beige|pink|cream|tan|olive|burgundy|maroon)\b/);
  const materialMatch = lower.match(/\b(denim|cotton|leather|wool|polyester|silk|linen|nylon|fleece|corduroy|velvet|suede)\b/);
  const conditionMatch = lower.match(/\b(new|nwt|like new|excellent|good|fair|pre-owned|used|vintage)\b/);

  return {
    size: sizeMatch ? sizeMatch[0].toUpperCase() : 'Regular',
    color: colorMatch ? colorMatch[0].charAt(0).toUpperCase() + colorMatch[0].slice(1) : 'N/A',
    material: materialMatch ? materialMatch[0].charAt(0).toUpperCase() + materialMatch[0].slice(1) : 'N/A',
    condition: conditionMatch ? 'Pre-owned - ' + (conditionMatch[0].charAt(0).toUpperCase() + conditionMatch[0].slice(1)) : 'Pre-owned',
  };
}

export default function ProductDetailPanel({ product, onClose }: ProductDetailPanelProps) {
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [generatedTryOnImage, setGeneratedTryOnImage] = useState<string | null>(null);
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [tryOnStep, setTryOnStep] = useState<'idle' | 'uploaded' | 'generating' | 'done'>('idle');
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!product) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  useEffect(() => {
    if (!product) {
      setTryOnImage(null);
      setGeneratedTryOnImage(null);
      setTryOnError(null);
      setIsGeneratingTryOn(false);
      setTryOnStep('idle');
    } else {
      recordProductView();
    }
  }, [product]);

  const router = useRouter();
  const [inCompare, setInCompare] = useState(false);
  const [alertAdded, setAlertAdded] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');

  useEffect(() => {
    if (product) {
      setInCompare(isInCompare(product.url));
      setAlertPrice(String(Math.round(product.price * 0.9)));
    }
  }, [product]);

  const handleTryOnUpload = (file: File | null) => {
    if (!file) return;
    setTryOnError(null);
    setGeneratedTryOnImage(null);
    setTryOnStep('uploaded');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTryOnImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateTryOn = async () => {
    if (!product || !tryOnImage || isGeneratingTryOn) return;
    setIsGeneratingTryOn(true);
    setTryOnError(null);
    setTryOnStep('generating');

    try {
      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImage: tryOnImage,
          garmentImage: product.image,
          garmentTitle: product.title,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Try-on generation failed.');
      }

      if (!payload?.resultImage) {
        throw new Error('No generated image returned.');
      }

      setGeneratedTryOnImage(payload.resultImage);
      setTryOnStep('done');
    } catch (error) {
      setTryOnError(error instanceof Error ? error.message : 'Unable to generate try-on right now.');
      setTryOnStep('uploaded');
    } finally {
      setIsGeneratingTryOn(false);
    }
  };

  const handleReset = () => {
    setTryOnImage(null);
    setGeneratedTryOnImage(null);
    setTryOnError(null);
    setTryOnStep('idle');
  };

  const handleShareProduct = async () => {
    if (!product) return;
    const slug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const shareUrl = `${window.location.origin}/product/${slug || 'item'}?title=${encodeURIComponent(product.title)}&price=${product.price.toFixed(2)}&image=${encodeURIComponent(product.image)}&url=${encodeURIComponent(product.url)}&source=${product.source}`;
    const shareData = {
      title: product.title,
      text: `found this for $${product.price.toFixed(0)} on naya`,
      url: shareUrl,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  };

  if (!product) return null;

  const meta = extractMeta(product.title);

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/40" onClick={onClose}></div>
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[#f7f5f2]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative aspect-[3/4] w-full shrink-0 bg-neutral-200">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
            unoptimized
          />
        </div>

        <div className="flex-1 px-6 py-6">
          <h2 className="font-naya-serif line-clamp-3 text-2xl font-light text-black">
            {product.title}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/50">
            {product.source}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-black">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-lg text-black/35 line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
            <span className="rounded-full bg-black/5 px-4 py-1.5 text-xs font-medium text-black/70">
              {meta.condition}
            </span>
          </div>

          {/* Is this a good deal? */}
          {(product.originalPrice || product.discountPercent) && (
            <div className="mt-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800/80">
                is this a good deal?
              </p>
              {product.originalPrice && product.originalPrice > product.price ? (
                <p className="mt-1 text-sm text-emerald-800">
                  Typical retail: ${product.originalPrice.toFixed(0)}. You&apos;re paying ${product.price.toFixed(0)} —{' '}
                  {product.discountPercent && product.discountPercent >= 50 ? (
                    <span className="font-semibold">great deal</span>
                  ) : product.discountPercent && product.discountPercent >= 30 ? (
                    <span className="font-semibold">good deal</span>
                  ) : (
                    <span className="font-semibold">fair price</span>
                  )}
                </p>
              ) : (
                <p className="mt-1 text-sm text-emerald-800">
                  Price is in line with similar listings. Compare across platforms to find the best option.
                </p>
              )}
            </div>
          )}

          {/* Savings breakdown */}
          {product.discountPercent && product.discountPercent > 0 && product.originalPrice && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white">
                -{product.discountPercent}% off
              </span>
              <span className="text-sm font-medium text-emerald-700">
                You save ${(product.originalPrice - product.price).toFixed(2)}
              </span>
              {product.discountPercent >= 50 ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  Great Deal
                </span>
              ) : product.discountPercent >= 30 ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  Good Deal
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-black/50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                BRAND
              </div>
              <p className="mt-1 text-sm font-semibold text-black">{product.source}</p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-black/50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                SIZE
              </div>
              <p className="mt-1 text-sm font-semibold text-black">{meta.size}</p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-black/50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                MATERIAL
              </div>
              <p className="mt-1 text-sm font-semibold text-black">{meta.material}</p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-black/50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                COLOR
              </div>
              <p className="mt-1 text-sm font-semibold text-black">{meta.color}</p>
            </div>
          </div>

          {/* ── Try It On Section ── */}
          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/60">
                Virtual Try-On
              </p>
              {tryOnStep !== 'idle' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] uppercase tracking-[0.2em] text-black/40 transition-colors hover:text-black/70"
                >
                  Reset
                </button>
              )}
            </div>

            {tryOnStep === 'idle' && (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-black/12 bg-neutral-50 px-6 py-8 transition-colors hover:border-black/25 hover:bg-neutral-100">
                <svg className="h-8 w-8 text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V6m0 0l-3.75 3.75M12 6l3.75 3.75M4.5 15.75v1.125A2.625 2.625 0 007.125 19.5h9.75a2.625 2.625 0 002.625-2.625V15.75" />
                </svg>
                <span className="text-sm font-medium text-black/70">Upload your photo</span>
                <span className="text-[11px] text-black/40">Full-body photo works best</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleTryOnUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            {tryOnStep === 'uploaded' && tryOnImage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-black/45">Your Photo</p>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
                      <img src={tryOnImage} alt="Your uploaded photo" className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-black/45">Garment</p>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
                      <Image src={product.image} alt={product.title} fill className="object-cover" sizes="20vw" unoptimized />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTryOn}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Generate AI Fit
                </button>
                {tryOnError && (
                  <p className="text-center text-xs text-red-600">{tryOnError}</p>
                )}
              </div>
            )}

            {tryOnStep === 'generating' && (
              <div className="flex flex-col items-center justify-center gap-4 py-10">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-black/10 border-t-black"></div>
                </div>
                <p className="text-sm font-medium text-black/70">Creating your AI fit...</p>
                <p className="text-[11px] text-black/40">This takes 15-30 seconds</p>
              </div>
            )}

            {tryOnStep === 'done' && generatedTryOnImage && (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
                  <img
                    src={generatedTryOnImage}
                    alt="AI virtual try-on result"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={generatedTryOnImage}
                    download="naya-try-on.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-black/5"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Save Image
                  </a>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-black/5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Try Another
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleTryOnUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── Purchase CTA ── */}
          <div className="mt-4 flex items-center gap-3">
            <a
              href={`/go?url=${encodeURIComponent(product.url)}&title=${encodeURIComponent(product.title)}&price=${product.price.toFixed(2)}&source=${encodeURIComponent(product.source)}&image=${encodeURIComponent(product.image)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              View on {product.source}
            </a>
            <AddToCartButton product={product} />
          </div>

          {/* ── Share ── */}
          <button
            type="button"
            onClick={handleShareProduct}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-medium text-black/60 transition-all hover:border-black/20 hover:text-black"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            {shareCopied ? 'link copied!' : 'share this find'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(isInCart(product.url));
  }, [product.url]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!added) {
          addToCart(product);
          setAdded(true);
        }
      }}
      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-medium transition-all ${
        added
          ? 'bg-black/5 text-black/40'
          : 'border border-black/15 bg-white text-black hover:bg-black/5'
      }`}
    >
      <svg className="h-4 w-4" fill={added ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={added ? 0 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      {added ? 'in cart' : 'add to cart'}
    </button>
  );
}
