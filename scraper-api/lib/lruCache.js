/**
 * Bounded LRU cache with TTL + instrumented hit/miss/eviction stats.
 *
 * Replaces the ad-hoc `new Map()` caches in server.js that delete oldest
 * by insertion order and never refresh recency on read.
 *
 * Implementation note: Map preserves insertion order. To keep true LRU
 * semantics, every successful `get` re-inserts the entry (delete + set),
 * pushing it to the tail. Eviction takes the head (oldest) when over cap.
 *
 * O(1) get/set/evict.
 */

class LRUCache {
  /**
   * @param {object} opts
   * @param {number} opts.max       Max entries before eviction.
   * @param {number} opts.ttlMs     Time-to-live per entry, milliseconds.
   * @param {string} [opts.name]    Used in stats / metrics labels.
   * @param {() => number} [opts.now] Injected clock for tests.
   */
  constructor({ max, ttlMs, name = 'cache', now = Date.now }) {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error('LRUCache: `max` must be a positive integer');
    }
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error('LRUCache: `ttlMs` must be a positive number');
    }
    this.max = max;
    this.ttlMs = ttlMs;
    this.name = name;
    this._now = now;
    this._map = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  }

  get(key) {
    const entry = this._map.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (this._now() - entry.ts > this.ttlMs) {
      this._map.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return undefined;
    }
    // Bump recency: re-insert so the entry moves to the tail.
    this._map.delete(key);
    this._map.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    }
    this._map.set(key, { value, ts: this._now() });
    while (this._map.size > this.max) {
      const oldest = this._map.keys().next().value;
      this._map.delete(oldest);
      this.stats.evictions++;
    }
  }

  delete(key) {
    return this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }

  /** Hit rate as a fraction in [0, 1]; returns 0 if no operations yet. */
  hitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }
}

module.exports = { LRUCache };
