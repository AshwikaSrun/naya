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

import {
  fmtPrice,
  capitalize,
  truncate,
  stripInternalFields,
  formatPriceSummary,
  dealVerdict,
  formatCrossListings,
  callNayaApi,
  errorResult,
  CHECK_RESALE_PRICE,
  FIND_CROSS_LISTINGS,
} from './lib.js';

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

// ── MCP server wiring ───────────────────────────────────────────────────────

const server = new Server(
  { name: 'naya-mcp', version: '0.2.0' },
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

// ── tool: check_resale_price ────────────────────────────────────────────────

async function runCheckResalePrice(args) {
  const query = (args.query || '').toString().trim();
  if (!query) return errorResult('`query` is required.');
  const price = typeof args.price === 'number' ? args.price : null;

  let data;
  try {
    data = await callNayaApi(
      '/v1/price-check',
      { q: query, price },
      { apiBase: NAYA_API_BASE, apiKey: NAYA_API_KEY }
    );
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

// ── tool: find_cross_listings ───────────────────────────────────────────────

async function runFindCrossListings(args) {
  const query = (args.query || '').toString().trim();
  if (!query) return errorResult('`query` is required.');
  const source = args.source ? String(args.source).toLowerCase() : null;
  const price = typeof args.price === 'number' ? args.price : null;

  let data;
  try {
    data = await callNayaApi(
      '/v1/cross-listings',
      { q: query, source, price },
      { apiBase: NAYA_API_BASE, apiKey: NAYA_API_KEY }
    );
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

  return {
    content: [
      { type: 'text', text: formatCrossListings(data, listings, source) },
      {
        type: 'text',
        text: 'Structured data:\n```json\n' + JSON.stringify(data, null, 2) + '\n```',
      },
    ],
  };
}

// ── boot ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write('naya-mcp ready\n');
