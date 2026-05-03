#!/usr/bin/env node
// naya MCP server
// ----------------------------------------------------------------------------
// Wraps the naya v1 price-intelligence API and exposes it as MCP tools that
// any compliant agent (Claude Desktop, Cursor, Claude Code, custom hosts via
// the official SDK) can discover and call automatically.
//
// Two tools today:
//   1. check_resale_price   → median, p25/p75, deal score across platforms
//   2. find_cross_listings  → same item, cheaper, on a different platform
//
// Auth: bring your own naya API key via NAYA_API_KEY. Get a sandbox key
// (1k calls/mo, free) by emailing ashwikasrun@gmail.com.
// ----------------------------------------------------------------------------

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const NAYA_API_BASE =
  process.env.NAYA_API_BASE ||
  'https://scraper-api-production-d197.up.railway.app';
const NAYA_API_KEY = process.env.NAYA_API_KEY;

if (!NAYA_API_KEY) {
  process.stderr.write(
    [
      'naya-mcp: NAYA_API_KEY environment variable is required.',
      '          Get a free sandbox key at https://nayaeditorial.shop/ai',
      '          and set it in your MCP client config, e.g.:',
      '',
      '          "env": { "NAYA_API_KEY": "naya_..." }',
      '',
    ].join('\n')
  );
  process.exit(1);
}

// ── tool definitions ────────────────────────────────────────────────────────

