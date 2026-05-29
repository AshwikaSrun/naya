const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  percentile,
  median,
  buildPlatformBreakdown,
  dealScore,
} = require('../stats');

test('percentile: returns null for empty input', () => {
  assert.equal(percentile([], 0.5), null);
});

test('percentile: returns the single element for length 1', () => {
  assert.equal(percentile([42], 0.5), 42);
  assert.equal(percentile([42], 0.0), 42);
  assert.equal(percentile([42], 1.0), 42);
});

test('percentile: linear interpolation matches numpy default', () => {
  // numpy.percentile([1,2,3,4], [25,50,75]) -> [1.75, 2.5, 3.25]
  const sorted = [1, 2, 3, 4];
  assert.equal(percentile(sorted, 0.25), 1.75);
  assert.equal(percentile(sorted, 0.5), 2.5);
  assert.equal(percentile(sorted, 0.75), 3.25);
});

test('percentile: handles p outside [0,1] by clamping to endpoints', () => {
  const sorted = [10, 20, 30];
  assert.equal(percentile(sorted, -0.5), 10);
  assert.equal(percentile(sorted, 1.5), 30);
});

test('median: agrees with percentile(0.5)', () => {
  for (const arr of [[1, 2, 3], [1, 2, 3, 4], [5], [10, 20]]) {
    assert.equal(median(arr), percentile(arr, 0.5));
  }
});

test('buildPlatformBreakdown: groups by source and computes median per group', () => {
  const items = [
    { source: 'ebay', price: 10 },
    { source: 'ebay', price: 30 },
    { source: 'ebay', price: 50 },
    { source: 'grailed', price: 100 },
    { source: 'grailed', price: 200 },
  ];
  const out = buildPlatformBreakdown(items);
  assert.equal(out.ebay.median, 30);
  assert.equal(out.ebay.count, 3);
  assert.equal(out.grailed.median, 150);
  assert.equal(out.grailed.count, 2);
});

test('buildPlatformBreakdown: items without source bucket into "unknown"', () => {
  const items = [
    { source: null, price: 1 },
    { source: undefined, price: 3 },
    { source: 'ebay', price: 5 },
  ];
  const out = buildPlatformBreakdown(items);
  assert.equal(out.unknown.count, 2);
  assert.equal(out.ebay.count, 1);
});

test('dealScore: returns "good" for prices at or below p25', () => {
  assert.equal(dealScore(20, 25, 75), 'good');
  assert.equal(dealScore(25, 25, 75), 'good');
});

test('dealScore: returns "fair" between p25 and p75', () => {
  assert.equal(dealScore(50, 25, 75), 'fair');
  assert.equal(dealScore(75, 25, 75), 'fair');
});

test('dealScore: returns "high" above p75', () => {
  assert.equal(dealScore(100, 25, 75), 'high');
});

test('dealScore: invalid prices return "fair"', () => {
  assert.equal(dealScore(NaN, 25, 75), 'fair');
  assert.equal(dealScore(0, 25, 75), 'fair');
  assert.equal(dealScore(-5, 25, 75), 'fair');
});
