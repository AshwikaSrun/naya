/**
 * Pure helpers + the naya HTTP client for the MCP server.
 *
 * Split out of index.js so we can unit-test the formatters, the
 * retry-with-backoff client, and the tool schemas without booting an
 * MCP server or spinning up the SDK.
 *
 * All formatting helpers must be deterministic given the same input —
 * no Date.now(), no Math.random() — to keep snapshot tests stable.
 */

// ── tool schemas (exported so listTools returns them verbatim) ───────────

/** @type {const} */
export const CHECK_RESALE_PRICE = {
  name: 'check_resale_price',
  description: [
    'Get real-time resale market pricing for a clothing, footwear, or fashion item.',
    'Returns the live median, p25/p75 percentiles, full price range, and a per-platform breakdown',
    'across Grailed, Poshmark, Depop, and Vinted (typically 60+ listings per query).',
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

/** @type {const} */
export const FIND_CROSS_LISTINGS = {
  name: 'find_cross_listings',
  description: [
    'Find the same or similar item on a DIFFERENT resale platform than the one the user is currently viewing.',
    'Returns up to 6 alternative listings from Grailed, Poshmark, Depop, and Vinted, sorted cheapest first,',
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
        enum: ['grailed', 'poshmark', 'depop', 'vinted', 'ebay'],
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

// ── formatting helpers ──────────────────────────────────────────────────

/** @param {number|null|undefined} p */
export function fmtPrice(p) {
  if (p == null || !Number.isFinite(p)) return 'N/A';
  return Number.isInteger(p) ? p.toString() : p.toFixed(2);
}

/** @param {string} s */
export function capitalize(s) {
  if (!s || typeof s !== 'string') return s || '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Truncate to at most `n` characters, appending a single ellipsis when cut.
 * @param {string} s
 * @param {number} n
 */
export function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Drop fields prefixed with `_` — never serialise internal state back to a model. */
export function stripInternalFields(d) {
  if (!d || typeof d !== 'object') return d;
  const out = {};
  for (const [k, v] of Object.entries(d)) {
    if (!k.startsWith('_')) out[k] = v;
  }
  return out;
}

/** Build a natural-language summary line from a price-check payload. */
export function dealVerdict(score, d) {
  if (score === 'good') {
    return `**good deal** (at or below the 25th percentile of $${fmtPrice(d.p25)})`;
  }
  if (score === 'high') {
    return `**above market** (above the 75th percentile of $${fmtPrice(d.p75)})`;
  }
  return `**fair** (mid-market, between p25 and p75)`;
}

/** Full markdown summary of a /v1/price-check response. */
export function formatPriceSummary(d) {
  const platformCount = Object.keys(d.byPlatform || {}).length;
  const lines = [
    `**${d.query}** — ${d.count} live listings across ${platformCount} platform${platformCount === 1 ? '' : 's'}`,
    '',
    `- Market median: **$${fmtPrice(d.medianPrice)}**`,
    `- Typical range (p25–p75): $${fmtPrice(d.p25)} – $${fmtPrice(d.p75)}`,
    `- Full range: $${fmtPrice(d.priceRange?.min)} – $${fmtPrice(d.priceRange?.max)}`,
  ];
  if (d.userPrice != null) {
    lines.push(`- Your price: **$${fmtPrice(d.userPrice)}** → ${dealVerdict(d.dealScore, d)}`);
  }
  lines.push('', 'By platform:');
  for (const [name, stats] of Object.entries(d.byPlatform || {})) {
    lines.push(
      `- ${capitalize(name)}: $${fmtPrice(stats.median)} median (${stats.count} listings)`
    );
  }
  return lines.join('\n');
}

/** Markdown summary of a /v1/cross-listings response. */
export function formatCrossListings(data, listings, source) {
  const lines = [];
  if (data.cheaperCount > 0 && data.currentPrice != null) {
    lines.push(
      `**${data.cheaperCount} of ${listings.length}** alternatives are cheaper than the $${fmtPrice(data.currentPrice)} ${source || 'current'} listing.`
    );
  } else {
    lines.push(
      `Found ${listings.length} alternative listing${listings.length === 1 ? '' : 's'} for "${data.query}"` +
        (source ? ` (excluding ${source})` : '') +
        '.'
    );
  }
  lines.push('');
  for (const l of listings) {
    const cheaper =
      data.currentPrice != null && l.price < data.currentPrice ? ' ✓ cheaper' : '';
    lines.push(`- **$${fmtPrice(l.price)}** on ${capitalize(l.source)}${cheaper}`);
    lines.push(`  ${truncate(l.title, 100)}`);
    lines.push(`  ${l.url}`);
  }
  return lines.join('\n');
}

/** MCP error envelope. */
export function errorResult(message) {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

// ── HTTP client with retry-with-jittered-backoff on 5xx ─────────────────

/**
 * Decide whether a fetch result should be retried.
 * 401 (auth) and 429 (quota) are user-fixable, so never retried.
 * @param {Response|null} res
 * @param {Error|null} err
 */
export function shouldRetry(res, err) {
  if (err) {
    // Network error, DNS failure, TLS handshake error — always retryable.
    return true;
  }
  if (!res) return true;
  if (res.status === 408 || res.status === 425 || res.status === 429) {
    // 429 is rate limit — we surface that to the user instead of retrying so
    // they get an immediate actionable message about quota.
    return res.status === 408 || res.status === 425;
  }
  return res.status >= 500 && res.status < 600;
}

/**
 * Exponential backoff with full jitter:
 *   delay = random(0, min(cap, base * 2^attempt))
 *
 * Full jitter is the AWS-recommended variant for high-concurrency clients;
 * it avoids thundering-herd retries when many MCP hosts hit the same
 * recovering API at once.
 *
 * @param {number} attempt   0-indexed retry number
 * @param {object} [opts]
 * @param {number} [opts.baseMs=200]
 * @param {number} [opts.capMs=4000]
 * @param {() => number} [opts.rand=Math.random]
 */
export function backoffMs(attempt, { baseMs = 200, capMs = 4000, rand = Math.random } = {}) {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(rand() * exp);
}

/**
 * Call the naya HTTP API with bearer auth, a 60s per-attempt timeout, and
 * retry-with-jittered-backoff for transient failures.
 *
 * @param {string} path
 * @param {Record<string, any>} params
 * @param {object} opts
 * @param {string} opts.apiBase
 * @param {string} opts.apiKey
 * @param {number} [opts.maxRetries=2]
 * @param {number} [opts.timeoutMs=60000]
 * @param {(ms: number) => Promise<void>} [opts.sleep]    Injected for tests.
 * @param {typeof fetch}                  [opts.fetchImpl] Injected for tests.
 */
export async function callNayaApi(path, params, opts) {
  const {
    apiBase,
    apiKey,
    maxRetries = 2,
    timeoutMs = 60000,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    fetchImpl = fetch,
  } = opts || {};

  const url = new URL(path, apiBase);
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt - 1));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res = null;
    let err = null;
    try {
      res = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
    } catch (e) {
      err = e;
    } finally {
      clearTimeout(timer);
    }

    // Surface fixed-up user errors immediately, never retried.
    if (res && res.status === 401) {
      throw new Error(
        'Invalid NAYA_API_KEY. Get a fresh sandbox key from https://nayaeditorial.shop/ai'
      );
    }
    if (res && res.status === 429) {
      let body = {};
      try { body = await res.json(); } catch { /* ignore */ }
      throw new Error(
        `naya monthly rate limit exceeded (${body.used ?? '?'}/${body.limit ?? '?'} calls used). Upgrade tiers at https://nayaeditorial.shop/ai`
      );
    }

    if (res && res.ok) {
      return await res.json();
    }

    if (!shouldRetry(res, err) || attempt === maxRetries) {
      if (err) {
        process.stderr.write(`naya-mcp: ${path} failed: ${err.message}\n`);
        if (err.cause) process.stderr.write(`naya-mcp:   cause: ${err.cause}\n`);
        throw err;
      }
      throw new Error(`naya API returned ${res.status} ${res.statusText}`);
    }

    lastError = err || new Error(`HTTP ${res.status}`);
  }
  throw lastError || new Error('callNayaApi: unreachable');
}
