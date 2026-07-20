import crypto from 'crypto';

/**
 * Stable identifier for an (otherwise ephemeral) listing, derived from its URL.
 * Used to dedupe agent_match / user_listing_interaction rows since there is no
 * persistent listings table. Strips query strings/trailing slashes so the same
 * item scraped twice hashes the same.
 */
export function listingIdFromUrl(url: string): string {
  const cleaned = (url || '')
    .trim()
    .toLowerCase()
    .split('#')[0]
    .split('?')[0]
    .replace(/\/+$/, '');
  return crypto.createHash('sha1').update(cleaned).digest('hex').slice(0, 20);
}
