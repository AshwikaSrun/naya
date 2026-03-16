import Link from 'next/link';
import ConciergeChat from '@/components/ConciergeChat';

export default function AppPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">naya</Link>
          <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
            <Link href="/deals" className="px-3 py-1.5 transition-colors hover:text-black">deals</Link>
            <Link href="/college" className="px-3 py-1.5 transition-colors hover:text-black">campus</Link>
            <Link href="/insights" className="px-3 py-1.5 transition-colors hover:text-black">insights</Link>
            <Link href="/app" className="px-3 py-1.5 text-black font-medium">concierge</Link>
            <Link href="/profile" className="px-3 py-1.5 transition-colors hover:text-black">profile</Link>
          </nav>
        </div>

        <header className="mb-10 border-b border-black/5 pb-8">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">
            concierge
          </p>
          <h1 className="font-naya-serif mt-3 text-3xl font-light text-black md:text-5xl">
            your AI shopping assistant.
          </h1>
          <p className="font-naya-sans mt-4 text-sm font-light leading-relaxed text-black/40">
            describe what you&apos;re looking for — fit, style, price, vibe — and naya will find it for you.
          </p>
        </header>

        <ConciergeChat />
      </div>
    </div>
  );
}
