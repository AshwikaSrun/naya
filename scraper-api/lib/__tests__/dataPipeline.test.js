const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanTitle,
  validateItem,
  deduplicateResults,
  normalizeForDedup,
  tokenOverlap,
  tokensOf,
  runPipeline,
  runGlobalPipeline,
} = require('../dataPipeline');

// ── cleanTitle ───────────────────────────────────────────────────────────

test('cleanTitle: strips eBay "opens in new window" cruft', () => {
  assert.equal(
    cleanTitle('Vintage Carhartt Jacket Opens in new window', 'ebay'),
    'Vintage Carhartt Jacket'
  );
});

test('cleanTitle: removes condition tags (NWT/NWOT/EUC/GUC/pre-owned)', () => {
  for (const phrase of ['NWT', 'NWOT', 'EUC', 'GUC', 'Pre-owned']) {
    const out = cleanTitle(`Nike Hoodie ${phrase}`, 'ebay');
    assert.ok(!/nwt|nwot|euc|guc|pre[- ]owned/i.test(out), `did not strip ${phrase}: ${out}`);
  }
});

test('cleanTitle: strips leading listing IDs (6+ digit prefixes)', () => {
  assert.equal(cleanTitle('123456789 Vintage Tee', 'ebay'), 'Vintage Tee');
});

test('cleanTitle: depop slugs with only dashes are normalized to spaces', () => {
  assert.equal(
    cleanTitle('vintage-carhartt-detroit-jacket-xl', 'depop'),
    'Vintage Carhartt Detroit Jacket Xl'
  );
});

test('cleanTitle: ALL CAPS gets title-cased', () => {
  assert.equal(cleanTitle('VINTAGE LEVIS 501 JEANS', 'ebay'), 'Vintage Levis 501 Jeans');
});

test('cleanTitle: long titles are truncated to <= 120 chars', () => {
  const long = 'a'.repeat(200);
  const out = cleanTitle(long, 'ebay');
  assert.ok(out.length <= 120);
});

test('cleanTitle: empty input returns empty string, not crash', () => {
  assert.equal(cleanTitle('', 'ebay'), '');
  assert.equal(cleanTitle(null, 'ebay'), '');
  assert.equal(cleanTitle(undefined, 'ebay'), '');
});

// ── validateItem ─────────────────────────────────────────────────────────

const validItem = {
  title: 'Vintage Carhartt Detroit Jacket',
  url: 'https://www.ebay.com/itm/123',
  price: 45.99,
  image: 'https://i.ebayimg.com/xyz.jpg',
};

test('validateItem: accepts a complete listing', () => {
  assert.equal(validateItem(validItem), true);
});

test('validateItem: rejects when title < 5 chars', () => {
  assert.equal(validateItem({ ...validItem, title: 'hi' }), false);
});

test('validateItem: rejects price outside $1-$10000', () => {
  assert.equal(validateItem({ ...validItem, price: 0.5 }), false);
  assert.equal(validateItem({ ...validItem, price: 10001 }), false);
});

test('validateItem: rejects data: URI images and bad placeholders', () => {
  assert.equal(validateItem({ ...validItem, image: 'data:image/png;base64,xxx' }), false);
  assert.equal(validateItem({ ...validItem, image: 'https://example.com/placeholder.png' }), false);
  assert.equal(validateItem({ ...validItem, image: 'https://example.com/no-image.gif' }), false);
});

test('validateItem: rejects junk titles like "lot of 50"', () => {
  assert.equal(validateItem({ ...validItem, title: 'Lot of 50 vintage tees wholesale' }), false);
  assert.equal(validateItem({ ...validItem, title: 'Carhartt jacket for parts only' }), false);
});

// ── tokenization helpers ────────────────────────────────────────────────

test('normalizeForDedup: lowercases and strips punctuation', () => {
  assert.equal(normalizeForDedup('Carhartt "Detroit"!! Jacket-XL'), 'carhartt detroit jacketxl');
});

test('tokenOverlap: identical token sets score 1', () => {
  const a = tokensOf('carhartt detroit jacket');
  assert.equal(tokenOverlap(a, a), 1);
});

test('tokenOverlap: disjoint token sets score 0', () => {
  const a = tokensOf('carhartt detroit jacket');
  const b = tokensOf('nike air jordan');
  assert.equal(tokenOverlap(a, b), 0);
});

