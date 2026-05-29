// ─────────────────────────────────────────────────────────────────────────────
// EASY REMOVE: this archive is fully self-contained.
//   Delete: app/archive/cluely/
// No other files in the codebase reference this route.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Archive from './Archive';

export const metadata: Metadata = {
  title: 'Cluely — Vintage Archive · naya',
  description:
    'Deadstock pieces from Cluely (est. 2024). A naya editorial archive. New York.',
  openGraph: {
    title: 'Cluely — Vintage Archive',
    description:
      'Deadstock pieces from Cluely (est. 2024). Curated by naya editorial.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cluely — Vintage Archive',
    description:
      'Deadstock pieces from Cluely (est. 2024). Curated by naya editorial.',
  },
  robots: { index: false, follow: false },
};

export default function CluelyArchivePage() {
  return <Archive />;
}
