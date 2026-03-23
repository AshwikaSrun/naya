'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = [
  { id: 'missing-brand', label: 'missing brand' },
  { id: 'bad-results', label: 'bad results' },
  { id: 'scraper-bug', label: 'scraper bug' },
  { id: 'feature-request', label: 'feature request' },
  { id: 'other', label: 'other' },
];

type Phase = 'closed' | 'form' | 'sending' | 'done';

export default function FeedbackWidget() {
  const [phase, setPhase] = useState<Phase>('closed');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [bannerActive, setBannerActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('naya-user-email');
    if (stored) setEmail(stored);

    const sync = () => {
      const has = document.body.hasAttribute('data-naya-install-banner') ||
                  document.body.hasAttribute('data-naya-notify-banner');
      setBannerActive(has);
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-naya-install-banner', 'data-naya-notify-banner'],
    });
    return () => observer.disconnect();
  }, []);

  const reset = () => {
    setCategory('');
    setMessage('');
    setPhase('closed');
  };

  const handleSubmit = async () => {
    if (!category) return;
    setPhase('sending');

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message,
          email,
          page: window.location.pathname + window.location.search,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {
      // Still show success — we don't want to frustrate users
    }

    setPhase('done');
    setTimeout(() => reset(), 2500);
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setPhase(phase === 'closed' ? 'form' : 'closed')}
        className={`fixed left-6 z-[80] flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-black/20 ${bannerActive ? 'bottom-36 max-sm:bottom-32' : 'bottom-6'}`}
        aria-label="Send feedback"
      >
        <svg className="h-4 w-4 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        <span className="text-[10px] lowercase tracking-[0.1em] text-black/50">feedback</span>
      </button>

      {/* Panel */}
      {phase !== 'closed' && (
        <div className={`fixed left-6 z-[80] w-[340px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl transition-all duration-300 ${bannerActive ? 'bottom-[12.5rem] max-sm:bottom-[11rem]' : 'bottom-20'}`}>

          {/* Done state */}
          {phase === 'done' && (
            <div className="flex flex-col items-center px-6 py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-naya-serif mt-4 text-lg font-light text-black">thank you.</p>
              <p className="font-naya-sans mt-1 text-xs text-black/40">your feedback helps us build something better.</p>
            </div>
          )}

          {/* Form state */}
          {(phase === 'form' || phase === 'sending') && (
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <h3 className="font-naya-serif text-lg font-light text-black">send us feedback</h3>
                <button type="button" onClick={reset} className="flex h-7 w-7 items-center justify-center rounded-full text-black/30 transition-colors hover:bg-black/5 hover:text-black/60">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="font-naya-sans mt-1 text-[11px] text-black/40">what&apos;s on your mind?</p>

              {/* Category chips */}
              <div className="mt-5 flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] lowercase tracking-[0.08em] transition-all ${
                      category === cat.id
                        ? 'border-black bg-black text-white'
                        : 'border-black/10 text-black/50 hover:border-black/25 hover:text-black/70'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="tell us more (optional)"
                rows={3}
                className="font-naya-sans mt-4 w-full resize-none rounded-xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-black placeholder:text-black/25 focus:border-black/25 focus:outline-none"
              />

              {/* Email */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email (optional)"
                className="font-naya-sans mt-2 w-full rounded-xl border border-black/10 bg-neutral-50 px-4 py-2.5 text-sm text-black placeholder:text-black/25 focus:border-black/25 focus:outline-none"
              />

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!category || phase === 'sending'}
                className="mt-4 w-full rounded-full bg-black py-3 text-[11px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-30"
              >
                {phase === 'sending' ? 'sending...' : 'send feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
