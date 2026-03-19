/**
 * Improves Depop image URLs for better quality display.
 * - Uses P1 (first/primary image) instead of P2, P3, etc.
 * - Appends width param for higher resolution when supported by CDN.
 */
export function getDepopImageUrl(url: string, preferredWidth = 800): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('depop.com')) return url;

  // Use P1 (first image) — cleaner primary photo
  let improved = url.replace(/\/P\d+(\.\w+)(\?.*)?$/i, '/P1$1');

  // Depop CDN may support ?w= for width; append for higher-res (ignored if unsupported)
  try {
    const parsed = new URL(improved);
    if (!parsed.searchParams.has('w') && !parsed.searchParams.has('width')) {
      parsed.searchParams.set('w', String(preferredWidth));
      improved = parsed.toString();
    }
  } catch {
    // If URL parsing fails, return the P1-improved version
  }

  return improved;
}
