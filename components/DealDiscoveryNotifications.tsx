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

type Props = {
  variant?: 'campus' | 'profile' | 'deals';
};

export default function DealDiscoveryNotifications({ variant = 'campus' }: Props) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prod = process.env.NODE_ENV === 'production';
    const hasPush =
      prod &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      (window.isSecureContext || window.location.hostname === 'localhost');
    setSupported(!!hasPush);
    if (hasPush) {
      refreshSubscription();
    }
  }, [refreshSubscription]);

  const handleSubscribe = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMessage('notifications are off — enable them in your browser settings to get alerts.');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) {
        setMessage('alerts are not set up on the server yet.');
        setLoading(false);
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        setMessage('could not load push configuration.');
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      const save = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: json,
          alertType: 'purdue_deals',
        }),
      });

      if (!save.ok) {
        await sub.unsubscribe().catch(() => {});
        setMessage('could not save your subscription. try again later.');
        setLoading(false);
        return;
      }

      setSubscribed(true);
      setMessage(
        "you're in — we'll send discovery pings: deals, campus style, and what boilermakers are wearing."
      );
    } catch (e) {
      console.error(e);
      setMessage('something went wrong. try again from the installed app.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage('discovery alerts turned off.');
    } catch {
      setMessage('could not turn off alerts.');
    } finally {
      setLoading(false);
    }
  };

  const ios = typeof window !== 'undefined' && isIOSDevice();
  const standalone = typeof window !== 'undefined' && isStandaloneMode();

  const headline =
    variant === 'deals'
      ? 'deal discoveries + purdue picks'
      : variant === 'profile'
        ? 'daily discoveries'
        : 'deal discoveries';

  const subcopy =
    variant === 'deals'
      ? 'once a day: a standout deal or campus-style find — sometimes straight from what purdue students are searching. tap to open in naya.'
      : variant === 'profile'
        ? 'check this deal out, see what boilermakers are wearing, and catch boiler vintage when it pops. one friendly ping a day from the installed app.'
        : 'check this deal out, campus style finds, and what purdue students are into — one discovery notification a day. tap to open the listing.';

  if (!supported) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div
          className={
            variant === 'deals' || variant === 'profile'
              ? 'rounded-xl border border-black/10 bg-neutral-50 px-5 py-4 text-sm text-black/45'
              : 'rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-sm text-white/50 backdrop-blur-sm'
          }
        >
          Discovery alerts work on the{' '}
          <strong
            className={
              variant === 'deals' || variant === 'profile' ? 'text-black/70' : 'text-white/80'
            }
          >
            live site
          </strong>{' '}
          with the app installed (production).
        </div>
      );
    }
    return null;
  }

  const box =
    variant === 'campus'
      ? 'rounded-2xl border border-[#CEB888]/35 bg-black/20 px-6 py-5 backdrop-blur-md'
      : 'rounded-2xl border border-black/10 bg-[#faf9f7] px-6 py-5';

  const iconBg =
    variant === 'campus' ? 'bg-[#CEB888]/20 text-lg' : 'bg-black/5 text-lg';

  return (
    <div className={box}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
          aria-hidden
        >
          ✦
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              variant === 'campus'
                ? 'font-naya-serif text-lg font-light text-white'
                : 'font-naya-serif text-lg font-light text-black'
            }
          >
            {headline}
          </p>
          <p
            className={
              variant === 'campus'
                ? 'font-naya-sans mt-1 text-xs leading-relaxed text-white/55'
                : 'font-naya-sans mt-1 text-xs leading-relaxed text-black/45'
            }
          >
            {subcopy}
          </p>
          {ios && !standalone && (
            <p
              className={`font-naya-sans mt-2 text-[11px] ${variant === 'campus' ? 'text-amber-200/90' : 'text-amber-800/90'}`}
            >
              on iPhone: add naya to your <strong>home screen</strong> first, then enable alerts here.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!subscribed ? (
              <button
                type="button"
                disabled={loading || (ios && !standalone)}
                onClick={handleSubscribe}
                className={
                  variant === 'campus'
                    ? 'rounded-full bg-[#CEB888] px-5 py-2.5 text-[10px] font-medium lowercase tracking-[0.1em] text-black transition-opacity hover:opacity-90 disabled:opacity-40'
                    : 'rounded-full bg-black px-5 py-2.5 text-[10px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-40'
                }
              >
                {loading ? 'one sec…' : 'notify me'}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleUnsubscribe}
                className={
                  variant === 'campus'
                    ? 'rounded-full border border-white/25 px-5 py-2.5 text-[10px] font-medium lowercase tracking-[0.1em] text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:opacity-40'
                    : 'rounded-full border border-black/15 px-5 py-2.5 text-[10px] font-medium lowercase tracking-[0.1em] text-black/60 transition-colors hover:border-black/25 hover:text-black disabled:opacity-40'
                }
              >
                {loading ? '…' : 'turn off alerts'}
              </button>
            )}
          </div>
          {message && (
            <p
              className={
                variant === 'campus'
                  ? 'font-naya-sans mt-3 text-xs text-white/60'
                  : 'font-naya-sans mt-3 text-xs text-black/50'
              }
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
