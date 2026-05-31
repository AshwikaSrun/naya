import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

// ─────────────────────────────────────────────────────────────────────────────
// NLP query understanding.
// Turns a shopper's natural-language request into a structured search spec so
// naya can search by meaning instead of by manual filters. Backed by Gemini's
// free tier (gemini-2.0-flash). If no key is configured it returns ok:false so
// the client silently falls back to the deterministic parser (lib/searchIntent).
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM = `You convert a shopper's natural-language request on naya, a vintage and secondhand fashion search engine, into a structured search spec.

Rules:
- "marketplaceQuery": the best high-signal keywords to search resale marketplaces (eBay, Grailed, Depop, Poshmark). Include brand + garment + key visual descriptors. NO price words, NO filler like "looking for" or "something". Keep it short and literal, like a power user's search.
- "priceMin"/"priceMax": integer USD bounds only if the user implies them ("under 100", "between 40 and 80", "cheap" => priceMax 60).
- "sizes": clothing sizes if mentioned (e.g. "M", "32", "10").
- "condition": "new", "used", or "any".
- "brands", "colors", "categories": only what is clearly implied.
- "era": e.g. "90s", "y2k", "2000s" if implied.
- "vibe": soft style tags for ranking (e.g. "blokecore", "quiet luxury", "skater", "coastal"), inferred from the request.
Only include fields you are confident about. Be concise.`;

const SCHEMA = {
  type: 'object',
  properties: {
    marketplaceQuery: { type: 'string' },
    priceMin: { type: 'number' },
    priceMax: { type: 'number' },
    sizes: { type: 'array', items: { type: 'string' } },
    condition: { type: 'string', enum: ['any', 'new', 'used'] },
    brands: { type: 'array', items: { type: 'string' } },
    colors: { type: 'array', items: { type: 'string' } },
    categories: { type: 'array', items: { type: 'string' } },
    era: { type: 'string' },
    vibe: { type: 'array', items: { type: 'string' } },
  },
  required: ['marketplaceQuery'],
} as const;

type Intent = {
  marketplaceQuery?: string;
  priceMin?: number;
  priceMax?: number;
  sizes?: string[];
  condition?: 'any' | 'new' | 'used';
  brands?: string[];
  colors?: string[];
  categories?: string[];
  era?: string;
  vibe?: string[];
};

// Small in-memory cache (per warm serverless instance) keyed by normalized query.
const cache = new Map<string, { intent: Intent; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key: string): Intent | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return e.intent;
}

function setCached(key: string, intent: Intent) {
  cache.set(key, { intent, ts: Date.now() });
  if (cache.size > 300) cache.delete(cache.keys().next().value as string);
}

function clampPrice(n: unknown): number | undefined {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return undefined;
  return Math.round(v);
}

function strArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
  return out.length ? out : undefined;
}

function normalizeIntent(raw: unknown, fallbackQuery: string): Intent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const condition =
    r.condition === 'new' || r.condition === 'used' ? r.condition : undefined;
  const intent: Intent = {
    marketplaceQuery:
      typeof r.marketplaceQuery === 'string' && r.marketplaceQuery.trim()
        ? r.marketplaceQuery.trim()
        : fallbackQuery,
    priceMin: clampPrice(r.priceMin),
    priceMax: clampPrice(r.priceMax),
    sizes: strArray(r.sizes),
    condition,
    brands: strArray(r.brands),
    colors: strArray(r.colors),
    categories: strArray(r.categories),
    era: typeof r.era === 'string' && r.era.trim() ? r.era.trim() : undefined,
    vibe: strArray(r.vibe),
  };
  // Drop incoherent price ranges.
  if (
    intent.priceMin !== undefined &&
    intent.priceMax !== undefined &&
    intent.priceMin > intent.priceMax
  ) {
    intent.priceMin = undefined;
  }
  return intent;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q')?.trim();
  if (!raw) {
    return NextResponse.json({ ok: false, reason: 'missing_query' }, { status: 400 });
  }
  if (raw.length > 200) {
    return NextResponse.json({ ok: false, reason: 'query_too_long' }, { status: 400 });
  }

  const key = raw.toLowerCase();
  const cached = getCached(key);
  if (cached) {
    return NextResponse.json({ ok: true, intent: cached, source: 'cache' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No key configured: tell the client to fall back to the deterministic parser.
    return NextResponse.json({ ok: false, reason: 'no_key' });
  }

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(9000),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: raw }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          // 2.5-flash "thinks" by default; for structured extraction that just
          // adds latency and tokens, so turn it off.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      console.error(`[parse-intent] Gemini ${res.status}`);
      return NextResponse.json({ ok: false, reason: 'upstream_error' });
    }

    const body = await res.json();
    const text: string | undefined =
      body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return NextResponse.json({ ok: false, reason: 'empty' });

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, reason: 'bad_json' });
    }

    const intent = normalizeIntent(parsed, raw);
    setCached(key, intent);
    return NextResponse.json({ ok: true, intent, source: 'gemini' });
  } catch (err) {
    console.error(`[parse-intent] failed: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, reason: 'exception' });
  }
}
