/** Derive "complete the look" / styling search from product title */

const SIZE_PATTERN = /\b(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,2}x\d{1,2}|\d{2})\b/gi;
const COLOR_PATTERN = /\b(black|white|blue|red|green|navy|grey|gray|brown|beige|pink|cream|tan|olive|burgundy|maroon)\b/gi;

export function deriveCompleteTheLookQuery(title: string): string {
  let q = title
    .toLowerCase()
    .replace(SIZE_PATTERN, '')
    .replace(COLOR_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Ensure vintage if not present
  if (!q.includes('vintage') && !q.includes('y2k') && !q.includes('retro')) {
    q = `vintage ${q}`;
  }

  // Take first 4-5 meaningful words
  const words = q.split(/\s+/).filter((w) => w.length > 1).slice(0, 5);
  return words.join(' ') || 'vintage streetwear';
}
