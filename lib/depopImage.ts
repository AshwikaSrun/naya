/** Retina-safe defaults — Depop often returns ?w=210; we must override, not skip */
export const DEPOP_WIDTH_THUMB = 720;
export const DEPOP_WIDTH_CARD = 960;
export const DEPOP_WIDTH_HERO = 1280;

const DEPOP_CDN_MAX = 1280;

/**
 * Improves Depop image URLs for better quality display.
 * - Uses P1 (first/primary image) instead of P2, P3, etc.
 * - Always sets ?w= to at least preferredWidth (Depop returns tiny w= in JSON; we were leaving them).
 */
export function getDepopImageUrl(url: string, preferredWidth = DEPOP_WIDTH_CARD): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('depop.com')) return url;

  // Use P1 (first image) — cleaner primary photo
  let improved = url.replace(/\/P\d+(\.\w+)(\?.*)?$/i, '/P1$1');

  try {
    const parsed = new URL(improved.startsWith('//') ? `https:${improved}` : improved);
    const existingW = parseInt(
      parsed.searchParams.get('w') || parsed.searchParams.get('width') || '0',
      10
    );
    const target = Math.min(
      DEPOP_CDN_MAX,
      Math.max(preferredWidth, Number.isFinite(existingW) ? existingW : 0, 480)
    );
    parsed.searchParams.set('w', String(target));
    parsed.searchParams.delete('width');
    improved = parsed.toString();
  } catch {
    const sep = improved.includes('?') ? '&' : '?';
    if (!/[?&]w=\d+/.test(improved)) {
      improved = `${improved}${sep}w=${Math.min(DEPOP_CDN_MAX, Math.max(preferredWidth, 480))}`;
    }
  }

  return improved;
}
