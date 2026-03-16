'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __nayaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function triggerInstall() {
  const prompt = window.__nayaInstallPrompt;
  if (prompt) {
    prompt.prompt();
    prompt.userChoice.then(() => {
      window.__nayaInstallPrompt = null;
      window.dispatchEvent(new Event('naya-install-used'));
    });
    return true;
  }
  return false;
}

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneMode());
    setIsIOS(isIOSDevice());

    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(evt);
      window.__nayaInstallPrompt = evt;
    };
    window.addEventListener('beforeinstallprompt', handler);

    const onUsed = () => { setDeferredPrompt(null); setShowBanner(false); };
    window.addEventListener('naya-install-used', onUsed);

    const dismissed = localStorage.getItem('naya-install-dismissed');
    const standalone = isStandaloneMode();
    if (!dismissed && !standalone) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('naya-install-used', onUsed);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('naya-install-used', onUsed);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('naya-install-dismissed', '1');
  }, []);

  if (isStandalone || !showBanner) return null;

  // iOS: show manual instructions
  if (isIOS && !deferredPrompt) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] safe-bottom">
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-vibrant">
          <div className="flex items-start gap-4 p-5">
            <img src="/icon-192.png" alt="naya" className="h-12 w-12 rounded-xl" />
            <div className="flex-1">
              <p className="font-naya-serif text-base font-light text-text-primary">
                add naya to your home screen
              </p>
              <p className="mt-1 text-xs text-text-muted">
                tap{' '}
                <svg className="inline h-4 w-4 align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
                </svg>{' '}
                then &quot;Add to Home Screen&quot;
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-0.5 rounded-full p-1.5 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile: native install prompt
  if (deferredPrompt) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] safe-bottom">
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-vibrant">
          <div className="flex items-center gap-4 p-5">
            <img src="/icon-192.png" alt="naya" className="h-12 w-12 rounded-xl" />
            <div className="flex-1">
              <p className="font-naya-serif text-base font-light text-text-primary">
                get the naya app
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                add to your home screen for the full experience
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex border-t border-black/5">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-3 text-[11px] font-medium lowercase tracking-[0.08em] text-black/40 transition-colors hover:bg-black/[0.02] hover:text-black/60"
            >
              not now
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 border-l border-black/5 py-3 text-[11px] font-medium lowercase tracking-[0.08em] text-text-primary transition-colors hover:bg-black/[0.02]"
            >
              install
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: extension prompt (no deferred prompt available)
  if (!isIOS && typeof window !== 'undefined' && !/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] safe-bottom">
        <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-vibrant">
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
              <svg className="h-5 w-5 text-black/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 00-2 2v6.5a.5.5 0 00.5.5h1a2.5 2.5 0 010 5h-1a.5.5 0 00-.5.5V22a2 2 0 002 2h5.5a.5.5 0 00.5-.5v-1a2.5 2.5 0 015 0v1a.5.5 0 00.5.5H22a2 2 0 002-2v-5.5a.5.5 0 00-.5-.5h-1a2.5 2.5 0 010-5h1a.5.5 0 00.5-.5V4a2 2 0 00-2-2h-3.5a.5.5 0 00-.5.5v1a2.5 2.5 0 01-5 0v-1a.5.5 0 00-.5-.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-naya-serif text-base font-light text-text-primary">
                get the naya extension
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                deal scores and price checks on every listing
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full p-1.5 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex border-t border-black/5">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-3 text-[11px] font-medium lowercase tracking-[0.08em] text-black/40 transition-colors hover:bg-black/[0.02] hover:text-black/60"
            >
              not now
            </button>
            <a
              href="https://github.com/AshwikaSrun/naya/tree/main/extension"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 border-l border-black/5 py-3 text-center text-[11px] font-medium lowercase tracking-[0.08em] text-text-primary transition-colors hover:bg-black/[0.02]"
            >
              get extension
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
