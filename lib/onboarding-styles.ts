/** Curated lifestyle photos for the onboarding style picker (one unique image per tag). */
export const STYLE_IMAGES: Record<string, string> = {
  streetwear: '/styles/streetwear.png',
  workwear: '/styles/workwear.png',
  gorpcore: '/styles/gorpcore.png',
  blokecore: '/styles/blokecore.png',
  y2k: '/styles/y2k.png',
  grunge: '/styles/grunge.png',
  preppy: '/styles/preppy.png',
  minimalist: '/styles/minimalist.png',
  coastal: '/styles/coastal.png',
  skater: '/styles/skater.png',
  cottagecore: '/styles/cottagecore.png',
  boho: '/styles/boho.png',
  athleisure: '/styles/athleisure.png',
  goth: '/styles/goth.png',
};

export function styleTileImage(name: string, fallback: string): string {
  return STYLE_IMAGES[name] ?? fallback;
}
