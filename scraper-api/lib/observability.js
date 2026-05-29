/**
 * In-process observability primitives for the naya scraper API.
 *
 * Three pieces, all zero-dependency:
 *
 *   1. Structured JSON logger (NDJSON, levels, child loggers)
 *   2. Per-request traceId propagated via AsyncLocalStorage so log lines
 *      from anywhere in the call stack automatically carry the trace id
 *   3. A tiny metrics registry (counters + histograms with quantile
 *      estimation) that renders Prometheus text exposition format
 *
 * We could have pulled in pino + prom-client. Hand-rolling these makes the
 * binary smaller for Railway, removes a supply-chain surface, and — more
 * importantly — makes the abstractions inspectable in code review.
 */

const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');

// ── trace context ────────────────────────────────────────────────────────

const traceStore = new AsyncLocalStorage();

function withTrace(traceId, fn) {
  return traceStore.run({ traceId }, fn);
}

function currentTraceId() {
  const ctx = traceStore.getStore();
  return ctx ? ctx.traceId : null;
}

// ── logger ───────────────────────────────────────────────────────────────

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
const LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const MIN_LEVEL = LEVELS[LEVEL] || LEVELS.info;

function emit(level, bindings, msg, extras) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const line = {
    t: new Date().toISOString(),
    level,
    msg: typeof msg === 'string' ? msg : (msg && msg.message) || String(msg),
    ...bindings,
    ...(extras || {}),
  };

  const trace = currentTraceId();
  if (trace) line.trace = trace;

  if (msg && msg.stack && level === 'error') line.stack = msg.stack;

  const out = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
  out.write(JSON.stringify(line) + '\n');
}

function makeLogger(bindings = {}) {
  return {
    child: (extra) => makeLogger({ ...bindings, ...extra }),
    trace: (m, x) => emit('trace', bindings, m, x),
    debug: (m, x) => emit('debug', bindings, m, x),
    info:  (m, x) => emit('info',  bindings, m, x),
    warn:  (m, x) => emit('warn',  bindings, m, x),
    error: (m, x) => emit('error', bindings, m, x),
    fatal: (m, x) => emit('fatal', bindings, m, x),
  };
}

const log = makeLogger({ svc: 'scraper-api' });

// ── metrics: counter + histogram ────────────────────────────────────────

class Counter {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.values = new Map(); // label-key -> number
  }
  inc(labels = {}, n = 1) {
    const key = this._key(labels);
    this.values.set(key, (this.values.get(key) || 0) + n);
  }
  _key(labels) {
    return this.labelNames.map((l) => `${l}=${labels[l] ?? ''}`).join('|');
  }
  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
      return lines.join('\n');
    }
    for (const [key, val] of this.values) {
      const labelStr = key ? '{' + key.split('|').map((kv) => {
        const [k, v] = kv.split('=');
        return `${k}="${v}"`;
      }).join(',') + '}' : '';
      lines.push(`${this.name}${labelStr} ${val}`);
    }
    return lines.join('\n');
  }
}

/**
 * Streaming P² quantile estimator (Jain & Chlamtac, 1985).
 *
 * Lets us estimate p50/p95/p99 of an unbounded stream of latencies in O(1)
 * space per quantile, without storing samples. Critical for a long-running
 * server where keeping every observed latency would leak memory.
 */
class P2Quantile {
  constructor(p) {
    this.p = p;
    this.n = [0, 1, 2, 3, 4];
    this.q = [];
    this.np = [0, 2 * p, 4 * p, 2 + 2 * p, 4];
    this.dn = [0, p / 2, p, (1 + p) / 2, 1];
    this.count = 0;
  }
  observe(x) {
    this.count++;
    if (this.q.length < 5) {
      this.q.push(x);
      if (this.q.length === 5) this.q.sort((a, b) => a - b);
      return;
    }
    let k;
    if (x < this.q[0]) { this.q[0] = x; k = 0; }
    else if (x < this.q[1]) k = 0;
    else if (x < this.q[2]) k = 1;
    else if (x < this.q[3]) k = 2;
    else if (x <= this.q[4]) k = 3;
    else { this.q[4] = x; k = 3; }
    for (let i = k + 1; i < 5; i++) this.n[i]++;
    for (let i = 0; i < 5; i++) this.np[i] += this.dn[i];
    for (let i = 1; i < 4; i++) {
      const d = this.np[i] - this.n[i];
      if ((d >= 1 && this.n[i + 1] - this.n[i] > 1) ||
          (d <= -1 && this.n[i - 1] - this.n[i] < -1)) {
        const sign = d < 0 ? -1 : 1;
        const qp = this._parabolic(i, sign);
        this.q[i] = (this.q[i - 1] < qp && qp < this.q[i + 1])
          ? qp
          : this._linear(i, sign);
        this.n[i] += sign;
      }
    }
  }
  _parabolic(i, d) {
    const a = d / (this.n[i + 1] - this.n[i - 1]);
    const b = (this.n[i] - this.n[i - 1] + d) * (this.q[i + 1] - this.q[i]) / (this.n[i + 1] - this.n[i])
            + (this.n[i + 1] - this.n[i] - d) * (this.q[i] - this.q[i - 1]) / (this.n[i] - this.n[i - 1]);
    return this.q[i] + a * b;
  }
  _linear(i, d) {
    return this.q[i] + d * (this.q[i + d] - this.q[i]) / (this.n[i + d] - this.n[i]);
  }
  value() {
    if (this.count === 0) return 0;
    if (this.q.length < 5) {
      const sorted = [...this.q].sort((a, b) => a - b);
      return sorted[Math.floor((sorted.length - 1) * this.p)] || 0;
    }
    return this.q[2];
  }
}

