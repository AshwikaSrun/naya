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
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black">
            <span className="text-[14px] font-light italic text-white">n</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-black">get naya on your phone</p>
            <p className="text-[10px] text-black/40">instant price checks while you shop</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!triggerInstall() && isIOSDevice()) setShowIOSSteps(true);
            }}
            className="shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white"
          >
            install
          </button>
          <button type="button" onClick={() => setDismissed(true)} className="shrink-0 text-black/20 hover:text-black/40">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {showIOSSteps && <IOSInstructions onClose={() => setShowIOSSteps(false)} />}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black">
          <span className="text-[16px] font-light italic text-white">n</span>
        </div>
        <div className="flex-1 min-w-0">
          {platform === 'mobile' ? (
            <>
              <p className="text-[13px] font-semibold text-black">add naya to your home screen</p>
              <p className="text-[11px] text-black/40">price checks + deal alerts on your phone</p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-black">get the naya chrome extension</p>
              <p className="text-[11px] text-black/40">deal scores on ebay, grailed, depop & poshmark</p>
            </>
          )}
        </div>
        {platform === 'mobile' ? (
          <button
            type="button"
            onClick={() => {
              if (!triggerInstall() && isIOSDevice()) setShowIOSSteps(true);
            }}
            className="shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white"
          >
            install
          </button>
        ) : (
          <a
            href="https://github.com/AshwikaSrun/naya/tree/main/extension"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white"
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
          <p className="mt-5 text-sm font-light leading-relaxed text-white/50">
            one tap and naya lives on your home screen. instant price checks, deal alerts, and cross-platform search — all from your phone.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (!triggerInstall() && isIOSDevice()) setShowIOSSteps(true);
              }}
              className="rounded-full bg-white px-6 py-3.5 text-[11px] font-semibold lowercase tracking-[0.12em] text-black transition-opacity hover:opacity-85"
            >
              install naya
            </button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 p-4 text-center">
              <p className="text-2xl font-light text-white">4</p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">platforms</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4 text-center">
              <p className="text-2xl font-light text-white">1</p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">search</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4 text-center">
              <p className="text-2xl font-light text-white">0</p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">cost</p>
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
            <p className="mt-5 text-sm font-light leading-relaxed text-white/50">
              browse ebay, grailed, depop, or poshmark — naya&apos;s extension shows you the real market price, deal scores, and cheaper listings across all platforms. no extra tabs needed.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <a
                href="https://github.com/AshwikaSrun/naya/tree/main/extension"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-[11px] font-semibold lowercase tracking-[0.12em] text-black transition-opacity hover:opacity-85"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-3.894L1.93 5.47zm22.038.53H14.34l-6.26 10.847a5.5 5.5 0 0 0 4.044 1.678 5.509 5.509 0 0 0 5.39-4.372L22.67 5.99A12.145 12.145 0 0 0 23.969 6zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728z"/></svg>
                add to chrome
              </a>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <span className="text-xl">&#128293;</span>
                <div>
                  <p className="text-[13px] font-semibold text-white">deal scores</p>
                  <p className="text-[11px] text-white/40">see if a listing is overpriced or a steal</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <span className="text-xl">&#128269;</span>
                <div>
                  <p className="text-[13px] font-semibold text-white">find cheaper</p>
                  <p className="text-[11px] text-white/40">one click to search the same item across all platforms</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <span className="text-xl">&#128278;</span>
                <div>
                  <p className="text-[13px] font-semibold text-white">price alerts</p>
                  <p className="text-[11px] text-white/40">save items and track prices over time</p>
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
            <span className="text-[18px] font-light italic text-white">n</span>
          </div>
          <div>
            <p className="font-naya-serif text-xl font-light text-black">install naya</p>
            <p className="text-xs text-black/40">add to your home screen</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">1</span>
            <p className="text-sm text-black/60">
              tap the share button
              <svg className="inline h-4 w-4 align-text-bottom text-blue-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" /></svg>
              {' '}in the browser toolbar
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">2</span>
            <p className="text-sm text-black/60">scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">3</span>
            <p className="text-sm text-black/60">tap <strong>&quot;Add&quot;</strong> — naya is on your home screen</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-black py-3.5 text-[11px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90">got it</button>
      </div>
    </div>
  );
}
