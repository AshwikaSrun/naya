import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Server-side Supabase client for the agent. Prefers the service-role key (for
// cron jobs + writes) and falls back to the public anon key (RLS is disabled on
// the agent tables, matching the rest of the schema). Returns null if neither is
// configured so callers can degrade gracefully instead of 500ing.
// ─────────────────────────────────────────────────────────────────────────────

let cached: SupabaseClient | null = null;

export function getAgentDb(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
