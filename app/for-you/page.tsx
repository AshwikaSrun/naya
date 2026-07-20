'use client';

import { Suspense } from 'react';
import ForYouClient from './ForYouClient';

export default function ForYouRoute() {
  return (
    <Suspense
      fallback={
        <div className="font-naya-sans flex min-h-screen items-center justify-center text-sm text-black/30">
          loading your agent…
        </div>
      }
    >
      <ForYouClient />
    </Suspense>
  );
}
