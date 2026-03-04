import Link from 'next/link';
import ConciergeChat from '@/components/ConciergeChat';

export default function AppPage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>concierge</span>
        </div>

        <header className="mb-10 border-b border-black/10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent-blue">
            concierge mode
          </p>
          <h1 className="mt-4 text-3xl text-text-primary font-[var(--font-playfair)] md:text-4xl">
            Your AI shopping assistant
          </h1>
          <p className="mt-4 text-sm text-text-secondary leading-relaxed">
            Ask about fit, quality, price, and styling. We’re building the concierge
            experience to make second-hand shopping effortless.
          </p>
        </header>

        <ConciergeChat />
      </div>
    </div>
  );
}
