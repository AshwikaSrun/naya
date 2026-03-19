import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-text-muted">
          <Link href="/" className="transition-colors hover:text-text-primary">
            back to home
          </Link>
          <span>privacy policy</span>
        </div>

        <header className="mb-10 border-b border-black/10 pb-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent-orange">
            privacy
          </p>
          <h1 className="mt-4 text-3xl text-text-primary font-[var(--font-playfair)] md:text-4xl">
            Privacy Policy
          </h1>
        </header>

        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <p>
            naya respects your privacy. We collect minimal data needed to operate the
            service, improve search quality, and understand how the product is used.
          </p>
          <p>
            We may collect usage analytics (such as pages visited and searches performed)
            and basic device information. When you click through to an external marketplace
            (eBay, Grailed, Depop, Poshmark), we log the destination URL, platform, and
            timestamp for analytics. We do not sell personal information.
          </p>
          <p>
            We use cookies for authentication and preferences. Search queries and related
            data may be stored to improve search quality and product experience.
          </p>
          <p>
            If you submit feedback or join a waitlist, we store the information you provide
            to respond and improve the product.
          </p>
          <p>
            We retain analytics data for up to 24 months, after which it is deleted or
            anonymized.
          </p>
          <p>
            Questions? Email us at{" "}
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
