'use client';

import { useEffect, useState } from 'react';
import type { GuideSection } from '@/lib/guides';

/**
 * Sticky table of contents with scroll-spy. Highlights the section currently
 * in view and smooth-scrolls on click.
 */
export default function GuideToc({ sections }: { sections: GuideSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav className="font-naya-sans space-y-1 text-[13px]">
      <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-black/40">on this page</p>
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`block border-l-2 py-1.5 pl-4 leading-snug transition-colors ${
              isActive
                ? 'border-black font-medium text-black'
                : 'border-black/10 text-black/45 hover:text-black/70'
            }`}
          >
            {s.heading}
          </a>
        );
      })}
    </nav>
  );
}
