import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtPrice,
  capitalize,
  truncate,
  stripInternalFields,
  dealVerdict,
  formatPriceSummary,
  formatCrossListings,
  shouldRetry,
  backoffMs,
  callNayaApi,
  errorResult,
  CHECK_RESALE_PRICE,
  FIND_CROSS_LISTINGS,
} from '../lib.js';

// ── primitive formatters ────────────────────────────────────────────────

test('fmtPrice: integers print without decimal', () => {
  assert.equal(fmtPrice(45), '45');
});

test('fmtPrice: floats print with two decimals', () => {
  assert.equal(fmtPrice(45.5), '45.50');
});

test('fmtPrice: null / undefined / NaN return "N/A"', () => {
  assert.equal(fmtPrice(null), 'N/A');
  assert.equal(fmtPrice(undefined), 'N/A');
  assert.equal(fmtPrice(NaN), 'N/A');
  assert.equal(fmtPrice(Infinity), 'N/A');
});

test('capitalize: uppercases first character only', () => {
  assert.equal(capitalize('grailed'), 'Grailed');
  assert.equal(capitalize(''), '');
  assert.equal(capitalize(null), '');
});

test('truncate: leaves short strings alone', () => {
  assert.equal(truncate('hello', 100), 'hello');
});

test('truncate: cuts long strings with an ellipsis at position n', () => {
  const out = truncate('abcdefghij', 5);
  assert.equal(out.length, 5);
  assert.ok(out.endsWith('…'));
});

test('stripInternalFields: removes keys prefixed with underscore', () => {
  const out = stripInternalFields({ q: 'x', _source: 'live', count: 1 });
  assert.deepEqual(out, { q: 'x', count: 1 });
});

test('stripInternalFields: stable for non-objects', () => {
  assert.equal(stripInternalFields(null), null);
  assert.equal(stripInternalFields(undefined), undefined);
});

// ── tool descriptors ────────────────────────────────────────────────────

test('CHECK_RESALE_PRICE: schema requires only `query`', () => {
  assert.equal(CHECK_RESALE_PRICE.name, 'check_resale_price');
  assert.deepEqual(CHECK_RESALE_PRICE.inputSchema.required, ['query']);
  assert.equal(CHECK_RESALE_PRICE.inputSchema.additionalProperties, false);
});

test('FIND_CROSS_LISTINGS: source enum stays in sync with backend platforms', () => {
  const expected = ['grailed', 'poshmark', 'depop', 'vinted', 'ebay'];
  assert.deepEqual(FIND_CROSS_LISTINGS.inputSchema.properties.source.enum, expected);
});

// ── verdict + summary formatters ───────────────────────────────────────

test('dealVerdict: each score maps to a distinct natural-language verdict', () => {
  const d = { p25: 25, p75: 75 };
  assert.match(dealVerdict('good', d), /good deal/);
  assert.match(dealVerdict('fair', d), /fair/);
  assert.match(dealVerdict('high', d), /above market/);
});

test('formatPriceSummary: includes the query, count, median, and platform breakdown', () => {
  const text = formatPriceSummary({
    query: 'carhartt detroit jacket',
    count: 12,
    medianPrice: 60,
    p25: 45,
    p75: 80,
    priceRange: { min: 30, max: 120 },
    userPrice: 70,
    dealScore: 'fair',
    byPlatform: { grailed: { median: 75, count: 4 }, ebay: { median: 50, count: 8 } },
  });

  assert.match(text, /carhartt detroit jacket/);
  assert.match(text, /12 live listings across 2 platforms/);
  assert.match(text, /\$60/);
  assert.match(text, /Grailed: \$75 median \(4 listings\)/);
  assert.match(text, /Ebay: \$50 median \(8 listings\)/);
  // No internal fields leaked into the prose.
  assert.ok(!/_source/.test(text));
});

test('formatCrossListings: highlights the cheaper-than-current count when available', () => {
  const listings = [
    { title: 'X', price: 30, source: 'depop', url: 'https://depop.com/1' },
    { title: 'Y', price: 50, source: 'poshmark', url: 'https://poshmark.com/2' },
  ];
  const text = formatCrossListings(
    { query: 'jordan 1', currentPrice: 40, cheaperCount: 1 },
    listings,
    'grailed'
  );
  assert.match(text, /1 of 2.*cheaper than the \$40 grailed listing/);
  assert.match(text, /\$30.*on Depop.*✓ cheaper/);
  assert.match(text, /\$50.*on Poshmark/);
});

// ── retry classifier ───────────────────────────────────────────────────

test('shouldRetry: network errors are always retryable', () => {
  assert.equal(shouldRetry(null, new Error('ENOTFOUND')), true);
});

