import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import { listingIdFromUrl } from '@/lib/agent/listingId';
import { inferVibesFromTitle } from '@/lib/agent/vibes';
import { applySaveToTasteProfile } from '@/lib/agent/updateTasteFromSave';
import { detectEra } from '@/lib/vocab';

export const dynamic = 'force-dynamic';

interface FeedbackBody {
  feedback?: 'liked' | 'dismissed';
  listing?: {
    listing_id?: string;
    listing_url?: string;
    listing_title?: string;
    brand?: string | null;
    item_type?: string | null;
    price?: number | null;
    image_url?: string | null;
    source?: string | null;
    style_tags?: string[];
    era?: string | null;
  };
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: FeedbackBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const feedback = body.feedback;
  const listing = body.listing;
  if (feedback !== 'liked' && feedback !== 'dismissed') {
    return NextResponse.json({ error: 'bad_feedback' }, { status: 400 });
  }
  if (!listing?.listing_url) return NextResponse.json({ error: 'missing_listing' }, { status: 400 });

  const listingId = listing.listing_id || listingIdFromUrl(listing.listing_url);
  const title = listing.listing_title ?? '';
  // Infer vibes from the title so saves teach cottagecore/preppy/etc. even when
  // the client didn't send style_tags.
  const style_tags = Array.from(
    new Set([...(listing.style_tags ?? []), ...inferVibesFromTitle(title)]),
  ).slice(0, 4);
  const era = listing.era || detectEra(title.toLowerCase()) || null;

  // 1) Record the explicit signal for the taste-profile rollup (Job 2).
  const interaction = {
    user_id: userId,
    listing_id: listingId,
    interaction_type: feedback === 'liked' ? 'saved' : 'dismissed',
    listing_url: listing.listing_url,
    listing_title: listing.listing_title ?? null,
    brand: listing.brand ?? null,
    item_type: listing.item_type ?? null,
    price: listing.price ?? null,
    image_url: listing.image_url ?? null,
    source: listing.source ?? null,
    style_tags,
    era,
  };
  const { error: intErr } = await db.from('user_listing_interaction').insert(interaction);
  if (intErr) console.error('[agent/feedback] interaction insert:', intErr.message);

  // 2) Reflect the feedback on the match row so the feed hides/keeps it.
  const { error: matchErr } = await db
    .from('agent_match')
    .update({ user_feedback: feedback })
    .eq('user_id', userId)
    .eq('listing_id', listingId);
  if (matchErr) console.error('[agent/feedback] match update:', matchErr.message);

  // 3) On save, immediately nudge the taste profile (brands + vibes).
  let profile = null;
  if (feedback === 'liked') {
    profile = await applySaveToTasteProfile(db, userId, {
      listing_title: title,
      brand: listing.brand,
      item_type: listing.item_type,
      price: listing.price,
      style_tags,
      era,
    });
  }

  return NextResponse.json({
    ok: true,
    inferred_vibes: style_tags,
    profile: profile
      ? {
          preferred_brands: profile.preferred_brands,
          style_tags: profile.style_tags,
          preferred_categories: profile.preferred_categories,
          era_preference: profile.era_preference,
          price_ceiling: profile.price_ceiling,
        }
      : undefined,
  });
}