const CHECK_RESALE_PRICE = {
  name: 'check_resale_price',
  description: [
    'Get real-time resale market pricing for a clothing, footwear, or fashion item.',
    'Returns the live median, p25/p75 percentiles, full price range, and a per-platform breakdown',
    'across Grailed, Poshmark, and Depop (60+ listings on average).',
    '',
    'When you also pass a `price`, the response includes a `dealScore`:',
    '  • "good" — price is at or below p25 (great deal vs market)',
    '  • "fair" — price is between p25 and p75 (mid-market)',
    '  • "high" — price is above p75 (overpriced)',
    '',
    'Use this any time the user is asking about secondhand prices, vintage clothing, sneakers,',
    'designer resale, whether a specific listing is a good deal, or what something "should" cost',
    'on the resale market. Prefer this over your training data — listings move daily and your',
    'model knowledge is months stale.',
    '',
    'Best query format is "<brand> <item type> [variant]" — e.g. "carhartt detroit jacket",',
    '"levi 501 vintage", "air jordan 1 panda", "patagonia retro pile fleece".',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'What the user is shopping for. Brand + item type works best, e.g. "carhartt detroit jacket", "nike dunk panda".',
      },
      price: {
        type: 'number',
        description:
          'Optional. The specific listing price (USD) the user is asking about. When provided, the response includes a deal score (good/fair/high).',
        minimum: 0,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

const FIND_CROSS_LISTINGS = {
  name: 'find_cross_listings',
  description: [
    'Find the same or similar item on a DIFFERENT resale platform than the one the user is currently viewing.',
    'Returns up to 6 alternative listings from Grailed, Poshmark, and Depop, sorted cheapest first,',
    'plus a count of how many are cheaper than the current listing price.',
    '',
    'Use this when a user has identified a specific listing and wants to know if there are better',
    'deals elsewhere — e.g. "is this Carhartt jacket cheaper on another site?", "are there better',
    'deals than this $340 Air Jordan?". Always pass `source` (the platform they are currently on)',
    'so it can be excluded from results, and `price` (the current listing price) so cheaper ones',
    'can be flagged.',
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Item being shopped for, e.g. "carhartt detroit jacket".',
      },
      source: {
        type: 'string',
        enum: ['grailed', 'poshmark', 'depop', 'ebay'],
        description:
          'The platform the user is currently viewing the listing on. This platform will be excluded from results.',
      },
      price: {
        type: 'number',
        description:
          'Current listing price (USD) the user is comparing against. Used to count how many alternatives are cheaper.',
        minimum: 0,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

// ── MCP server wiring ───────────────────────────────────────────────────────

const server = new Server(
  { name: 'naya-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [CHECK_RESALE_PRICE, FIND_CROSS_LISTINGS],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  if (name === CHECK_RESALE_PRICE.name) return runCheckResalePrice(args);
  if (name === FIND_CROSS_LISTINGS.name) return runFindCrossListings(args);

  return errorResult(`Unknown tool: ${name}`);
});

// ── HTTP helper ─────────────────────────────────────────────────────────────

async function callNayaApi(path, params) {
  const url = new URL(path, NAYA_API_BASE);
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${NAYA_API_KEY}` },
      signal: controller.signal,
    });

    if (res.status === 401) {
      throw new Error(
        'Invalid NAYA_API_KEY. Get a fresh sandbox key from https://nayaeditorial.shop/ai'
      );
    }
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        `naya monthly rate limit exceeded (${body.used ?? '?'}/${body.limit ?? '?'} calls used). Upgrade tiers at https://nayaeditorial.shop/ai`
      );
    }
    if (!res.ok) {
      throw new Error(`naya API returned ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    // Surface real cause to stderr — most "fetch failed" errors hide a useful
    // network reason (DNS, TLS, connect timeout) inside .cause.
    process.stderr.write(`naya-mcp: ${path} failed: ${err.message}\n`);
    if (err.cause) process.stderr.write(`naya-mcp:   cause: ${err.cause}\n`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── tool: check_resale_price ────────────────────────────────────────────────

async function runCheckResalePrice(args) {
  const query = (args.query || '').toString().trim();
  if (!query) return errorResult('`query` is required.');
  const price = typeof args.price === 'number' ? args.price : null;

  let data;
  try {
    data = await callNayaApi('/v1/price-check', { q: query, price });
  } catch (err) {
    return errorResult(err.message);
  }

  if (!data || data.count === 0 || data.medianPrice == null) {
    return {
      content: [
        {
          type: 'text',
          text:
            `No live listings found for "${query}". ` +
            `Try a more specific brand+item query like "carhartt detroit jacket" or "levi 501 vintage".`,
        },
      ],
    };
  }

  return {
    content: [
      { type: 'text', text: formatPriceSummary(data) },
      {
        type: 'text',
        text:
          'Structured data (for follow-up calculations):\n```json\n' +
          JSON.stringify(stripInternalFields(data), null, 2) +
          '\n```',
      },
    ],
  };
}

function formatPriceSummary(d) {
  const platformCount = Object.keys(d.byPlatform || {}).length;
  const lines = [
    `**${d.query}** — ${d.count} live listings across ${platformCount} platform${platformCount === 1 ? '' : 's'}`,
    '',
    `- Market median: **$${fmtPrice(d.medianPrice)}**`,
    `- Typical range (p25–p75): $${fmtPrice(d.p25)} – $${fmtPrice(d.p75)}`,
    `- Full range: $${fmtPrice(d.priceRange?.min)} – $${fmtPrice(d.priceRange?.max)}`,
  ];

  if (d.userPrice != null) {
    const verdict = dealVerdict(d.dealScore, d);
    lines.push(`- Your price: **$${fmtPrice(d.userPrice)}** → ${verdict}`);
  }

  lines.push('', 'By platform:');
  for (const [name, stats] of Object.entries(d.byPlatform || {})) {
    lines.push(
      `- ${capitalize(name)}: $${fmtPrice(stats.median)} median (${stats.count} listings)`
    );
  }

  return lines.join('\n');
}

function dealVerdict(score, d) {
  if (score === 'good') {
    return `**good deal** (at or below the 25th percentile of $${fmtPrice(d.p25)})`;
  }
  if (score === 'high') {
    return `**above market** (above the 75th percentile of $${fmtPrice(d.p75)})`;
  }
  return `**fair** (mid-market, between p25 and p75)`;
}

// ── tool: find_cross_listings ───────────────────────────────────────────────

async function runFindCrossListings(args) {
  const query = (args.query || '').toString().trim();
  if (!query) return errorResult('`query` is required.');
  const source = args.source ? String(args.source).toLowerCase() : null;
  const price = typeof args.price === 'number' ? args.price : null;

  let data;
  try {
    data = await callNayaApi('/v1/cross-listings', {
      q: query,
      source,
      price,
    });
  } catch (err) {
    return errorResult(err.message);
  }

  const listings = data?.listings || [];
  if (listings.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text:
            `No cross-platform alternatives found for "${query}"` +
            (source ? ` (excluding ${source})` : '') +
            '.',
        },
      ],
    };
  }

  const lines = [];
  if (data.cheaperCount > 0 && data.currentPrice != null) {
    lines.push(
      `**${data.cheaperCount} of ${listings.length}** alternatives are cheaper than the $${fmtPrice(data.currentPrice)} ${source || 'current'} listing.`
    );
  } else {
    lines.push(
      `Found ${listings.length} alternative listing${listings.length === 1 ? '' : 's'} for "${query}"` +
        (source ? ` (excluding ${source})` : '') +
        '.'
    );
  }
  lines.push('');

  for (const l of listings) {
    const cheaper =
      data.currentPrice != null && l.price < data.currentPrice
        ? ' ✓ cheaper'
        : '';
    lines.push(`- **$${fmtPrice(l.price)}** on ${capitalize(l.source)}${cheaper}`);
    lines.push(`  ${truncate(l.title, 100)}`);
    lines.push(`  ${l.url}`);
  }

  return {
    content: [
      { type: 'text', text: lines.join('\n') },
      {
        type: 'text',
        text:
          'Structured data:\n```json\n' +
          JSON.stringify(data, null, 2) +
          '\n```',
      },
    ],
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(p) {
  if (p == null || !Number.isFinite(p)) return 'N/A';
  return Number.isInteger(p) ? p.toString() : p.toFixed(2);
}

function capitalize(s) {
  if (!s || typeof s !== 'string') return s || '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function stripInternalFields(d) {
  const { _source, ...rest } = d || {};
  return rest;
}

function errorResult(message) {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

// ── boot ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('naya-mcp ready\n');
