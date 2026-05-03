const { getSupabase } = require('../lib/supabaseClient');

// Cache validated keys briefly so we don't hit Supabase on every call from the
// same hot key. The auth check is still blocking — this just trims latency.
const KEY_CACHE_TTL_MS = 60 * 1000;
const keyCache = new Map(); // api_key (text) → { row, ts }

function readKey(req) {
  const fromQuery = typeof req.query.api_key === 'string' ? req.query.api_key.trim() : '';
  if (fromQuery) return fromQuery;

  const auth = req.headers['authorization'] || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

async function lookupKey(supabase, apiKey) {
  const cached = keyCache.get(apiKey);
  if (cached && Date.now() - cached.ts < KEY_CACHE_TTL_MS) {
    return cached.row;
  }
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, api_key, monthly_limit, tier, customer_name, is_active')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  keyCache.set(apiKey, { row: data, ts: Date.now() });
  return data;
}

async function countMonthlyUsage(supabase, apiKeyId) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', monthStart.toISOString());

  if (error) return 0;
  return count || 0;
}

function logUsage(supabase, payload) {
  // Fire-and-forget: never await, never throw out of the request path.
  supabase
    .from('api_usage')
    .insert(payload)
    .then(({ error }) => {
      if (error) console.error('[apiAuth] usage log error:', error.message);
    })
    .catch((err) => {
      console.error('[apiAuth] usage log threw:', err && err.message);
    });
}

function apiAuth(req, res, next) {
  const supabase = getSupabase();

  if (!supabase) {
    // Misconfigured backend — fail closed so we don't accidentally serve the
    // B2B endpoints publicly when Supabase env vars are missing.
    return res.status(503).json({ error: 'Auth backend not configured' });
  }

  const apiKey = readKey(req);
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const start = Date.now();

  (async () => {
    const keyRow = await lookupKey(supabase, apiKey);
    if (!keyRow) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (keyRow.monthly_limit != null) {
      const used = await countMonthlyUsage(supabase, keyRow.id);
      if (used >= keyRow.monthly_limit) {
        return res.status(429).json({
          error: 'Monthly limit exceeded',
          limit: keyRow.monthly_limit,
          used,
        });
      }
      res.setHeader('X-RateLimit-Limit', String(keyRow.monthly_limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, keyRow.monthly_limit - used)));
    }

    req.apiKey = keyRow;

    // Log on response finish — exact status code + true wall-clock latency.
    res.on('finish', () => {
      logUsage(supabase, {
        api_key_id: keyRow.id,
        api_key: keyRow.api_key,
        endpoint: req.path,
        query: typeof req.query.q === 'string' ? req.query.q.slice(0, 500) : null,
        status_code: res.statusCode,
        response_ms: Date.now() - start,
      });
    });

    next();
  })().catch((err) => {
    console.error('[apiAuth] unexpected error:', err && err.message);
    return res.status(500).json({ error: 'Auth check failed' });
  });
}

module.exports = apiAuth;
module.exports.apiAuth = apiAuth;
