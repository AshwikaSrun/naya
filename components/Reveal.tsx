'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Scroll-reveal wrapper. Children fade and rise into view once, the first time
 * they enter the viewport. Honors prefers-reduced-motion via globals.css.
 *
 * `delay` staggers siblings for a choreographed feel. `as` lets callers keep
 * semantic markup (e.g. a <section>) without an extra wrapper div.
 */
type RevealVariant = 'up' | 'left' | 'right' | 'scale';

const VARIANT_CLASS: Record<RevealVariant, string> = {
  up: '',
  left: 'reveal--left',
  right: 'reveal--right',
  scale: 'reveal--scale',
};

export default function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error – ref type narrows per tag, all are HTMLElement
      ref={ref}
      className={`reveal ${VARIANT_CLASS[variant]} ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
