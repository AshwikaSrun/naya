const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

let client = null;
let initFailed = false;

// Defensive init wrapper.
//
// May 29 outage post-mortem: getSupabase() runs in the app.listen callback
// at boot. When the container was rebuilt for the first time since May 4,
// npm pulled in a newer @supabase/realtime-js (semver range `^2.99.2` on
// supabase-js, which carries its own realtime-js range), and that version
// throws synchronously inside createClient() if Node lacks native
// WebSocket. The Dockerfile was on node:20, native WebSocket lands in
// Node 21+, so the throw was unhandled and killed the process before
// Railway's healthcheck could connect — sending the deploy into a crash
// loop and silently keeping the broken May-4 container in production for
// hours. We've since bumped the Dockerfile to node:22-bullseye-slim, but
// Supabase is *ingestion infrastructure*: it should never have the
// ability to take down the public scraper. Catch and log instead.
function getSupabase() {
  if (initFailed) return null;
  if (!supabaseUrl || !supabaseKey) return null;
  if (!client) {
    try {
      client = createClient(supabaseUrl, supabaseKey);
    } catch (err) {
      initFailed = true;
      console.error(`[supabase] init failed, ingestion disabled: ${err.message}`);
      return null;
    }
  }
  return client;
}

module.exports = { getSupabase };
