'use client';

import { useCallback, useEffect, useState } from 'react';
import { isIOSDevice, isStandaloneMode } from '@/components/InstallPrompt';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotifyBanner() {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [installBannerActive, setInstallBannerActive] = useState(false);
  const [postInstall, setPostInstall] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { setSubscribed(true); return true; }
    } catch { /* ignore */ }
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncInstallBanner = () => {
      setInstallBannerActive(document.body.hasAttribute('data-naya-install-banner'));
    };

    syncInstallBanner();

    const observer = new MutationObserver(syncInstallBanner);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-naya-install-banner'] });

    const onInstalled = () => {
      setPostInstall(true);
      localStorage.removeItem('naya-notify-dismissed');
      setShow(true);
    };
    window.addEventListener('naya-app-installed', onInstalled);

    return () => {
      observer.disconnect();
      window.removeEventListener('naya-app-installed', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (postInstall) return;
    if (installBannerActive) return;

    const dismissed = localStorage.getItem('naya-notify-dismissed');
    if (dismissed) return;

    const hasNotif = 'Notification' in window;
    if (!hasNotif) return;

    if (Notification.permission === 'granted') {
      checkSubscription().then((alreadySubbed) => {
        if (!alreadySubbed) setShow(true);
      });
      return;
    }

    if (Notification.permission === 'denied') return;

    const timer = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(timer);
  }, [checkSubscription, installBannerActive, postInstall]);

  const isIosNonStandalone = typeof window !== 'undefined' && isIOSDevice() && !isStandaloneMode();
  const visible = show && !installBannerActive && !isIosNonStandalone;

  useEffect(() => {
    if (visible) {
      document.body.setAttribute('data-naya-notify-banner', '1');
    } else {
      document.body.removeAttribute('data-naya-notify-banner');
    }
    return () => document.body.removeAttribute('data-naya-notify-banner');
  }, [visible]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setShow(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) { setShow(false); return; }
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) { setShow(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: json, alertType: 'purdue_deals' }),
      });

      setSubscribed(true);
      setTimeout(() => setShow(false), 2500);
    } catch {
      setShow(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('naya-notify-dismissed', '1');
  };

  if (!visible) return null;

  if (subscribed) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[90] safe-bottom">
        <div className="mx-4 mb-4 rounded-2xl bg-black px-5 py-4 text-center shadow-vibrant">
          <p className="font-naya-sans text-sm text-white/90">you&apos;re getting deal alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] safe-bottom">
      <div className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-vibrant">
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CEB888]/15 text-base" aria-hidden>
            ✦
          </div>
          <div className="flex-1">
            <p className="font-naya-serif text-base font-light text-text-primary">
              {postInstall ? 'one more thing — get deal alerts' : 'get purdue deal alerts'}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {postInstall
                ? "we'll notify you when we find something great"
                : 'daily finds, campus style drops, vintage steals'}
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
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 border-l border-black/5 py-3 text-[11px] font-medium lowercase tracking-[0.08em] text-text-primary transition-colors hover:bg-black/[0.02] disabled:opacity-40"
          >
            {loading ? 'one sec…' : 'notify me'}
          </button>
        </div>
      </div>
    </div>
  );
}
