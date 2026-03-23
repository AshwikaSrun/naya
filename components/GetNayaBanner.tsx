'use client';

import { useEffect, useState } from 'react';
import { triggerInstall, isIOSDevice } from './InstallPrompt';

type Platform = 'mobile' | 'desktop';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile/.test(ua) ? 'mobile' : 'desktop';
}

interface GetNayaBannerProps {
  variant?: 'full' | 'inline' | 'sticky';
}

function PuzzleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 00-2 2v6.5a.5.5 0 00.5.5h1a2.5 2.5 0 010 5h-1a.5.5 0 00-.5.5V22a2 2 0 002 2h5.5a.5.5 0 00.5-.5v-1a2.5 2.5 0 015 0v1a.5.5 0 00.5.5H22a2 2 0 002-2v-5.5a.5.5 0 00-.5-.5h-1a2.5 2.5 0 010-5h1a.5.5 0 00.5-.5V4a2 2 0 00-2-2h-3.5a.5.5 0 00-.5.5v1a2.5 2.5 0 01-5 0v-1a.5.5 0 00-.5-.5z" />
    </svg>
  );
}

export default function GetNayaBanner({ variant = 'full' }: GetNayaBannerProps) {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  if (dismissed) return null;

  if (variant === 'sticky') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur-md safe-bottom md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black">
            <span className="font-naya-serif text-[15px] font-light text-white">n</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-naya-sans text-[12px] font-medium text-black">get naya on your phone</p>
            <p className="font-naya-sans text-[10px] text-black/40">instant price checks while you shop</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!triggerInstall() && isIOSDevice()) setShowIOSSteps(true);
            }}
            className="font-naya-sans shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-medium lowercase tracking-[0.08em] text-white"
          >
            install
          </button>
          <button type="button" onClick={() => setDismissed(true)} className="shrink-0 text-black/20 hover:text-black/40">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {showIOSSteps && <IOSInstructions onClose={() => setShowIOSSteps(false)} />}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-4">
        {platform === 'mobile' ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black">
            <span className="font-naya-serif text-[16px] font-light text-white">n</span>
          </div>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
            <PuzzleIcon className="h-5 w-5 text-black/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {platform === 'mobile' ? (
            <>
              <p className="font-naya-sans text-[13px] font-medium text-black">add naya to your home screen</p>
              <p className="font-naya-sans text-[11px] text-black/40">price checks + deal alerts on your phone</p>
            </>
          ) : (
            <>
              <p className="font-naya-sans text-[13px] font-medium text-black">get the naya chrome extension</p>
              <p className="font-naya-sans text-[11px] text-black/40">deal scores on ebay, grailed, depop & poshmark</p>
            </>
          )}
        </div>
        {platform === 'mobile' ? (
          <button
            type="button"
            onClick={() => {
              if (!triggerInstall() && isIOSDevice()) setShowIOSSteps(true);
            }}
            className="font-naya-sans shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-medium lowercase tracking-[0.08em] text-white"
          >
            install
          </button>
        ) : (
          <a
            href="https://github.com/AshwikaSrun/naya/tree/main/extension"
            target="_blank"
            rel="noopener noreferrer"
            className="font-naya-sans shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-medium lowercase tracking-[0.08em] text-white"
          >
            get it
          </a>
        )}
        {showIOSSteps && <IOSInstructions onClose={() => setShowIOSSteps(false)} />}
      </div>
    );
  }

  // variant === 'full'
  return (
    <section className="bg-[#111] px-6 py-24 md:px-10">
      <div className="mx-auto max-w-5xl">
        {/* Mobile: app install */}
        <div className="block md:hidden">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">get the app</p>
          <h2 className="font-naya-serif mt-4 text-3xl font-light text-white">naya on your home screen.</h2>
          <p className="font-naya-sans mt-5 text-sm font-light leading-relaxed text-white/50">
            one tap and naya lives on your home screen. instant price checks, deal alerts, and cross-platform search — all from your phone.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (!triggerInstall() && isIOSDevice()) setShowIOSSteps(true);
              }}
              className="font-naya-sans rounded-full bg-white px-6 py-3.5 text-[11px] font-medium lowercase tracking-[0.08em] text-black transition-opacity hover:opacity-85"
            >
              install naya
            </button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 p-4 text-center">
              <p className="font-naya-serif text-2xl font-light text-white">4</p>
              <p className="font-naya-sans mt-1 text-[9px] uppercase tracking-widest text-white/30">platforms</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4 text-center">
              <p className="font-naya-serif text-2xl font-light text-white">1</p>
              <p className="font-naya-sans mt-1 text-[9px] uppercase tracking-widest text-white/30">search</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4 text-center">
              <p className="font-naya-serif text-2xl font-light text-white">0</p>
              <p className="font-naya-sans mt-1 text-[9px] uppercase tracking-widest text-white/30">cost</p>
            </div>
          </div>
        </div>

        {/* Desktop: chrome extension */}
        <div className="hidden md:grid md:grid-cols-[1.2fr_0.8fr] md:items-center md:gap-16">
          <div>
            <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">chrome extension</p>
            <h2 className="font-naya-serif mt-4 text-3xl font-light text-white md:text-5xl">
              naya on every listing.
            </h2>
            <p className="font-naya-sans mt-5 text-sm font-light leading-relaxed text-white/50">
              browse ebay, grailed, depop, or poshmark — naya&apos;s extension shows you the real market price, deal scores, and cheaper listings across all platforms. no extra tabs needed.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <a
                href="https://github.com/AshwikaSrun/naya/tree/main/extension"
                target="_blank"
                rel="noopener noreferrer"
                className="font-naya-sans inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-[11px] font-medium lowercase tracking-[0.08em] text-black transition-opacity hover:opacity-85"
              >
                <PuzzleIcon className="h-4 w-4" />
                add to chrome
              </a>
            </div>

            {/* Extension pin instructions */}
            <div className="mt-6 flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/10">
                <PuzzleIcon className="h-3 w-3 text-white/50" />
              </div>
              <p className="font-naya-sans text-[11px] leading-relaxed text-white/30">
                after installing, click the puzzle piece icon in your toolbar and pin naya for quick access.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10">
                  <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-naya-sans text-[13px] font-medium text-white">deal scores</p>
                  <p className="font-naya-sans text-[11px] text-white/40">see if a listing is overpriced or a steal</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10">
                  <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </div>
                <div>
                  <p className="font-naya-sans text-[13px] font-medium text-white">find cheaper</p>
                  <p className="font-naya-sans text-[11px] text-white/40">one click to search the same item across all platforms</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10">
                  <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                </div>
                <div>
                  <p className="font-naya-sans text-[13px] font-medium text-white">price alerts</p>
                  <p className="font-naya-sans text-[11px] text-white/40">save items and track prices over time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showIOSSteps && <IOSInstructions onClose={() => setShowIOSSteps(false)} />}
    </section>
  );
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="mx-4 mb-6 w-full max-w-sm overflow-hidden rounded-2xl bg-white p-8 shadow-2xl sm:mb-0">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black">
            <span className="font-naya-serif text-[18px] font-light text-white">n</span>
          </div>
          <div>
            <p className="font-naya-serif text-xl font-light text-black">install naya</p>
            <p className="font-naya-sans text-xs text-black/40">add to your home screen</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="font-naya-sans flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">1</span>
            <p className="font-naya-sans text-sm text-black/60">
              tap the share button
              <svg className="inline h-4 w-4 align-text-bottom text-blue-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" /></svg>
              {' '}in the browser toolbar
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-naya-sans flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">2</span>
            <p className="font-naya-sans text-sm text-black/60">scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-naya-sans flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">3</span>
            <p className="font-naya-sans text-sm text-black/60">tap <strong>&quot;Add&quot;</strong> — naya is on your home screen</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="font-naya-sans mt-6 w-full rounded-full bg-black py-3.5 text-[11px] font-medium lowercase tracking-[0.08em] text-white transition-opacity hover:opacity-90">got it</button>
      </div>
    </div>
  );
}
