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
    'The merch Cluely never made, archived as vintage. A naya editorial deadstock collection. Est. 2024 · New York.',
  openGraph: {
    title: 'Cluely — Vintage Archive',
    description:
      'The merch Cluely never made, archived as vintage. Curated by naya editorial. Est. 2024 · New York.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cluely — Vintage Archive',
    description:
      'The merch Cluely never made, archived as vintage. Curated by naya editorial.',
  },
  robots: { index: false, follow: false },
};

export default function CluelyArchivePage() {
  return <Archive />;
}
