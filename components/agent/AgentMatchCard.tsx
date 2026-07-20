'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getDepopImageUrl, DEPOP_WIDTH_CARD } from '@/lib/depopImage';
import { sendFeedback, trackInteraction, type AgentMatch, type FeedbackListing } from '@/lib/agent/client';

interface Props {
  match: AgentMatch;
  onResolved?: (listingId: string, feedback: 'liked' | 'dismissed') => void;
}

function toFeedbackListing(m: AgentMatch): FeedbackListing {
  return {
    listing_id: m.listing_id,
    listing_url: m.listing_url,
    listing_title: m.listing_title ?? undefined,
    brand: m.brand,
    item_type: m.item_type,
    price: m.price,
    image_url: m.image_url,
    source: m.source,
  };
}

export default function AgentMatchCard({ match, onResolved }: Props) {
  const rawImage = match.image_url || '';
  const preferred =
    match.source === 'depop' ? getDepopImageUrl(rawImage, DEPOP_WIDTH_CARD) : rawImage;
  const [imageSrc, setImageSrc] = useState(preferred);
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(match.user_feedback === 'liked');

  const brandKicker = (match.brand || match.item_type || match.source || '').toString();

  const handleOpen = () => {
    trackInteraction('clicked_through', toFeedbackListing(match));
    window.open(match.listing_url, '_blank', 'noopener,noreferrer');
  };

  const handleFeedback = async (feedback: 'liked' | 'dismissed', e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    if (feedback === 'liked') setLiked(true);
    await sendFeedback(feedback, toFeedbackListing(match));
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

        {/* Match score chip — or a "popular" tag for generic trending picks */}
        <div className="font-naya-sans absolute left-2.5 top-2.5 z-10 rounded-full bg-black/85 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          {match.trending ? 'popular' : `${Math.round(match.match_score * 100)}% match`}
        </div>

        {/* Feedback controls */}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Like this match"
            onClick={(e) => handleFeedback('liked', e)}
            className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all ${
              liked ? 'bg-black text-white' : 'bg-white/95 text-black hover:bg-white'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.682l-7.682-7.318a4.5 4.5 0 010-6.364z" />
            </svg>
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
