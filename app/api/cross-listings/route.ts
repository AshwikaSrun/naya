import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.trim();
  const currentSource = req.nextUrl.searchParams.get('source')?.toLowerCase().trim();
  const currentPrice = parseFloat(req.nextUrl.searchParams.get('price') || '0');

  if (!query) {
    return NextResponse.json({ error: 'Provide ?query=' }, { status: 400 });
  }

  const backendUrl = (process.env.SCRAPER_BACKEND_URL || BACKEND_URL).replace(/\/$/, '');
  const params = new URLSearchParams({ q: query, limit: '15', platform: 'all' });

  try {
    const res = await fetch(`${backendUrl}/search?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      return NextResponse.json({ listings: [] });
    }

    const body = await res.json();

    interface RawItem {
      title: string;
      price: number | string;
      url: string;
      image?: string;
    }

    const listings: {
      title: string;
      price: number;
      source: string;
      url: string;
      image: string;
    }[] = [];

    for (const [platform, items] of Object.entries(body.results || {})) {
      if (!Array.isArray(items)) continue;
      if (platform.toLowerCase() === currentSource) continue;

      for (const item of items as RawItem[]) {
        const p = typeof item.price === 'number' ? item.price : parseFloat(String(item.price));
        if (p <= 0) continue;
        listings.push({
          title: item.title || '',
          price: Math.round(p * 100) / 100,
          source: platform,
          url: item.url || '',
          image: item.image || '',
        });
      }
    }

    listings.sort((a, b) => a.price - b.price);

    const top = listings.slice(0, 6);
    const cheaperCount = currentPrice > 0 ? top.filter((l) => l.price < currentPrice).length : 0;

    return NextResponse.json({
      query,
      currentSource: currentSource || null,
      currentPrice: currentPrice || null,
      cheaperCount,
      listings: top,
    });
  } catch {
    return NextResponse.json({ listings: [] });
  }
}
