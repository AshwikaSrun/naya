// ─────────────────────────────────────────────────────────────────────────────
// EASY REMOVE: this archive is fully self-contained.
//   Delete: app/archive/cluely/
// No other files in the codebase reference this route.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Archive from './Archive';

export const metadata: Metadata = {
  title: 'Cluely · The Merch They Never Made · naya',
  description:
    'A vintage archive of the merch Cluely never made. cluely, the next supreme. Curated by naya editorial. Est. 2024 · New York.',
  openGraph: {
    title: 'Cluely · The Merch They Never Made',
    description:
      'A vintage archive of the merch Cluely never made. cluely, the next supreme. Curated by naya editorial.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cluely · The Merch They Never Made',
    description:
      'A vintage archive of the merch Cluely never made. cluely, the next supreme.',
  },
  robots: { index: false, follow: false },
};

export default function CluelyArchivePage() {
  return <Archive />;
}
