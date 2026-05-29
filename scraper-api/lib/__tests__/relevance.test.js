const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreRelevance, filterByRelevance, getQueryTokens } = require('../relevance');

test('getQueryTokens: drops stop words and tokens < 2 chars', () => {
  const tokens = getQueryTokens('a vintage Nike t-shirt for the gym');
  // stop words: a, for, the, vintage -> dropped
  // length>=2 -> 't-shirt' becomes 't-shirt' (split on whitespace only)
  assert.deepEqual(new Set(tokens), new Set(['nike', 't-shirt', 'gym']));
});

test('scoreRelevance: identical title and query scores 1', () => {
  assert.equal(scoreRelevance('Nike Air Jordan 1', 'Nike Air Jordan 1'), 1);
});

test('scoreRelevance: completely unrelated title scores 0', () => {
  const s = scoreRelevance('Random Pottery Mug', 'Nike Air Jordan 1');
  assert.ok(s < 0.1, `expected ~0, got ${s}`);
});

test('scoreRelevance: brand tokens are weighted higher than common tokens', () => {
  // Title contains the brand token "nike" but misses "vintage". Score should
  // still be relatively high because nike is brand-weighted.
  const s = scoreRelevance('Nike Hoodie Brand New', 'vintage nike hoodie');
  assert.ok(s > 0.5, `expected brand-weighted score > 0.5, got ${s}`);
});

test('scoreRelevance: item-type mismatch penalty downgrades wrong category', () => {
  // Query asks for a jacket, title is shoes. Same brand tokens.
  const s = scoreRelevance('Carhartt boots leather', 'carhartt jacket');
  assert.ok(s < 0.4, `expected penalized < 0.4, got ${s}`);
});

test('scoreRelevance: returns 0 on missing inputs', () => {
  assert.equal(scoreRelevance('', 'something'), 0);
  assert.equal(scoreRelevance('something', ''), 0);
});

test('filterByRelevance: drops items below threshold but keeps platform-searched items', () => {
  const results = [
    { title: 'Nike Air Jordan 1 Retro',     _platformSearched: false },
    { title: 'Random Pottery Mug',          _platformSearched: false },
    { title: 'short-slug',                  _platformSearched: true  }, // truncated slug, but platform did its own search
  ];
  const out = filterByRelevance(results, 'nike air jordan', 0.4);
  const titles = out.map((r) => r.title);
  assert.ok(titles.includes('Nike Air Jordan 1 Retro'));
  assert.ok(titles.includes('short-slug'));
  assert.ok(!titles.includes('Random Pottery Mug'));
});

test('filterByRelevance: stable on empty / missing inputs', () => {
  assert.deepEqual(filterByRelevance([], 'x'), []);
  assert.deepEqual(filterByRelevance(null, 'x'), null);
  assert.deepEqual(filterByRelevance([{ title: 'x' }], ''), [{ title: 'x' }]);
});
