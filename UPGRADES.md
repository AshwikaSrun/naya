# naya — engineering upgrades

This document lives next to the code so a reviewer can quickly verify that
naya is more than a demo: it ships with the production-quality scaffolding
expected of a service running on Railway, Vercel, and npm.

> TL;DR — added tests + CI, replaced ad-hoc primitives with first-class
> ones, instrumented the request path, made the system fail gracefully,
> and proved a 5–7× algorithmic speedup on the dedup pass. Zero new
> runtime dependencies.

## 1. Tests (102 total · `node --test`)

| Suite | File | Tests |
|---|---|---|
| Order statistics | `scraper-api/lib/__tests__/stats.test.js` | 11 |
| LRU cache | `scraper-api/lib/__tests__/lruCache.test.js` | 9 |
| Circuit breaker | `scraper-api/lib/__tests__/circuitBreaker.test.js` | 8 |
| Request validator | `scraper-api/lib/__tests__/validate.test.js` | 12 |
| Observability primitives | `scraper-api/lib/__tests__/observability.test.js` | 6 |
| Data pipeline (clean / validate / dedupe / rank) | `scraper-api/lib/__tests__/dataPipeline.test.js` | 23 |
| Relevance scoring | `scraper-api/lib/__tests__/relevance.test.js` | 8 |
| MCP server (formatters + retry HTTP client) | `mcp-server/__tests__/lib.test.js` | 25 |

Zero test dependencies — uses the built-in `node:test` runner shipped
with Node ≥ 20.

```bash
# scraper-api
cd scraper-api && npm test     # 77 tests, ~200ms

# mcp-server
cd mcp-server  && npm test     # 25 tests, ~150ms
```

## 2. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push and PR:

- **scraper-api** — installs (no Chromium download), runs unit tests, then
  runs the dedup benchmark as a *correctness gate*: it asserts the
  bucketed implementation keeps the same survivor set as the naive
  reference impl on a 1000-item synthetic corpus. This catches future
  "optimisations" that silently drop items.
- **mcp-server** — installs, runs unit tests on Node 20 + 22.
- **frontend** — lint + `tsc --noEmit`.

Matrix on Node 20 and 22. `concurrency` cancels stale runs.

## 3. Algorithm: dedup speedup (5–7× at production sizes)

The cross-platform dedup was O(n²): every pair of listings was compared,
even though most pairs share zero tokens.

**New approach** — `scraper-api/lib/dataPipeline.js`:

1. Tokenise each normalised title once (O(n × avg tokens)).
2. Build an inverted index: `token → sorted[item index]`.
3. For each item, gather candidate partners by walking only that item's
   own tokens. Items sharing zero tokens are never compared.
4. Sort candidate indices ascending before iterating so dedup chains
   resolve in the same order as the naive reference impl — preserving
   bit-identical output.

**Benchmark** (`scraper-api/bench/dedup.js`, ran in CI):

| Corpus | Naive O(n²) | Bucketed | Speedup | Kept items |
|---|---|---|---|---|
| 200 items | 7.65 ms | 1.43 ms | **5.4×** | 152 / 152 |
| 500 items | 46.23 ms | 8.62 ms | **5.4×** | 341 / 341 |
| 1000 items | 252.5 ms | 33.5 ms | **7.5×** | 607 / 607 |

Run yourself:

```bash
cd scraper-api && node bench/dedup.js 1000 20
```

## 4. Observability

`scraper-api/lib/observability.js` adds three primitives, all
zero-dependency, all unit-tested:

- **Structured NDJSON logger** with levels (`trace|debug|info|warn|error|fatal`),
  scoped child loggers (e.g. `log.child({ scraper: 'depop' })`), and
  optional `LOG_LEVEL` env override.
- **Per-request `traceId`** propagated through the call stack via
  `AsyncLocalStorage` — every log line emitted anywhere inside a request
  handler automatically carries the same `trace` field. Echoed back as
  the `X-Request-Id` response header so the client can correlate.
- **In-process metrics registry** exposing Prometheus text format on
  `GET /metrics`:
  - `naya_http_requests_total{route,method,status}` — counter
  - `naya_http_request_duration_ms{route}` — summary with **streaming
    p50/p95/p99** (P² quantile estimator, O(1) memory per quantile)
  - `naya_scraper_runs_total{platform,outcome}` — outcome ∈ `ok | timeout | error | breaker_open`
  - `naya_scraper_duration_ms{platform}` — summary
  - `naya_scraper_items_returned{platform}` — summary
  - `naya_cache_hits_total{cache}` / `naya_cache_misses_total{cache}`
  - `naya_breaker_transitions_total{scraper,state}`

