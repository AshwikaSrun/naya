'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Client-side helpers for the personalized shopping agent.
//
// Identity: if Clerk is signed in we let the server read the verified id; we
// still send a stable anonymous id (localStorage) via the x-naya-uid header so
// the agent works before sign-in and during local dev without Clerk keys.
// ─────────────────────────────────────────────────────────────────────────────

import type { InteractionType, ParsedFilters, TasteProfile } from './types';

const UID_KEY = 'naya-agent-uid';

export function getAnonUserId(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let id = window.localStorage.getItem(UID_KEY);
    if (!id) {
      id = `anon_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(UID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

function headers(): HeadersInit {
  return { 'Content-Type': 'application/json', 'x-naya-uid': getAnonUserId() };
}

export interface AgentMatch {
  id: number;
  listing_id: string;
  match_score: number;
  match_reason: string | null;
  listing_url: string;
  listing_title: string | null;
  brand: string | null;
  item_type: string | null;
  price: number | null;
  original_price: number | null;
  image_url: string | null;
  source: string | null;
  user_feedback: 'liked' | 'dismissed' | null;
  /** true when this card is a generic trending pick, not a personalized match. */
  trending?: boolean;
}

export interface SavedSearchRow {
  id: number;
  query_text: string;
  parsed_filters: ParsedFilters;
  is_active: boolean;
  created_at: string;
}

export interface OnboardingTile {
  name: string;
  image: string | null;
}

export interface OnboardingOptions {
  brands: string[];
  brandTiles: OnboardingTile[];
  styleTags: string[];
  styleTiles: OnboardingTile[];
  eras: string[];
}

const EMPTY_OPTIONS: OnboardingOptions = {
  brands: [],
  brandTiles: [],
  styleTags: [],
  styleTiles: [],
  eras: [],
};

export async function getOnboardingOptions(): Promise<OnboardingOptions> {
  try {
    const res = await fetch('/api/onboarding/options', { headers: headers(), cache: 'no-store' });
    if (!res.ok) return EMPTY_OPTIONS;
    const data = (await res.json()) as Partial<OnboardingOptions>;
    return {
      brands: data.brands ?? [],
      brandTiles: data.brandTiles ?? (data.brands ?? []).map((name) => ({ name, image: null })),
      styleTags: data.styleTags ?? [],
      styleTiles: data.styleTiles ?? (data.styleTags ?? []).map((name) => ({ name, image: null })),
      eras: data.eras ?? [],
    };
  } catch {
    return EMPTY_OPTIONS;
  }
}

export async function recordAccount(source: string, email?: string): Promise<void> {
  try {
    await fetch('/api/account/register', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ source, ...(email ? { email } : {}) }),
      keepalive: true,
    });
  } catch {
    // fire and forget — tracking should never block the user
  }
}

export async function saveOnboardingStep(patch: Partial<TasteProfile>): Promise<boolean> {
  try {
    const res = await fetch('/api/onboarding/step', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      let reason = `http_${res.status}`;
      try {
        const data = await res.json();
        if (typeof data.error === 'string') reason = data.error;
      } catch {
        /* ignore */
      }
      console.error('[naya] saveOnboardingStep failed:', reason);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[naya] saveOnboardingStep network error:', err);
    return false;
  }
}

export async function completeOnboarding(
  savedSearch?: string,
): Promise<{
  ok: boolean;
  redirect: string;
  matches: number;
  error?: string;
  configured?: boolean;
  savedSearchCreated?: boolean;
}> {
  try {
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(savedSearch ? { saved_search: savedSearch } : {}),
    });
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      const error =
        typeof data.error === 'string' ? data.error : `http_${res.status}`;
      console.error('[naya] completeOnboarding failed:', error, data);
      return { ok: false, redirect: '/for-you', matches: 0, error };
    }
    const result = {
      ok: data.ok !== false,
      redirect: typeof data.redirect === 'string' ? data.redirect : '/for-you',
      matches: typeof data.matches === 'number' ? data.matches : 0,
      configured: data.configured !== false,
      savedSearchCreated: !!data.savedSearchCreated,
      ...(typeof data.error === 'string' ? { error: data.error } : {}),
    };
    if (!result.ok || result.error) {
      console.error('[naya] completeOnboarding returned error:', result);
    } else {
      console.info('[naya] completeOnboarding ok', {
        matches: result.matches,
        savedSearchCreated: result.savedSearchCreated,
      });
    }
    return result;
  } catch (err) {
    console.error('[naya] completeOnboarding network error:', err);
    return {
      ok: false,
      redirect: '/for-you',
      matches: 0,
      error: 'network_error',
    };
  }
}

export async function getProfile(): Promise<(TasteProfile & { configured?: boolean }) | null> {
  try {
    const res = await fetch('/api/agent/profile', { headers: headers(), cache: 'no-store' });
    if (!res.ok) {
      console.error('[naya] getProfile failed:', res.status);
      return null;
    }
    const data = await res.json();
    const profile = (data.profile as TasteProfile | null) ?? null;
    if (!profile) return null;
    return { ...profile, configured: data.configured !== false };
  } catch (err) {
    console.error('[naya] getProfile network error:', err);
    return null;
  }
}

export async function saveProfile(profile: Partial<TasteProfile>): Promise<boolean> {
  const res = await fetch('/api/agent/profile', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(profile),
  });
  return res.ok;
}

export async function runAgent(): Promise<{ processed: number; matches: number; error?: string } | null> {
  const res = await fetch('/api/agent/run', { method: 'POST', headers: headers() });
  if (res.status === 402) return { processed: 0, matches: 0, error: 'paywalled' };
  if (res.status === 503) return { processed: 0, matches: 0, error: 'db_not_configured' };
  if (!res.ok) return { processed: 0, matches: 0, error: 'run_failed' };
  const data = await res.json();
  return { processed: data.processed ?? 0, matches: data.matches ?? 0 };
}

export async function getFeed(): Promise<{
  matches: AgentMatch[];
  fallback: boolean;
  paywalled: boolean;
}> {
  const res = await fetch('/api/agent/feed', { headers: headers(), cache: 'no-store' });
  if (!res.ok) return { matches: [], fallback: false, paywalled: false };
  const data = await res.json();
  return {
    matches: (data.matches as AgentMatch[]) ?? [],
    fallback: !!data.fallback,
    paywalled: !!data.paywalled,
  };
}

export async function listSavedSearches(): Promise<SavedSearchRow[]> {
  const res = await fetch('/api/agent/saved-search', { headers: headers(), cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.savedSearches as SavedSearchRow[]) ?? [];
}

export async function createSavedSearch(
  queryText: string,
): Promise<{ search: SavedSearchRow | null; error?: string; paywalled?: boolean }> {
  const res = await fetch('/api/agent/saved-search', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query_text: queryText }),
  });
  if (res.status === 402) return { search: null, paywalled: true, error: 'paywalled' };
  if (res.status === 503) return { search: null, error: 'db_not_configured' };
  if (!res.ok) {
    let error = 'save_failed';
    try {
      const data = await res.json();
      if (typeof data.error === 'string') error = data.error;
    } catch {
      /* ignore */
    }
    return { search: null, error };
  }
  const data = await res.json();
  return { search: data.savedSearch ?? null };
}

export async function deleteSavedSearch(id: number): Promise<boolean> {
  const res = await fetch(`/api/agent/saved-search?id=${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return res.ok;
}

export interface FeedbackListing {
  listing_id?: string;
  listing_url: string;
  listing_title?: string;
  brand?: string | null;
  item_type?: string | null;
  price?: number | null;
  image_url?: string | null;
  source?: string | null;
  style_tags?: string[];
  era?: string | null;
}

export async function sendFeedback(
  feedback: 'liked' | 'dismissed',
  listing: FeedbackListing,
): Promise<boolean> {
  const res = await fetch('/api/agent/feedback', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ feedback, listing }),
  });
  return res.ok;
}

export async function trackInteraction(
  interactionType: InteractionType,
  listing: FeedbackListing,
  dwellTimeMs?: number,
): Promise<void> {
  try {
    await fetch('/api/agent/interaction', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ interaction_type: interactionType, listing, dwell_time_ms: dwellTimeMs }),
      keepalive: true,
    });
  } catch {
    // fire and forget
  }
}
