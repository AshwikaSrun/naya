const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validate, str, num, oneOf, csv, ValidationError,
} = require('../validate');

test('str: required + present returns trimmed value', () => {
  const { value, error } = validate({ q: '  hi  ' }, { q: str({ required: true, trim: true }) });
  assert.equal(error, null);
  assert.equal(value.q, 'hi');
});

test('str: required + missing returns ValidationError', () => {
  const { value, error } = validate({}, { q: str({ required: true }) });
  assert.equal(value, null);
  assert.ok(error instanceof ValidationError);
  assert.equal(error.field, 'q');
  assert.equal(error.status, 400);
});

test('str: enforces max length by truncating', () => {
  const { value } = validate({ q: 'abcdef' }, { q: str({ max: 3 }) });
  assert.equal(value.q, 'abc');
});

test('num: coerces strings to finite numbers', () => {
  const { value } = validate({ n: '42' }, { n: num({}) });
  assert.equal(value.n, 42);
});

test('num: clamps to [min, max]', () => {
  assert.equal(validate({ n: 0 }, { n: num({ min: 1, max: 50 }) }).value.n, 1);
  assert.equal(validate({ n: 999 }, { n: num({ min: 1, max: 50 }) }).value.n, 50);
});

test('num: integer flag truncates toward zero', () => {
  assert.equal(validate({ n: '3.9' }, { n: num({ integer: true }) }).value.n, 3);
});

test('num: rejects non-finite values', () => {
  const { value, error } = validate({ n: 'abc' }, { n: num({}) });
  assert.equal(value, null);
  assert.ok(error instanceof ValidationError);
});

test('num: missing optional value uses default', () => {
  const { value } = validate({}, { n: num({ default: 7 }) });
  assert.equal(value.n, 7);
});

test('oneOf: lower-cases input and rejects out-of-set values', () => {
  const schema = { p: oneOf(['ebay', 'depop']) };
  assert.equal(validate({ p: 'EBAY' }, schema).value.p, 'ebay');
  assert.ok(validate({ p: 'unknown' }, schema).error instanceof ValidationError);
});

test('csv: parses comma-separated lowercase tokens', () => {
  const schema = { p: csv(['ebay', 'depop', 'grailed']) };
  const { value } = validate({ p: 'EBAY, Depop' }, schema);
  assert.deepEqual(value.p, ['ebay', 'depop']);
});

test('csv: allowAll short-circuits to ["all"]', () => {
  const { value } = validate(
    { p: 'all' },
    { p: csv(['ebay'], { allowAll: true }) }
  );
  assert.deepEqual(value.p, ['all']);
});

test('validate: multi-field happy path', () => {
  const schema = {
    q:     str({ required: true, trim: true }),
    limit: num({ default: 10, min: 1, max: 50, integer: true }),
    sort:  oneOf(['asc', 'desc'], { default: 'asc' }),
  };
  const { value, error } = validate({ q: '  hi ', limit: '25' }, schema);
  assert.equal(error, null);
  assert.deepEqual(value, { q: 'hi', limit: 25, sort: 'asc' });
});
