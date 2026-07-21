'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getDepopImageUrl, DEPOP_WIDTH_CARD } from '@/lib/depopImage';
import { sendFeedback, trackInteraction, type AgentMatch, type FeedbackListing } from '@/lib/agent/client';
import type { TasteProfile } from '@/lib/agent/types';
import { inferVibesFromTitle } from '@/lib/agent/vibes';

interface Props {
  match: AgentMatch;
  onResolved?: (listingId: string, feedback: 'liked' | 'dismissed') => void;
  onTasteUpdated?: (profile: Partial<TasteProfile>) => void;
}

function toFeedbackListing(m: AgentMatch): FeedbackListing {
  const title = m.listing_title ?? undefined;
  return {
    listing_id: m.listing_id,
    listing_url: m.listing_url,
    listing_title: title,
    brand: m.brand,
    item_type: m.item_type,
    price: m.price,
    image_url: m.image_url,
    source: m.source,
    style_tags: inferVibesFromTitle(title),
  };
}

export default function AgentMatchCard({ match, onResolved, onTasteUpdated }: Props) {
  const rawImage = match.image_url || '';
  const preferred =
    match.source === 'depop' ? getDepopImageUrl(rawImage, DEPOP_WIDTH_CARD) : rawImage;
  const [imageSrc, setImageSrc] = useState(preferred);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(match.user_feedback === 'liked');

  const brandKicker = (match.brand || match.item_type || match.source || '').toString();

  const handleOpen = () => {
    trackInteraction('clicked_through', toFeedbackListing(match));
    window.open(match.listing_url, '_blank', 'noopener,noreferrer');
  };

  const handleFeedback = async (feedback: 'liked' | 'dismissed', e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    if (feedback === 'liked') setSaved(true);
    const res = await sendFeedback(feedback, toFeedbackListing(match));
    if (res.ok && res.profile && feedback === 'liked') onTasteUpdated?.(res.profile);
    setBusy(false);
    if (feedback === 'dismissed') onResolved?.(match.listing_id, feedback);
    else onResolved?.(match.listing_id, 'liked');
  };

  return (
    <div className="group cursor-pointer" onClick={handleOpen}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-black/[0.04]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={match.listing_title || 'match'}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            unoptimized
            onError={() => {
              if (imageSrc !== rawImage) setImageSrc(rawImage);
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-black/20">no image</div>
        )}

        <div className="font-naya-sans absolute left-2.5 top-2.5 z-10 rounded-full bg-black/85 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          {match.trending ? 'popular' : `${Math.round(match.match_score * 100)}% match`}
        </div>

        {/* Save + dismiss — always visible on mobile, hover-reveal on desktop */}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
          <button
            type="button"
            aria-label={saved ? 'Saved' : 'Save this find'}
            title={saved ? 'saved' : 'save'}
            onClick={(e) => handleFeedback('liked', e)}
            className={`flex h-8 items-center justify-center gap-1 rounded-full px-2.5 shadow-sm backdrop-blur-sm transition-all ${
              saved ? 'bg-black text-white' : 'bg-white/95 text-black hover:bg-white'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="font-naya-sans text-[9px] lowercase tracking-[0.08em]">
              {saved ? 'saved' : 'save'}
            </span>
          </button>
          <button
            type="button"
            aria-label="Dismiss this match"
            onClick={(e) => handleFeedback('dismissed', e)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow-sm backdrop-blur-sm transition-all hover:bg-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <span className="font-naya-sans absolute bottom-2.5 right-2.5 rounded-sm bg-white/95 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-black opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          {match.source}
        </span>
      </div>

      <div className="px-0.5 pt-3 pb-1">
        <p className="font-naya-sans text-[10px] font-medium uppercase tracking-[0.18em] text-black/55">
          {brandKicker}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-naya-sans text-[15px] font-semibold tracking-[-0.01em] text-black">
            ${match.price != null ? match.price.toFixed(0) : '—'}
          </span>
          {match.original_price != null && match.price != null && match.original_price > match.price && (
            <span className="font-naya-sans text-[11px] text-black/35 line-through">
              ${match.original_price.toFixed(0)}
            </span>
          )}
        </div>
        <p className="font-naya-sans mt-1 line-clamp-1 text-[12px] leading-snug text-black/55">
          {match.listing_title}
        </p>
        {match.match_reason && (
          <p className="font-naya-sans mt-1.5 line-clamp-2 text-[11px] italic leading-snug text-black/45">
            {match.match_reason}
          </p>
        )}
      </div>
    </div>
  );
}
