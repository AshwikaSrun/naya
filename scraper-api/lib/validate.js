/**
 * Tiny declarative validator for Express query/body objects.
 *
 * Why hand-rolled? `zod` is wonderful but a 300KB+ dep and an ESM-only world
 * to live in. For the half-dozen request shapes naya needs, a 90-line
 * validator is plenty and stays grep-able.
 *
 * Usage:
 *
 *   const { validate, str, num, oneOf, csv } = require('./validate');
 *
 *   const schema = {
 *     q:        str({ required: true, max: 200, trim: true }),
 *     limit:    num({ min: 1, max: 50, default: 10, coerce: true }),
 *     platform: oneOf(['all', 'ebay', 'grailed', 'depop', 'poshmark'], { default: 'all' }),
 *     campus:   str({ required: false, max: 40 }),
 *   };
 *
 *   const { value, error } = validate(req.query, schema);
 */

class ValidationError extends Error {
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.field = field;
    this.code = 'validation_error';
    this.status = 400;
  }
}

function str(opts = {}) {
  return (value, name) => {
    if (value === undefined || value === null || value === '') {
      if (opts.required) throw new ValidationError(name, 'required');
      return opts.default ?? null;
    }
    let s = String(value);
    if (opts.trim) s = s.trim();
    if (opts.max != null && s.length > opts.max) {
      s = s.slice(0, opts.max);
    }
    if (opts.min != null && s.length < opts.min) {
      throw new ValidationError(name, `must be at least ${opts.min} chars`);
    }
    if (opts.pattern && !opts.pattern.test(s)) {
      throw new ValidationError(name, `must match ${opts.pattern}`);
    }
    return s;
  };
}

function num(opts = {}) {
  return (value, name) => {
    if (value === undefined || value === null || value === '') {
      if (opts.required) throw new ValidationError(name, 'required');
      return opts.default ?? null;
    }
    let n;
    if (typeof value === 'number') n = value;
    else if (opts.coerce !== false) n = parseFloat(value);
    else throw new ValidationError(name, 'must be a number');
    if (!Number.isFinite(n)) throw new ValidationError(name, 'must be a finite number');
    if (opts.min != null && n < opts.min) n = opts.min;
    if (opts.max != null && n > opts.max) n = opts.max;
    if (opts.integer && !Number.isInteger(n)) n = Math.trunc(n);
    return n;
  };
}

function oneOf(allowed, opts = {}) {
  return (value, name) => {
    if (value === undefined || value === null || value === '') {
      if (opts.required) throw new ValidationError(name, 'required');
      return opts.default ?? null;
    }
    const s = String(value).toLowerCase();
    if (!allowed.includes(s)) {
      throw new ValidationError(name, `must be one of ${allowed.join(', ')}`);
    }
    return s;
  };
}

function csv(allowed, opts = {}) {
  return (value, name) => {
    if (value === undefined || value === null || value === '') {
      if (opts.required) throw new ValidationError(name, 'required');
      return opts.default ?? [];
    }
    const items = String(value)
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (opts.allowAll && items.length === 1 && items[0] === 'all') return ['all'];
    for (const item of items) {
      if (allowed && !allowed.includes(item)) {
        throw new ValidationError(name, `invalid value "${item}"`);
      }
    }
    return items;
  };
}

function validate(input, schema) {
  const out = {};
  try {
    for (const [name, parser] of Object.entries(schema)) {
      out[name] = parser(input ? input[name] : undefined, name);
    }
    return { value: out, error: null };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { value: null, error: err };
    }
    throw err;
  }
}

module.exports = { validate, str, num, oneOf, csv, ValidationError };
