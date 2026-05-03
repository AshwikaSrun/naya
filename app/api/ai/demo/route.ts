import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

// Public, unauthenticated demo proxy for the /ai marketing page.
// Forwards to the Express /api/price-check handler which returns the new
// median/p25/p75/dealScore shape. Rate-limit naively in front by query length.
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();
  const price = req.nextUrl.searchParams.get('price')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Provide ?q=' }, { status: 400 });
  }
  if (query.length > 80) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  const backend = (process.env.SCRAPER_BACKEND_URL || BACKEND_URL).replace(/\/$/, '');
  const params = new URLSearchParams({ q: query });
  if (price && Number.isFinite(parseFloat(price))) params.set('price', price);

  try {
    const res = await fetch(`${backend}/api/price-check?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(28000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
    const body = await res.json();
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: 'Demo unavailable' }, { status: 503 });
  }
}
