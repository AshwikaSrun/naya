import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>terms</span>
        </div>

        <header className="mb-10 border-b border-black/10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent-orange">
            terms
          </p>
          <h1 className="mt-4 text-3xl text-text-primary font-[var(--font-playfair)] md:text-4xl">
            Terms of Service
          </h1>
        </header>

        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <p>
            naya provides a search experience across third-party resale platforms. Listings
            are owned by their respective sellers and marketplaces.
          </p>
          <p>
            Prices and availability may change. Always verify details on the original
            listing before purchasing. When you click through to an external marketplace,
            you leave naya and are subject to that site&apos;s terms and policies.
          </p>
          <p>
            By using naya, you agree not to misuse the service, attempt to disrupt
            functionality, or violate applicable laws.
          </p>
          <p>
            Questions? Email{" "}
            <a className="border-b border-black/20 text-text-primary" href="mailto:nayaeditorialshop@gmail.com">
              nayaeditorialshop@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