Why hand-rolled vs `prom-client`: smaller bundle, no dependency surface,
and the abstractions are inspectable in code review. P² is the only
non-obvious one — it's the standard streaming quantile estimator
(Jain & Chlamtac, 1985) and is unit-tested for behaviour on uniform streams.

## 5. Reliability

- **Per-scraper circuit breaker** (`scraper-api/lib/circuitBreaker.js`):
  classic 3-state machine (`closed → open → half_open`). After 4
  failures in 60s, the breaker opens for 30s; a single probe call closes
  it again. Wrapped scrapers fail fast (returning `[]`) when their
  breaker is open, so one platform's anti-bot wall going up doesn't drag
  every user search down to a 25s timeout.
- **Graceful shutdown**: `SIGTERM` / `SIGINT` stop accepting new
  connections, drain inflight requests, close the Chromium pool, then
  exit. Hard 15s cutoff prevents Railway / Kubernetes from killing us
  before we've finished draining. `uncaughtException` and
  `unhandledRejection` are now logged (previously: silent process exit).
- **Bounded LRU cache** (`scraper-api/lib/lruCache.js`) with true
  recency-on-read semantics. The previous ad-hoc `Map` deleted oldest by
  insertion order regardless of access pattern — i.e. it was a FIFO, not
  an LRU. Now reads bump entries to most-recent, evictions are
  least-recently-used, and the cache exposes a `hitRate()` surfaced on
  `/health`.

## 6. API hygiene

- **Request validation** (`scraper-api/lib/validate.js`): tiny
  declarative validator with `str`, `num`, `oneOf`, `csv` parsers.
  Replaces hand-rolled `parseInt(req.query.limit || '10')` patterns
  scattered across routes. Returns a typed `ValidationError(status=400,
  field, message)` that the global error handler turns into a stable
  `{ error: { code, message }, traceId }` envelope.
- **`X-Request-Id` round-tripping**: incoming header is honored if
  present, else a UUID-prefixed id is generated. Returned on every
  response. Surfaces directly in logs and in the error envelope so a
  user can paste an ID into a support ticket and we can find the
  request.

## 7. MCP server hardening

- Split `index.js` into a pure-helper `lib.js` so formatters and the
  HTTP client can be unit-tested without booting the MCP server.
- **Retry with exponential backoff + full jitter** in `callNayaApi`:
  retries `5xx` and network failures (up to 2 retries by default), never
  retries `401` (returns actionable "get a fresh key" message) or `429`
  (returns the quota usage so the user knows whether to upgrade tier).
  Tested with an injected `fetch` stub.
- JSDoc types on every exported function so IDEs surface inline help.
- Stable JSON Schema descriptors for `check_resale_price` /
  `find_cross_listings` — `additionalProperties: false` so the model
  can't pass unknown fields the upstream API would silently ignore.

## 8. Things I'd add next

In rough priority order:

1. **Distributed cache**: Redis on Railway, keyed identically to the
   in-process LRU. Required before horizontal-scaling the scraper-api.
2. **OpenTelemetry export**: the current `traceId` + metrics scaffold
   maps cleanly to OTel without a rewrite — just swap `emit()` for an
   OTel processor.
3. **Schema migrations**: add `node-pg-migrate` so Supabase schema
   changes are checked into git rather than executed in the dashboard.
4. **Property-based testing**: `fast-check` on the dedup pipeline to
   catch edge cases the unit tests miss (Unicode titles, extreme
   prices, very long token lists).
5. **End-to-end smoke**: a single `e2e.test.js` that boots the express
   app on an ephemeral port, hits `/health`, `/metrics`, and
   `/search?q=stub` against mocked scrapers.

---

**Tour the changes:**

| Concern | File(s) |
|---|---|
| Tests | `scraper-api/lib/__tests__/`, `mcp-server/__tests__/` |
| CI | `.github/workflows/ci.yml` |
| Algorithm + benchmark | `scraper-api/lib/dataPipeline.js`, `scraper-api/bench/dedup.js` |
| Logger + traceId + metrics | `scraper-api/lib/observability.js` |
| Circuit breaker | `scraper-api/lib/circuitBreaker.js` |
| LRU cache | `scraper-api/lib/lruCache.js` |
| Validator | `scraper-api/lib/validate.js` |
| Order statistics | `scraper-api/lib/stats.js` |
| Wired-up server | `scraper-api/server.js` |
| MCP refactor | `mcp-server/lib.js`, `mcp-server/index.js` |
