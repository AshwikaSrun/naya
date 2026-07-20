'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { registerParallax } from '@/lib/scrollParallax';

/**
 * Wraps children in a layer that drifts as the page scrolls. Positive speed
 * makes the layer lag the scroll (recedes); pair alternating speeds on
 * neighbouring elements for the layered, phia-style depth.
 *
 * For imagery inside a clipped frame, overscale the inner image (e.g. scale-110)
 * so the drift never exposes an edge, and keep `clamp` modest.
 */
export default function Parallax({
  children,
  speed = 0.15,
  clamp = 120,
  axis = 'y',
  className = '',
}: {
  children: ReactNode;
  speed?: number;
  clamp?: number;
  axis?: 'y' | 'x';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return registerParallax(ref.current, speed, clamp, axis);
  }, [speed, clamp, axis]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
