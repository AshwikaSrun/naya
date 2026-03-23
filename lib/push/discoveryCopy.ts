/**
 * Rotating “discovery” titles + social copy for daily Purdue / campus-style pushes.
 * Deterministic per (runDate + listing title) so the same send isn’t chaotic.
 */

export function discoveryContentHash(runDate: string, dealTitle: string): number {
  const s = `${runDate}\0${dealTitle}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

const NOTIFICATION_TITLES = [
  'check this deal · naya',
  'purdue students are wearing…',
  "don't sleep on this one",
  'spotted for boilermakers',
  'campus style find',
  'naya discovery',
  'this deal hits different',
  'see what is on campus',
] as const;

const BODY_LEADS = [
  'Look what Purdue students are hunting — ',
  'Boilermaker vintage energy — ',
  'Worth a scroll — ',
  'This one’s been moving near campus — ',
  'Check this deal out — ',
  'Campus crowd would wear this — ',
  'Your daily discovery — ',
  'Vintage pick you’ll want to see — ',
] as const;

export function buildDiscoveryPushPayload(opts: {
  dealTitle: string;
  price: number;
  sourceLabel: string;
  runDate: string;
}): { title: string; body: string } {
  const h = discoveryContentHash(opts.runDate, opts.dealTitle);
  const title = NOTIFICATION_TITLES[h % NOTIFICATION_TITLES.length];
  const lead = BODY_LEADS[(h >> 4) % BODY_LEADS.length];
  const suffix =
    opts.sourceLabel.toLowerCase().includes('boiler') ? ' · Boiler Vintage' : '';
  const body = `${lead}${truncate(opts.dealTitle, 52)} — $${opts.price.toFixed(0)}${suffix}`;
  return { title, body };
}
