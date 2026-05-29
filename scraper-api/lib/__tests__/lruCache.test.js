const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LRUCache } = require('../lruCache');

function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    tick: (ms) => { t += ms; },
  };
}

test('LRUCache: rejects invalid options', () => {
  assert.throws(() => new LRUCache({ max: 0, ttlMs: 1000 }));
  assert.throws(() => new LRUCache({ max: 10, ttlMs: 0 }));
  assert.throws(() => new LRUCache({ max: -1, ttlMs: 1000 }));
});

test('LRUCache: get returns undefined for missing keys and counts as miss', () => {
  const c = new LRUCache({ max: 10, ttlMs: 1000 });
  assert.equal(c.get('absent'), undefined);
  assert.equal(c.stats.misses, 1);
  assert.equal(c.stats.hits, 0);
});

test('LRUCache: set + get returns the value and counts as hit', () => {
  const c = new LRUCache({ max: 10, ttlMs: 1000 });
  c.set('a', 1);
  assert.equal(c.get('a'), 1);
  assert.equal(c.stats.hits, 1);
});

test('LRUCache: expires entries past ttlMs', () => {
  const clock = makeClock();
  const c = new LRUCache({ max: 10, ttlMs: 100, now: clock.now });
  c.set('a', 1);
  clock.tick(99);
  assert.equal(c.get('a'), 1);
  clock.tick(2);
  assert.equal(c.get('a'), undefined);
  assert.equal(c.stats.expirations, 1);
});

test('LRUCache: evicts least-recently-used past max', () => {
  const c = new LRUCache({ max: 3, ttlMs: 100000 });
  c.set('a', 1);
  c.set('b', 2);
  c.set('c', 3);
  c.get('a'); // bump 'a' to most-recent
  c.set('d', 4); // should evict 'b' (LRU), not 'a'
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('c'), 3);
  assert.equal(c.get('d'), 4);
  assert.equal(c.stats.evictions, 1);
});

test('LRUCache: re-set bumps recency without growing size', () => {
  const c = new LRUCache({ max: 2, ttlMs: 100000 });
  c.set('a', 1);
  c.set('b', 2);
  c.set('a', 11); // updates a + makes it most-recent
  c.set('c', 3);  // evicts 'b' since 'a' was just touched
  assert.equal(c.size, 2);
  assert.equal(c.get('a'), 11);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('c'), 3);
});

test('LRUCache: hitRate reports correct fraction', () => {
  const c = new LRUCache({ max: 10, ttlMs: 100000 });
  c.set('a', 1);
  c.get('a'); // hit
  c.get('a'); // hit
  c.get('b'); // miss
  assert.equal(c.hitRate(), 2 / 3);
});

test('LRUCache: delete removes entry and returns boolean', () => {
  const c = new LRUCache({ max: 10, ttlMs: 100000 });
  c.set('a', 1);
  assert.equal(c.delete('a'), true);
  assert.equal(c.delete('a'), false);
  assert.equal(c.get('a'), undefined);
});

test('LRUCache: clear empties the cache without resetting stats', () => {
  const c = new LRUCache({ max: 10, ttlMs: 100000 });
  c.set('a', 1);
  c.get('a');
  c.clear();
  assert.equal(c.size, 0);
  assert.equal(c.stats.hits, 1);
});