class Histogram {
  constructor(name, help, labelNames = []) {
    this.name = name;
    this.help = help;
    this.labelNames = labelNames;
    this.series = new Map(); // labelKey -> { p50, p95, p99, sum, count }
  }
  observe(labels = {}, value = 0) {
    const key = this._key(labels);
    let s = this.series.get(key);
    if (!s) {
      s = {
        p50: new P2Quantile(0.5),
        p95: new P2Quantile(0.95),
        p99: new P2Quantile(0.99),
        sum: 0,
        count: 0,
      };
      this.series.set(key, s);
    }
    s.p50.observe(value);
    s.p95.observe(value);
    s.p99.observe(value);
    s.sum += value;
    s.count += 1;
  }
  _key(labels) {
    return this.labelNames.map((l) => `${l}=${labels[l] ?? ''}`).join('|');
  }
  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} summary`];
    if (this.series.size === 0) {
      lines.push(`${this.name}_count 0`);
      return lines.join('\n');
    }
    for (const [key, s] of this.series) {
      const labelObj = {};
      if (key) for (const kv of key.split('|')) {
        const [k, v] = kv.split('=');
        labelObj[k] = v;
      }
      const fmt = (extra) => {
        const all = { ...labelObj, ...extra };
        const entries = Object.entries(all);
        return entries.length === 0
          ? ''
          : '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
      };
      lines.push(`${this.name}${fmt({ quantile: '0.5' })} ${s.p50.value()}`);
      lines.push(`${this.name}${fmt({ quantile: '0.95' })} ${s.p95.value()}`);
      lines.push(`${this.name}${fmt({ quantile: '0.99' })} ${s.p99.value()}`);
      lines.push(`${this.name}_sum${fmt()} ${s.sum}`);
      lines.push(`${this.name}_count${fmt()} ${s.count}`);
    }
    return lines.join('\n');
  }
}

class Registry {
  constructor() { this.metrics = new Map(); }
  register(metric) {
    this.metrics.set(metric.name, metric);
    return metric;
  }
  counter(name, help, labelNames) {
    return this.register(new Counter(name, help, labelNames));
  }
  histogram(name, help, labelNames) {
    return this.register(new Histogram(name, help, labelNames));
  }
  render() {
    return [...this.metrics.values()].map((m) => m.render()).join('\n\n') + '\n';
  }
}

const registry = new Registry();

// Pre-declared metrics consumed by server.js + scrapers. Declared here so they
// always appear in /metrics output even before they've been observed.
const metrics = {
  httpRequestsTotal: registry.counter(
    'naya_http_requests_total',
    'Total HTTP requests handled, labeled by route, method, and status class.',
    ['route', 'method', 'status']
  ),
  httpRequestDurationMs: registry.histogram(
    'naya_http_request_duration_ms',
    'HTTP request latency in milliseconds, labeled by route.',
    ['route']
  ),
  scraperRunsTotal: registry.counter(
    'naya_scraper_runs_total',
    'Scraper invocations labeled by platform and outcome (ok|timeout|error|breaker_open).',
    ['platform', 'outcome']
  ),
  scraperDurationMs: registry.histogram(
    'naya_scraper_duration_ms',
    'Scraper wall-clock latency, labeled by platform.',
    ['platform']
  ),
  scraperItems: registry.histogram(
    'naya_scraper_items_returned',
    'Items returned by each successful scraper invocation.',
    ['platform']
  ),
  cacheHitsTotal: registry.counter(
    'naya_cache_hits_total',
    'Cache hits, labeled by cache name.',
    ['cache']
  ),
  cacheMissesTotal: registry.counter(
    'naya_cache_misses_total',
    'Cache misses, labeled by cache name.',
    ['cache']
  ),
  circuitBreakerState: registry.counter(
    'naya_breaker_transitions_total',
    'Circuit-breaker state transitions, labeled by scraper and new state.',
    ['scraper', 'state']
  ),
};

// ── express middleware ──────────────────────────────────────────────────

function requestContext(req, res, next) {
  const traceId =
    (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) ||
    randomUUID().slice(0, 16);
  res.setHeader('X-Request-Id', traceId);
  res.locals.traceId = traceId;
  res.locals.startedAt = Date.now();
  withTrace(traceId, () => next());
}

function accessLog(req, res, next) {
  res.on('finish', () => {
    const elapsed = Date.now() - (res.locals.startedAt || Date.now());
    const route = req.route ? req.route.path : req.path;
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    metrics.httpRequestsTotal.inc({ route, method: req.method, status: statusClass });
    metrics.httpRequestDurationMs.observe({ route }, elapsed);
    log.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      elapsed_ms: elapsed,
      ua: req.headers['user-agent'],
    });
  });
  next();
}

function errorEnvelope(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  log.error('unhandled', {
    err: err.message,
    code: err.code,
    status,
    path: req.path,
  });
  res.status(status).json({
    error: {
      code: err.code || 'internal_error',
      message: status >= 500 ? 'Internal server error' : err.message,
    },
    traceId: res.locals.traceId,
  });
}

module.exports = {
  log,
  makeLogger,
  withTrace,
  currentTraceId,
  registry,
  metrics,
  requestContext,
  accessLog,
  errorEnvelope,
  Counter,
  Histogram,
  P2Quantile,
};
