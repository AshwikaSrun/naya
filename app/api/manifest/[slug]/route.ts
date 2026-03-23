import { NextRequest, NextResponse } from 'next/server';

const BASE_MANIFEST = {
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  theme_color: '#faf9f7',
  background_color: '#faf9f7',
  categories: ['shopping', 'lifestyle'],
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
  screenshots: [],
};

const CAMPUS_MANIFESTS: Record<string, { name: string; description: string; start_url: string; shortcuts: { name: string; short_name: string; url: string; description: string }[] }> = {
  purdue: {
    name: 'naya — purdue vintage & deals',
    description: 'Vintage Purdue gear, Boiler Vintage, and second-hand finds — all in one search.',
    start_url: '/campus/purdue',
    shortcuts: [
      { name: 'Search Purdue', short_name: 'Search', url: '/campus/purdue', description: 'Search vintage Purdue gear' },
      { name: 'Deals', short_name: 'Deals', url: '/deals', description: 'Browse curated deals' },
      { name: 'Concierge', short_name: 'AI', url: '/app', description: 'Chat with the AI concierge' },
    ],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const campus = CAMPUS_MANIFESTS[slug.toLowerCase()];

  if (!campus) {
    return NextResponse.json({ error: 'Unknown campus' }, { status: 404 });
  }

  const manifest = {
    ...BASE_MANIFEST,
    name: campus.name,
    short_name: 'naya',
    description: campus.description,
    start_url: campus.start_url,
    shortcuts: campus.shortcuts,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
