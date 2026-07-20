'use client';

import { useRef, type ReactNode } from 'react';

/**
 * Magnetic hover — the element eases toward the cursor while hovered, then
 * springs back on leave. A small, tactile micro-interaction used on primary
 * CTAs. No-ops on touch / reduced-motion (pointer events simply won't fire the
 * same way, and the transition stays cheap).
 */
export default function Magnetic({
  children,
  strength = 0.35,
  className = '',
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0, 0)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ transition: 'transform 0.45s cubic-bezier(0.16, 0.84, 0.44, 1)', display: 'inline-flex' }}
    >
      {children}
    </div>
  );
}