test('shouldRetry: 5xx responses are retryable', () => {
  assert.equal(shouldRetry({ status: 500 }, null), true);
  assert.equal(shouldRetry({ status: 502 }, null), true);
  assert.equal(shouldRetry({ status: 504 }, null), true);
});

test('shouldRetry: 408 / 425 timeouts are retryable', () => {
  assert.equal(shouldRetry({ status: 408 }, null), true);
  assert.equal(shouldRetry({ status: 425 }, null), true);
});

test('shouldRetry: 401 / 429 / 4xx are NOT retryable (caller-fixable)', () => {
  assert.equal(shouldRetry({ status: 401 }, null), false);
  assert.equal(shouldRetry({ status: 429 }, null), false);
  assert.equal(shouldRetry({ status: 400 }, null), false);
});

test('backoffMs: stays under cap and grows with attempt number', () => {
  // With deterministic rand=1, backoff hits the cap.
  const rand = () => 0.999;
  const d0 = backoffMs(0, { baseMs: 200, capMs: 4000, rand });
  const d1 = backoffMs(1, { baseMs: 200, capMs: 4000, rand });
  const d2 = backoffMs(2, { baseMs: 200, capMs: 4000, rand });
  const dCap = backoffMs(10, { baseMs: 200, capMs: 4000, rand });
  assert.ok(d0 < 200);  // floor(0.999 * 200)
  assert.ok(d1 < 400);
  assert.ok(d2 < 800);
  assert.ok(dCap <= 4000, `cap not respected: ${dCap}`);
});

test('backoffMs: full-jitter gives a delay in [0, exp]', () => {
  const out = new Set();
  for (let i = 0; i < 50; i++) {
    const d = backoffMs(3, { baseMs: 100, capMs: 100000 });
    assert.ok(d >= 0 && d <= 800);
    out.add(d);
  }
  // Sanity: jitter should produce >1 distinct value across many calls.
  assert.ok(out.size > 1);
});

// ── callNayaApi: integration over an injected fetch ─────────────────────

function mockFetch(sequence) {
  let i = 0;
  return async () => {
    const next = sequence[i++];
    if (typeof next === 'function') return next();
    return next;
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  };
}

test('callNayaApi: returns JSON on a 2xx response on first attempt', async () => {
  const data = await callNayaApi('/v1/price-check', { q: 'x' }, {
    apiBase: 'https://example.com',
    apiKey: 'naya_test',
    fetchImpl: mockFetch([jsonResponse(200, { hello: 'world' })]),
    sleep: async () => {},
  });
  assert.deepEqual(data, { hello: 'world' });
});

test('callNayaApi: retries on 5xx then succeeds', async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    if (attempts <= 2) return jsonResponse(503, {});
    return jsonResponse(200, { ok: true });
  };
  const data = await callNayaApi('/v1/price-check', { q: 'x' }, {
    apiBase: 'https://example.com',
    apiKey: 'naya_test',
    maxRetries: 3,
    fetchImpl,
    sleep: async () => {},
  });
  assert.equal(attempts, 3);
  assert.deepEqual(data, { ok: true });
});

test('callNayaApi: throws actionable error on 401 without retrying', async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    return jsonResponse(401, {});
  };
  await assert.rejects(
    callNayaApi('/v1/price-check', { q: 'x' }, {
      apiBase: 'https://example.com',
      apiKey: 'bad_key',
      fetchImpl,
      sleep: async () => {},
    }),
    /Invalid NAYA_API_KEY/
  );
  assert.equal(attempts, 1, '401 must not be retried');
});

test('callNayaApi: throws quota error on 429 without retrying', async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    return jsonResponse(429, { used: 1000, limit: 1000 });
  };
  await assert.rejects(
    callNayaApi('/v1/price-check', { q: 'x' }, {
      apiBase: 'https://example.com',
      apiKey: 'naya_test',
      fetchImpl,
      sleep: async () => {},
    }),
    /monthly rate limit exceeded \(1000\/1000/
  );
  assert.equal(attempts, 1);
});

test('callNayaApi: throws after maxRetries exhausted', async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts++;
    return jsonResponse(500, {});
  };
  await assert.rejects(
    callNayaApi('/v1/price-check', { q: 'x' }, {
      apiBase: 'https://example.com',
      apiKey: 'naya_test',
      maxRetries: 2,
      fetchImpl,
      sleep: async () => {},
    }),
    /naya API returned 500/
  );
  assert.equal(attempts, 3, 'should attempt initial + 2 retries');
});

test('errorResult: returns the documented MCP error envelope', () => {
  const r = errorResult('boom');
  assert.equal(r.isError, true);
  assert.equal(r.content[0].type, 'text');
  assert.equal(r.content[0].text, 'boom');
});
