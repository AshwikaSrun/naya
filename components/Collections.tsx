'use client';

import Link from 'next/link';
import Reveal from './Reveal';
import Parallax from './Parallax';

type Collection = { name: string; count: number; images: string[] };

const COLLECTIONS: Collection[] = [
  {
    name: 'Fall faves',
    count: 44,
    images: [
      '/collections/fall-1.png',
      '/collections/fall-2.png',
      '/collections/fall-3.png',
      '/collections/fall-4.png',
    ],
  },
  {
    name: 'Denim archive',
    count: 23,
    images: ['/finds/denim1.jpg', '/finds/denim2.jpg', '/finds/denim3.jpg', '/finds/denim.jpg'],
  },
  {
    name: 'Campus core',
    count: 104,
    images: [
      '/collections/college-1.png',
      '/collections/college-2.png',
      '/collections/college-3.png',
      '/collections/college-4.png',
    ],
  },
  {
    name: 'Going out',
    count: 96,
    images: [
      '/collections/going-out-1.png',
      '/collections/going-out-2.png',
      '/collections/going-out-3.png',
      '/collections/going-out-4.png',
    ],
  },
];

export default function Collections() {
  return (
    <section className="bg-[#f7f4ee] px-6 py-28 md:px-10 md:py-44">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <h2 className="font-naya-serif text-balance text-[clamp(2.75rem,6vw,5rem)] font-light leading-[1.0] tracking-[-0.035em] text-black">
              save what you love.{' '}
              <span className="italic text-black/55">we&apos;ll remember.</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-naya-sans mx-auto mt-7 max-w-md text-[15px] leading-[1.6] text-black/50">
              Every save teaches naya your taste. Better matches, every time.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {COLLECTIONS.map((c, i) => (
            <Reveal key={c.name} variant="scale" delay={i * 110}>
              <Link href="/finds" className="group block">
                <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-[24px] bg-black/5 p-1.5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)] transition-transform duration-500 group-hover:-translate-y-1.5">
                  {c.images.map((img, j) => (
                    <div key={j} className="aspect-square overflow-hidden rounded-[14px]">
                      <Parallax speed={j % 2 === 0 ? 0.04 : -0.04} clamp={18} className="h-full w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt=""
                          className="-mt-[8%] h-[116%] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      </Parallax>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="font-naya-serif text-xl font-light text-black">{c.name}</p>
                  <p className="font-naya-sans mt-0.5 text-[12px] text-black/45">{c.count} items</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
