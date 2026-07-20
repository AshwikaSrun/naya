import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import { listingIdFromUrl } from '@/lib/agent/listingId';
import type { InteractionType } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';

const VALID: InteractionType[] = ['viewed', 'saved', 'dismissed', 'clicked_through', 'purchased'];

interface Body {
  interaction_type?: InteractionType;
  dwell_time_ms?: number;
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
  if (!db) return NextResponse.json({ ok: true, stored: false });

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const type = body.interaction_type;
  const listing = body.listing;
  if (!type || !VALID.includes(type)) return NextResponse.json({ error: 'bad_type' }, { status: 400 });
  if (!listing?.listing_url) return NextResponse.json({ error: 'missing_listing' }, { status: 400 });

  const listingId = listing.listing_id || listingIdFromUrl(listing.listing_url);
  const dwell =
    typeof body.dwell_time_ms === 'number' && body.dwell_time_ms >= 0
      ? Math.round(body.dwell_time_ms)
      : null;

  const { error } = await db.from('user_listing_interaction').insert({
    user_id: userId,
    listing_id: listingId,
    interaction_type: type,
    dwell_time_ms: dwell,
    listing_url: listing.listing_url,
    listing_title: listing.listing_title ?? null,
    brand: listing.brand ?? null,
    item_type: listing.item_type ?? null,
    price: listing.price ?? null,
    image_url: listing.image_url ?? null,
    source: listing.source ?? null,
    style_tags: listing.style_tags ?? [],
    era: listing.era ?? null,
  });

  if (error) {
    console.error('[agent/interaction] insert:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
