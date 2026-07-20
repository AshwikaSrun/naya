'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Buttery momentum scrolling — the single biggest contributor to the "premium,
 * alive" feel of sites like phia. Lenis intercepts wheel/touch and eases the
 * native scroll position, which our parallax engine reads from directly.
 *
 * Fully disabled under prefers-reduced-motion (native scroll takes over).
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      // expo-out — long, luxurious glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      wheelMultiplier: 1,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
