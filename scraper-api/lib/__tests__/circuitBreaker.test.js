const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CircuitBreaker } = require('../circuitBreaker');

function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    tick: (ms) => { t += ms; },
  };
}

function newBreaker(clock, overrides = {}) {
  return new CircuitBreaker({
    name: 'test',
    failureThreshold: 3,
    windowMs: 1000,
    cooldownMs: 500,
    halfOpenMaxCalls: 1,
    now: clock.now,
    ...overrides,
  });
}

test('CircuitBreaker: starts closed and allows calls', () => {
  const b = newBreaker(makeClock());
  assert.equal(b.state, 'closed');
  assert.equal(b.allow(), true);
});

test('CircuitBreaker: opens after failureThreshold failures within windowMs', () => {
  const clock = makeClock();
  const b = newBreaker(clock);
  b.recordFailure();
  b.recordFailure();
  assert.equal(b.state, 'closed');
  b.recordFailure();
  assert.equal(b.state, 'open');
  assert.equal(b.allow(), false);
});

test('CircuitBreaker: old failures outside the window are forgotten', () => {
  const clock = makeClock();
  const b = newBreaker(clock);
  b.recordFailure();
  b.recordFailure();
  clock.tick(1500); // older than windowMs
  b.recordFailure();
  assert.equal(b.state, 'closed', 'two stale failures should have aged out');
});

test('CircuitBreaker: transitions OPEN -> HALF_OPEN after cooldown then allows one probe', () => {
  const clock = makeClock();
  const transitions = [];
  const b = newBreaker(clock, {
    onTransition: (n, f, t) => transitions.push([f, t]),
  });
  b.recordFailure(); b.recordFailure(); b.recordFailure();
  assert.equal(b.state, 'open');
  clock.tick(600);
  assert.equal(b.allow(), true, 'should allow one probe after cooldown');
  assert.equal(b.state, 'half_open');
  assert.equal(b.allow(), false, 'no more probes until first one resolves');
  assert.deepEqual(transitions, [
    ['closed', 'open'],
    ['open', 'half_open'],
  ]);
});

test('CircuitBreaker: a probe success closes the circuit', () => {
  const clock = makeClock();
  const b = newBreaker(clock);
  b.recordFailure(); b.recordFailure(); b.recordFailure();
  clock.tick(600);
  b.allow();
  b.recordSuccess();
  assert.equal(b.state, 'closed');
  assert.equal(b.allow(), true);
});

test('CircuitBreaker: a probe failure trips the circuit back open', () => {
  const clock = makeClock();
  const b = newBreaker(clock);
  b.recordFailure(); b.recordFailure(); b.recordFailure();
  clock.tick(600);
  b.allow(); // half_open
  b.recordFailure();
  assert.equal(b.state, 'open');
});

test('CircuitBreaker.wrap: skips underlying fn when open and returns fallback', async () => {
  const clock = makeClock();
  const b = newBreaker(clock);
  let calls = 0;
  const fn = async () => { calls++; throw new Error('boom'); };
  const wrapped = b.wrap(fn, []);

  for (let i = 0; i < 3; i++) {
    await assert.rejects(wrapped());
  }
  assert.equal(b.state, 'open');
  const result = await wrapped();
  assert.equal(result.skipped, true);
  assert.deepEqual(result.value, []);
  assert.equal(calls, 3, 'fn should not be called once breaker is open');
});

test('CircuitBreaker: snapshot reflects current state and remaining cooldown', () => {
  const clock = makeClock();
  const b = newBreaker(clock);
  b.recordFailure(); b.recordFailure(); b.recordFailure();
  const snap = b.snapshot();
  assert.equal(snap.state, 'open');
  assert.equal(snap.cooldownRemainingMs, 500);
  clock.tick(200);
  assert.equal(b.snapshot().cooldownRemainingMs, 300);
});
