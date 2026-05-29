#!/usr/bin/env node
/**
 * Microbenchmark: cross-platform dedup throughput.
 *
 * Generates a synthetic corpus that mimics real search output (many
 * near-duplicate listings across platforms with overlapping vocabulary),
 * then runs `deduplicateResults` repeatedly to measure throughput.
 *
 * Compares two implementations:
 *   - naive_n2:  the original O(n²) pairwise comparison
 *   - bucket:    the inverted-token-index prefilter (current `deduplicateResults`)
 *
 * Output is plain text so it can be checked into CI logs or pasted into
 * a PR description.
 *
 *   $ node bench/dedup.js
 *   $ node bench/dedup.js 500   # custom corpus size
 *   $ node bench/dedup.js 1000 200   # corpus, iterations
 */

const { deduplicateResults, normalizeForDedup, tokensOf } =
  require('../lib/dataPipeline');

const N = parseInt(process.argv[2] || '200', 10);
const ITERATIONS = parseInt(process.argv[3] || '50', 10);

const VOCAB = [
  'vintage', 'carhartt', 'detroit', 'jacket', 'xl', 'l', 'm', 's',
  'nike', 'air', 'jordan', 'panda', 'retro', 'high', 'low',
  'levis', '501', 'denim', 'jeans', 'raw',
  'patagonia', 'fleece', 'retro', 'pile',
  'north', 'face', 'puffer', 'parka',
  'supreme', 'box', 'logo', 'hoodie',
  'stussy', 'tee', 'shirt',
  'corduroy', 'wool', 'leather',
];
const SOURCES = ['ebay', 'grailed', 'depop', 'poshmark', 'vinted'];

function pseudoRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Build a synthetic corpus of `n` items distributed across sources, with
 * roughly 30% near-duplicates (same titles, prices within 20%, different
 * source) so dedup has real work to do.
 */
function generateCorpus(n, seed = 42) {
  const rand = pseudoRandom(seed);
  const items = [];
  const seenTitles = [];
  for (let i = 0; i < n; i++) {
    const shouldDup = i > 5 && rand() < 0.3 && seenTitles.length > 0;
    let title;
    let basePrice;
    if (shouldDup) {
      const proto = seenTitles[Math.floor(rand() * seenTitles.length)];
      title = proto.title;
      // Vary price within ~15% of the prototype to land inside dedup window.
      basePrice = proto.price * (0.85 + rand() * 0.3);
    } else {
      const wordCount = 3 + Math.floor(rand() * 4);
      const words = [];
      for (let w = 0; w < wordCount; w++) {
        words.push(VOCAB[Math.floor(rand() * VOCAB.length)]);
      }
      title = words.join(' ');
      basePrice = 20 + Math.floor(rand() * 200);
      seenTitles.push({ title, price: basePrice });
    }
    items.push({
      title,
      price: Math.round(basePrice * 100) / 100,
      source: SOURCES[Math.floor(rand() * SOURCES.length)],
    });
  }
  return items;
}

/**
 * Naive O(n²) reference implementation kept here for benchmarking only.
 * Mirrors what the codebase used to do before the inverted-token-index
 * prefilter landed.
 */
function deduplicateResultsNaive(items) {
  if (items.length <= 1) return items;
  const dominated = new Set();
  for (let i = 0; i < items.length; i++) {
    if (dominated.has(i)) continue;
    const a = items[i];
    const tokensA = tokensOf(normalizeForDedup(a.title));
    for (let j = i + 1; j < items.length; j++) {
      if (dominated.has(j)) continue;
      const b = items[j];
      if (a.source === b.source) continue;

      const tokensB = tokensOf(normalizeForDedup(b.title));
      const small = tokensA.size <= tokensB.size ? tokensA : tokensB;
      const large = small === tokensA ? tokensB : tokensA;
      let shared = 0;
      for (const t of small) if (large.has(t)) shared++;
      const similarity = small.size === 0 ? 0 : shared / small.size;
      if (similarity < 0.7) continue;

      const priceDiff = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
      if (priceDiff > 0.2) continue;

      if (a.price <= b.price) dominated.add(j);
      else { dominated.add(i); break; }
    }
  }
  return items.filter((_, idx) => !dominated.has(idx));
}

function bench(label, fn, items, iters) {
  // Warm V8.
  for (let i = 0; i < 5; i++) fn(items);

  const start = process.hrtime.bigint();
  let resultLen = 0;
  for (let i = 0; i < iters; i++) {
    resultLen = fn(items).length;
  }
  const end = process.hrtime.bigint();
  const totalMs = Number(end - start) / 1e6;
  const perRunMs = totalMs / iters;
  return { label, totalMs, perRunMs, resultLen };
}

function main() {
  console.log(`naya dedup benchmark`);
  console.log(`  corpus size = ${N}`);
  console.log(`  iterations  = ${ITERATIONS}\n`);

  const items = generateCorpus(N);

  const naive  = bench('naive_n2', deduplicateResultsNaive, items, ITERATIONS);
  const bucket = bench('bucket  ', deduplicateResults,      items, ITERATIONS);

  const fmt = (n) => n.toFixed(3).padStart(8);
  console.log(`impl       │ per-run (ms) │ total (ms) │ kept items`);
  console.log(`───────────┼──────────────┼────────────┼───────────`);
  console.log(`${naive.label}   │   ${fmt(naive.perRunMs)} │   ${fmt(naive.totalMs)} │ ${naive.resultLen}`);
  console.log(`${bucket.label} │   ${fmt(bucket.perRunMs)} │   ${fmt(bucket.totalMs)} │ ${bucket.resultLen}`);

  const speedup = naive.perRunMs / bucket.perRunMs;
  console.log(`\nspeedup: ${speedup.toFixed(2)}x`);

  if (naive.resultLen !== bucket.resultLen) {
    console.error(
      `WARNING: dedup implementations disagreed on result count ` +
      `(${naive.resultLen} vs ${bucket.resultLen}). The token-bucket ` +
      `prefilter must produce the same set of survivors.`
    );
    process.exit(1);
  }
}

main();
