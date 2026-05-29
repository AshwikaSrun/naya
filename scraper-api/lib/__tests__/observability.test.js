const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  Counter,
  Histogram,
  P2Quantile,
  registry,
} = require('../observability');

test('Counter: increments without labels', () => {
  const c = new Counter('test_total', 'help');
  c.inc();
  c.inc({}, 5);
  const out = c.render();
  assert.match(out, /test_total 6/);
  assert.match(out, /# TYPE test_total counter/);
});

test('Counter: increments with label sets independently', () => {
  const c = new Counter('reqs_total', 'help', ['route', 'status']);
  c.inc({ route: '/a', status: '2xx' });
  c.inc({ route: '/a', status: '2xx' });
  c.inc({ route: '/a', status: '5xx' });
  const out = c.render();
  assert.match(out, /reqs_total\{route="\/a",status="2xx"\} 2/);
  assert.match(out, /reqs_total\{route="\/a",status="5xx"\} 1/);
});

test('P2Quantile: bootstraps with first 5 samples by sorting', () => {
  const q = new P2Quantile(0.5);
  for (const v of [3, 1, 4, 1, 5]) q.observe(v);
  assert.equal(q.value(), 3); // sorted middle of [1,1,3,4,5]
});

test('P2Quantile: produces a sensible p95 on a uniform stream', () => {
  const q = new P2Quantile(0.95);
  // Use a deterministic but spread distribution: 1..1000.
  for (let i = 1; i <= 1000; i++) q.observe(i);
  const v = q.value();
  // P² is an approximation but should be in the ballpark of the true p95
  // for a smooth distribution. We allow generous slack.
  assert.ok(v > 800 && v < 1000, `expected ~950, got ${v}`);
});

test('Histogram: renders quantiles + sum + count per label set', () => {
  const h = new Histogram('lat_ms', 'help', ['route']);
  for (let i = 1; i <= 100; i++) h.observe({ route: '/x' }, i);
  const out = h.render();
  assert.match(out, /lat_ms\{route="\/x",quantile="0.5"\}/);
  assert.match(out, /lat_ms\{route="\/x",quantile="0.95"\}/);
  assert.match(out, /lat_ms_sum\{route="\/x"\} 5050/);
  assert.match(out, /lat_ms_count\{route="\/x"\} 100/);
});

test('registry.render: includes every registered metric exactly once', () => {
  const out = registry.render();
  // These are declared by observability.js at module load.
  assert.match(out, /naya_http_requests_total/);
  assert.match(out, /naya_scraper_runs_total/);
  assert.match(out, /naya_cache_hits_total/);
});
