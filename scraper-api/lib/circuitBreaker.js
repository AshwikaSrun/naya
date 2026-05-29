/**
 * Circuit breaker for individual scrapers.
 *
 * Three states (CLOSED → OPEN → HALF_OPEN → CLOSED/OPEN):
 *
 *   CLOSED      Normal. Track consecutive failures.
 *   OPEN        Too many failures in `windowMs`. Reject calls immediately
 *               for `cooldownMs` so we don't keep paying scraper latency.
 *   HALF_OPEN   After cooldown, let through `halfOpenMaxCalls` probe calls.
 *               Any failure trips back to OPEN. A success closes the circuit.
 *
 * Why this matters: one platform's anti-bot wall going up (e.g. Depop
 * starts rate-limiting our IP) shouldn't slow every user search to a
 * crawl just to get the same `[]` back. The breaker fails fast and the
 * other 3-5 scrapers carry the response.
 */

const CLOSED = 'closed';
const OPEN = 'open';
const HALF_OPEN = 'half_open';

class CircuitBreaker {
  /**
   * @param {object} opts
   * @param {string} opts.name
   * @param {number} opts.failureThreshold   Failures in `windowMs` that trip OPEN.
   * @param {number} opts.windowMs           Rolling failure window.
   * @param {number} opts.cooldownMs         How long to stay OPEN before HALF_OPEN.
   * @param {number} [opts.halfOpenMaxCalls=1] Probe calls allowed in HALF_OPEN.
   * @param {(name: string, from: string, to: string) => void} [opts.onTransition]
   * @param {() => number} [opts.now]        Injected clock for tests.
   */
  constructor({
    name,
    failureThreshold,
    windowMs,
    cooldownMs,
    halfOpenMaxCalls = 1,
    onTransition,
    now = Date.now,
  }) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
    this.halfOpenMaxCalls = halfOpenMaxCalls;
    this.onTransition = onTransition || (() => {});
    this._now = now;

    this.state = CLOSED;
    this._failureTimestamps = [];
    this._openedAt = 0;
    this._halfOpenInFlight = 0;
  }

  /** Whether a new call is permitted right now. */
  allow() {
    if (this.state === CLOSED) return true;
    if (this.state === OPEN) {
      if (this._now() - this._openedAt >= this.cooldownMs) {
        this._transition(HALF_OPEN);
        return this._allowHalfOpen();
      }
      return false;
    }
    return this._allowHalfOpen();
  }

  _allowHalfOpen() {
    if (this._halfOpenInFlight < this.halfOpenMaxCalls) {
      this._halfOpenInFlight++;
      return true;
    }
    return false;
  }

  /**
   * Wrap a function so calls go through the breaker. The wrapped function
   * receives all original arguments. If the breaker is OPEN, it never invokes
   * the underlying function and instead resolves with the `fallback` value.
   *
   * @template T
   * @param {(...args: any[]) => Promise<T>} fn
   * @param {T} fallback
   */
  wrap(fn, fallback) {
    return async (...args) => {
      if (!this.allow()) {
        return { skipped: true, value: fallback };
      }
      try {
        const value = await fn(...args);
        this.recordSuccess();
        return { skipped: false, value };
      } catch (err) {
        this.recordFailure();
        throw err;
      }
    };
  }

  recordSuccess() {
    if (this.state === HALF_OPEN) {
      this._halfOpenInFlight = Math.max(0, this._halfOpenInFlight - 1);
      this._failureTimestamps = [];
      this._transition(CLOSED);
    } else if (this.state === CLOSED) {
      // Successful calls slowly forget old failures.
      this._evictOldFailures();
    }
  }

  recordFailure() {
    if (this.state === HALF_OPEN) {
      this._halfOpenInFlight = Math.max(0, this._halfOpenInFlight - 1);
      this._trip();
      return;
    }
    this._failureTimestamps.push(this._now());
    this._evictOldFailures();
    if (this._failureTimestamps.length >= this.failureThreshold) {
      this._trip();
    }
  }

  _trip() {
    this._openedAt = this._now();
    this._transition(OPEN);
  }

  _evictOldFailures() {
    const cutoff = this._now() - this.windowMs;
    while (
      this._failureTimestamps.length > 0 &&
      this._failureTimestamps[0] < cutoff
    ) {
      this._failureTimestamps.shift();
    }
  }

  _transition(next) {
    if (this.state === next) return;
    const from = this.state;
    this.state = next;
    if (next === CLOSED) this._failureTimestamps = [];
    if (next !== HALF_OPEN) this._halfOpenInFlight = 0;
    this.onTransition(this.name, from, next);
  }

  /** Snapshot of current state for /metrics + /health debugging. */
  snapshot() {
    return {
      name: this.name,
      state: this.state,
      recentFailures: this._failureTimestamps.length,
      openedAt: this._openedAt || null,
      cooldownRemainingMs:
        this.state === OPEN
          ? Math.max(0, this.cooldownMs - (this._now() - this._openedAt))
          : 0,
    };
  }
}

CircuitBreaker.STATES = { CLOSED, OPEN, HALF_OPEN };

module.exports = { CircuitBreaker };
