// ─────────────────────────────────────────────────────────────────────────────
// EASY REMOVE: this archive is fully self-contained.
//   Delete: app/archive/cluely/
// No other files in the codebase reference this route.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Archive from './Archive';

export const metadata: Metadata = {
  title: 'Cluely · The Next Supreme · naya',
  description:
    'Cluely, the next Supreme. A vintage archive of the merch they never made. Curated by naya editorial. Est. 2024 · New York.',
  openGraph: {
    title: 'Cluely · The Next Supreme',
    description:
      'A vintage archive of the merch Cluely never made. Curated by naya editorial. Est. 2024 · New York.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cluely · The Next Supreme',
    description:
      'A vintage archive of the merch Cluely never made. Curated by naya editorial.',
  },
  robots: { index: false, follow: false },
};

export default function CluelyArchivePage() {
  return <Archive />;
}
