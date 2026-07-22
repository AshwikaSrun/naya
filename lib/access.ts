/** Shared waitlist / trial / agent access constants. */

export const WAITLIST_COOKIE = 'naya-waitlist';
export const ACCESS_TOKEN_COOKIE = 'naya-token';
/** Set when taste onboarding finishes — unlocks the 5 trial searches. */
export const ONBOARDED_COOKIE = 'naya-onboarded';
export const ONBOARDED_STORAGE_KEY = 'naya-onboarded';

/** Soft trial: marketplace searches after waitlist + onboarding (not Purdue/invite). */
export const TRIAL_SEARCH_LIMIT = 5;

export const EMAIL_STORAGE_KEY = 'naya-user-email';
export const SEARCH_COUNT_KEY = 'naya-search-count';
/** Set when an invite code unlocks unlimited + agent. */
export const UNLIMITED_STORAGE_KEY = 'naya-unlimited';

/** Client: finished email + taste quiz (trial unlock). */
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ONBOARDED_STORAGE_KEY) === '1';
}

export function isPurdueEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith('@purdue.edu');
}

/**
 * Full agent access + unlimited search: Purdue email or invite-code unlock.
 * Waitlist-only users create a profile but do NOT get this.
 */
export function hasUnlimitedClientAccess(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(UNLIMITED_STORAGE_KEY) === '1') return true;
  return isPurdueEmail(window.localStorage.getItem(EMAIL_STORAGE_KEY));
}

export function hasAgentAccess(): boolean {
  return hasUnlimitedClientAccess();
}

/** Cookie value looks like a Purdue / invite unlock (not a waitlist trial cookie). */
export function isUnlimitedToken(token: string | undefined | null): boolean {
  if (!token) return false;
  if (token.startsWith('purdue:')) return true;
  // Invite codes are raw values (not emails); waitlist cookies are emails.
  if (token.includes('@')) return false;
  return token.length > 0;
}
