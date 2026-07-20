import type { Guide } from '@/lib/guides';

export default function GuideIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: Guide['icon'];
  className?: string;
}) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    strokeWidth: 1.6,
    className,
  } as const;

  if (name === 'fit') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l4-4 14 14-4 4L3 7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l2 2m1-5l2 2m1 1l2 2m1 1l2 2" />
      </svg>
    );
  }
  if (name === 'leaf') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-8 6-14 16-14 0 10-6 16-14 16a8 8 0 01-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15c2.5-3 5-4.5 8-5" />
      </svg>
    );
  }
  if (name === 'shield') {
    return (
      <svg {...common}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l2 2 3.5-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
