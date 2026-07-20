/** Curated onboarding brand grid — order matches the brand picker mock. */
export const ONBOARDING_BRANDS = [
  'nike',
  'carhartt',
  'levis',
  'the north face',
  'adidas',
  'polo ralph lauren',
  'patagonia',
  'stussy',
  'supreme',
  'champion',
  'new balance',
  'dickies',
  'arcteryx',
  'stone island',
  'uniqlo',
  'brandy melville',
  'tommy hilfiger',
  'columbia',
  'vans',
  'converse',
] as const;

/** Logo assets for the brand picker (white/black mark on square canvas). */
export const BRAND_LOGOS: Record<string, string> = {
  nike: '/brands/logos/nike.png',
  carhartt: '/brands/logos/carhartt.png',
  levis: '/brands/logos/levis.png',
  'the north face': '/brands/logos/north-face.png',
  adidas: '/brands/logos/adidas.png',
  'polo ralph lauren': '/brands/logos/polo.png',
  patagonia: '/brands/logos/patagonia.png',
  stussy: '/brands/logos/stussy.png',
  supreme: '/brands/logos/supreme.png',
  champion: '/brands/logos/champion.png',
  'new balance': '/brands/logos/new-balance.png',
  dickies: '/brands/logos/dickies.png',
  arcteryx: '/brands/logos/arcteryx.png',
  'stone island': '/brands/logos/stone-island.png',
  uniqlo: '/brands/logos/uniqlo.png',
  'brandy melville': '/brands/logos/brandy-melville.png',
  'tommy hilfiger': '/brands/logos/tommy-hilfiger.png',
  columbia: '/brands/logos/columbia.png',
  vans: '/brands/logos/vans.png',
  converse: '/brands/logos/converse.png',
};

/** Brands whose logo files already sit on a dark canvas. */
export const BRAND_LOGO_DARK = new Set([
  'nike',
  'adidas',
  'arcteryx',
  'columbia',
]);