test('tokenOverlap: partial overlap is overlap / min-size', () => {
  // a: {carhartt, detroit, jacket}, b: {carhartt, jacket, blue}
  // shared = {carhartt, jacket} = 2; min size = 3; overlap = 2/3
  const a = tokensOf('carhartt detroit jacket');
  const b = tokensOf('carhartt jacket blue');
  assert.ok(Math.abs(tokenOverlap(a, b) - 2 / 3) < 1e-9);
});

// ── deduplicateResults ──────────────────────────────────────────────────

test('deduplicateResults: returns input unchanged when items <= 1', () => {
  assert.deepEqual(deduplicateResults([]), []);
  const one = [{ title: 'x', price: 1, source: 'ebay' }];
  assert.deepEqual(deduplicateResults(one), one);
});

test('deduplicateResults: never dedupes within the same source', () => {
  const items = [
    { title: 'Carhartt Detroit Jacket XL', price: 40, source: 'ebay' },
    { title: 'Carhartt Detroit Jacket XL', price: 42, source: 'ebay' },
  ];
  // Same source so even with 100% overlap, both stay.
  assert.equal(deduplicateResults(items).length, 2);
});

test('deduplicateResults: drops the more expensive duplicate across platforms', () => {
  const items = [
    // Within 20% price proximity (|50-45|/50 = 10%) so they get deduped.
    { title: 'Carhartt Detroit Jacket XL Vintage', price: 50, source: 'grailed' },
    { title: 'Carhartt Detroit Jacket XL Vintage', price: 45, source: 'ebay' },
  ];
  const out = deduplicateResults(items);
  assert.equal(out.length, 1);
  assert.equal(out[0].price, 45);
  assert.equal(out[0].source, 'ebay');
});

test('deduplicateResults: keeps both when prices differ by > 20%', () => {
  const items = [
    { title: 'Carhartt Detroit Jacket XL Vintage', price: 100, source: 'grailed' },
    { title: 'Carhartt Detroit Jacket XL Vintage', price: 40, source: 'ebay' },
  ];
  // 60% price gap -> almost certainly different listings/conditions.
  assert.equal(deduplicateResults(items).length, 2);
});

test('deduplicateResults: keeps both when token overlap < 0.7', () => {
  const items = [
    { title: 'Carhartt Detroit Jacket XL Vintage', price: 40, source: 'grailed' },
    { title: 'Nike Air Jordan Retro 1', price: 40, source: 'ebay' },
  ];
  assert.equal(deduplicateResults(items).length, 2);
});

test('deduplicateResults: scales (correctness preserved on 200 mixed items)', () => {
  const items = [];
  for (let i = 0; i < 100; i++) {
    items.push({
      title: `Vintage Carhartt Jacket Style ${i}`,
      price: 40 + (i % 10),
      source: 'ebay',
    });
    items.push({
      title: `Vintage Carhartt Jacket Style ${i}`,
      price: 40 + (i % 10) + 2, // within 20%, so the ebay copy wins
      source: 'grailed',
    });
  }
  const out = deduplicateResults(items);
  // Every pair should collapse to one — the cheaper ebay copy.
  assert.equal(out.length, 100);
  assert.ok(out.every((i) => i.source === 'ebay'));
});

// ── pipeline integration ─────────────────────────────────────────────────

test('runPipeline + runGlobalPipeline: cleans, validates, dedupes, ranks', () => {
  const raw = {
    ebay: [
      { title: 'VINTAGE CARHARTT DETROIT JACKET XL', price: 45, image: 'https://x.com/a.jpg', url: 'https://x.com/1', source: 'ebay' },
      { title: 'lot of 10 ebay tees wholesale',     price: 30, image: 'https://x.com/b.jpg', url: 'https://x.com/2', source: 'ebay' },
    ],
    grailed: [
      // Within 20% of ebay's $45 ($50 is +11%) so cross-platform dedup fires.
      { title: 'Vintage Carhartt Detroit Jacket XL', price: 50, image: 'https://x.com/c.jpg', url: 'https://x.com/3', source: 'grailed' },
    ],
  };
  const cleaned = runPipeline(raw, 'carhartt jacket');
  // Junk wholesale title dropped by validateItem.
  assert.equal(cleaned.ebay.length, 1);
  // ALL CAPS got title-cased.
  assert.equal(cleaned.ebay[0].title, 'Vintage Carhartt Detroit Jacket Xl');

  const final = runGlobalPipeline(cleaned, 'carhartt jacket');
  // Cross-platform dedup keeps the cheaper ebay copy.
  const totalKept = (final.ebay?.length || 0) + (final.grailed?.length || 0);
  assert.equal(totalKept, 1);
  assert.equal(final.ebay.length, 1);
  assert.equal(final.grailed.length, 0);
});
