'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  completeOnboarding,
  getOnboardingOptions,
  saveOnboardingStep,
  type OnboardingOptions,
  type OnboardingTile,
} from '@/lib/agent/client';
import type { TasteProfile } from '@/lib/agent/types';
import {
  BRAND_LOGO_DARK,
  BRAND_LOGOS,
  ONBOARDING_BRANDS,
} from '@/lib/onboarding-brands';
import { STYLE_IMAGES, styleTileImage } from '@/lib/onboarding-styles';
import {
  EMAIL_STORAGE_KEY,
  TRIAL_SEARCH_LIMIT,
  UNLIMITED_STORAGE_KEY,
  isPurdueEmail,
} from '@/lib/access';

// Quiz-like signup: email (waitlist) first, then taste profile so the account
// is ready at launch. Autosaves each screen; email step cannot be skipped.

const TOPS_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const PRICE_BUCKETS = [
  { label: 'under $30', value: 30 },
  { label: 'under $75', value: 75 },
  { label: 'under $150', value: 150 },
  { label: 'no limit', value: null },
];

const FALLBACK_ERAS = ['70s', '80s', '90s', '2000s', '2010s'];

const EDITORIAL_FALLBACKS = [
  '/editorial/naya-editorial-denim.png',
  '/editorial/naya-archive-rack.png',
  '/editorial/naya-fit-mirror.png',
  '/editorial/naya-hero.png',
  '/editorial/naya-pricing.png',
];

function tileImage(tile: OnboardingTile, index: number): string {
  return styleTileImage(tile.name, tile.image || EDITORIAL_FALLBACKS[index % EDITORIAL_FALLBACKS.length]);
}

const TOTAL_SCREENS = 7; // email + 5 quiz + optional final
const STYLE_TARGET = 3;
const EMAIL_STEP = 0;
const FIRST_QUIZ_STEP = 1;
const LAST_QUIZ_STEP = 5;
const FINAL_STEP = 6;

interface Props {
  initial?: Partial<TasteProfile>;
  onComplete: () => void;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-naya-sans rounded-full border px-3.5 py-1.5 text-[12px] lowercase tracking-[0.04em] transition-colors ${
        active
          ? 'border-black bg-black text-white'
          : 'border-black/15 bg-transparent text-black/60 hover:border-black/40'
      }`}
    >
      {label}
    </button>
  );
}

function PictureTile({
  label,
  image,
  active,
  onClick,
}: {
  label: string;
  image: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative aspect-[4/5] overflow-hidden rounded-2xl text-left outline-none transition-transform duration-200 ${
        active ? 'ring-2 ring-black ring-offset-2 ring-offset-white' : 'hover:-translate-y-0.5'
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        style={{ backgroundImage: `url("${image}")` }}
      />
      <div
        className={`absolute inset-0 transition-colors duration-200 ${
          active ? 'bg-black/45' : 'bg-gradient-to-t from-black/75 via-black/15 to-transparent'
        }`}
      />
      {active && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-sm">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <span className="font-naya-sans absolute inset-x-0 bottom-0 p-2.5 text-[12px] font-medium lowercase leading-tight tracking-[0.02em] text-white">
        {label}
      </span>
    </button>
  );
}

function BrandLogoTile({
  label,
  logo,
  dark,
  active,
  onClick,
}: {
  label: string;
  logo: string;
  dark: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative aspect-[4/5] overflow-hidden rounded-2xl text-left outline-none transition-transform duration-200 ${
        dark ? 'bg-black' : 'bg-white'
      } ${
        active
          ? 'ring-2 ring-black ring-offset-2 ring-offset-[#f7f4ee]'
          : 'hover:-translate-y-0.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          className="max-h-[58%] max-w-[78%] object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>
      {active && (
        <span
          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${
            dark ? 'bg-white text-black' : 'bg-black text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <span
        className={`font-naya-sans absolute inset-x-0 bottom-0 p-2.5 text-[11px] font-medium lowercase leading-tight tracking-[0.02em] sm:text-[12px] ${
          dark ? 'text-white/90' : 'text-black/70'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function OnboardingFlow({ initial, onComplete }: Props) {
  const [options, setOptions] = useState<OnboardingOptions>({
    brands: [],
    brandTiles: [],
    styleTags: [],
    styleTiles: [],
    eras: [],
  });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);

  // Screen state
  const [sizeTops, setSizeTops] = useState(initial?.size_profile?.tops ?? '');
  const [waist, setWaist] = useState('');
  const [inseam, setInseam] = useState('');
  const [sizeShoes, setSizeShoes] = useState(initial?.size_profile?.shoes ?? '');
  const [sizeDresses, setSizeDresses] = useState(initial?.size_profile?.dresses ?? '');

  const [brands, setBrands] = useState<string[]>(initial?.preferred_brands ?? []);
  const [otherBrand, setOtherBrand] = useState('');
  const [styles, setStyles] = useState<string[]>(initial?.style_tags ?? []);
  const [eras, setEras] = useState<string[]>(initial?.era_preference ?? []);
  const [noEraPref, setNoEraPref] = useState(false);
  const [priceCeiling, setPriceCeiling] = useState<number | null | undefined>(
    initial?.price_ceiling ?? undefined,
  );
  const [hunting, setHunting] = useState('');

  useEffect(() => {
    getOnboardingOptions().then(setOptions);
  }, []);

  // Returning visitors who already joined skip the email step.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (stored) {
      setEmail(stored);
      setEmailLocked(true);
      setStep(FIRST_QUIZ_STEP);
    }
  }, []);

  const styleTiles: OnboardingTile[] = options.styleTiles.length
    ? options.styleTiles
    : Object.keys(STYLE_IMAGES).map((name) => ({ name, image: STYLE_IMAGES[name] ?? null }));
  const eraOptions = options.eras.length ? options.eras : FALLBACK_ERAS;

  const denim = useMemo(() => {
    const w = waist.trim();
    const i = inseam.trim();
    if (w && i) return `${w}x${i}`;
    if (w) return w;
    return initial?.size_profile?.denim ?? '';
  }, [waist, inseam, initial]);

  const toggle = (v: string, list: string[], set: (x: string[]) => void, max?: number) => {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else if (!max || list.length < max) set([...list, v]);
  };

  // Quiz steps are shifted +1 after the email waitlist step.
  const patchForStep = (s: number): Partial<TasteProfile> => {
    switch (s) {
      case 1: {
        const size_profile: Record<string, string> = {};
        if (sizeTops) size_profile.tops = sizeTops;
        if (denim) size_profile.denim = denim;
        if (sizeShoes.trim()) size_profile.shoes = sizeShoes.trim();
        if (sizeDresses.trim()) size_profile.dresses = sizeDresses.trim();
        return { size_profile };
      }
      case 2: {
        const extra = otherBrand.trim().toLowerCase();
        const all = extra ? [...brands, ...extra.split(',').map((b) => b.trim()).filter(Boolean)] : brands;
        return { preferred_brands: Array.from(new Set(all)) };
      }
      case 3:
        return { style_tags: styles };
      case 4:
        return { era_preference: noEraPref ? [] : eras };
      case 5:
        return { price_ceiling: priceCeiling ?? null };
      default:
        return {};
    }
  };

  const autosave = async (s: number) => {
    if (s === EMAIL_STEP) return;
    const patch = patchForStep(s);
    if (Object.keys(patch).length) await saveOnboardingStep(patch);
  };

  const submitEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('enter a valid email to join the waitlist.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isPurdueEmail(trimmed)) {
        const authRes = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: trimmed }),
        });
        const authData = await authRes.json();
        if (!authRes.ok) throw new Error(authData.error || 'Could not unlock Purdue access.');
        window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
        window.localStorage.removeItem(UNLIMITED_STORAGE_KEY);
        void fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, source: 'onboarding_purdue' }),
        });
      } else {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, source: 'onboarding_waitlist' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not join waitlist.');
        window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
      }
      setEmailLocked(true);
      setStep(FIRST_QUIZ_STEP);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (step === EMAIL_STEP) {
      await submitEmail();
      return;
    }
    setSaving(true);
    await autosave(step);
    setSaving(false);
    setStep((s) => Math.min(s + 1, TOTAL_SCREENS - 1));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    if (step <= LAST_QUIZ_STEP) await autosave(step);
    const res = await completeOnboarding(hunting.trim() || undefined);
    setSaving(false);

    if (!res.ok) {
      const msg =
        res.error === 'db_not_configured'
          ? 'database isn’t configured yet — add Supabase keys and run supabase-agent-schema.sql, then try again.'
          : res.error === 'no_user'
            ? 'couldn’t identify your session. refresh and try again.'
            : res.error === 'db_error'
              ? 'couldn’t save your profile. run supabase-agent-schema.sql in Supabase, then try again.'
              : 'something went wrong finishing setup. check the console and try again.';
      console.error('[naya] onboarding finish blocked:', res);
      setError(msg);
      return;
    }

    onComplete();
    if (res.redirect && typeof window !== 'undefined' && window.location.pathname !== res.redirect) {
      window.location.href = res.redirect;
    }
  };

  // Skip is only for quiz steps — email is required.
  const skipAll = async () => {
    if (step === EMAIL_STEP) return;
    setSaving(true);
    setError(null);
    const res = await completeOnboarding();
    setSaving(false);
    if (!res.ok) {
      console.error('[naya] onboarding skip blocked:', res);
      setError('couldn’t skip right now. try again.');
      return;
    }
    onComplete();
    if (res.redirect && typeof window !== 'undefined' && window.location.pathname !== res.redirect) {
      window.location.href = res.redirect;
    }
  };

  const advance = step < FINAL_STEP ? goNext : finish;

  const stylesRemaining = Math.max(0, STYLE_TARGET - styles.length);
  const primaryLabel = (() => {
    if (saving) {
      if (step === EMAIL_STEP) return 'joining…';
      return step < FINAL_STEP ? 'saving…' : 'finishing…';
    }
    if (step === EMAIL_STEP) return 'join & continue';
    if (step === 3 && stylesRemaining > 0) return `pick ${stylesRemaining} more`;
    if (step === FINAL_STEP) return 'finish setup';
    return 'continue';
  })();
  const primaryEmphasized = !(step === 3 && stylesRemaining > 0);
  const primaryDisabled =
    saving || (step === EMAIL_STEP && (!email.trim() || !email.includes('@')));

  const skipControl =
    step === EMAIL_STEP ? null : (
      <button
        type="button"
        onClick={step === FIRST_QUIZ_STEP ? skipAll : advance}
        className="font-naya-sans text-[11px] lowercase tracking-[0.1em] text-black/35 transition-colors hover:text-black/70"
      >
        {step === FIRST_QUIZ_STEP ? "I'll do this later" : 'skip'}
      </button>
    );

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-black/8 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] md:p-9">
      {/* Progress bar + step count + skip */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-black' : i < step ? 'w-3 bg-black/40' : 'w-3 bg-black/10'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-naya-sans text-[11px] lowercase tracking-[0.1em] text-black/30">
            step {step + 1} of {TOTAL_SCREENS}
          </span>
          {skipControl}
        </div>
      </div>

      {step === 0 && (
        <Screen
          kicker="waitlist"
          title="join with your email."
          sub={`we'll save your spot and set up your profile — then you get ${TRIAL_SEARCH_LIMIT} free searches. the shopping agent opens after launch.`}
        >
          <div className="space-y-4">
            <Field label="email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                disabled={emailLocked || saving}
                className={inputCls}
              />
            </Field>
            <p className="font-naya-sans text-[12px] leading-relaxed text-black/40">
              purdue students: use your @purdue.edu email for unlimited search + the agent.
            </p>
          </div>
        </Screen>
      )}

      {step === 1 && (
        <Screen kicker="first, your fit" title="what sizes do you wear?" sub="so we never surface the wrong size. skip any you're not sure about.">
          <div className="space-y-6">
            <Field label="tops">
              <div className="flex flex-wrap gap-2">
                {TOPS_SIZES.map((s) => (
                  <Chip key={s} label={s.toLowerCase()} active={sizeTops === s} onClick={() => setSizeTops(sizeTops === s ? '' : s)} />
                ))}
              </div>
            </Field>
            <Field label="denim (waist × inseam)">
              <div className="flex items-center gap-3">
                <input value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="32" className={inputCls + ' w-20'} />
                <span className="text-black/30">×</span>
                <input value={inseam} onChange={(e) => setInseam(e.target.value)} placeholder="30" className={inputCls + ' w-20'} />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-6">
              <Field label="shoes">
                <input value={sizeShoes} onChange={(e) => setSizeShoes(e.target.value)} placeholder="9" className={inputCls} />
              </Field>
              <Field label="dresses">
                <input value={sizeDresses} onChange={(e) => setSizeDresses(e.target.value)} placeholder="M / 6" className={inputCls} />
              </Field>
            </div>
          </div>
        </Screen>
      )}

      {step === 2 && (
        <Screen kicker="brands you love" title="who do you wear?" sub="tap a few to discover better finds. no minimum.">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {ONBOARDING_BRANDS.map((name) => (
              <BrandLogoTile
                key={name}
                label={name}
                logo={BRAND_LOGOS[name]}
                dark={BRAND_LOGO_DARK.has(name)}
                active={brands.includes(name)}
                onClick={() => toggle(name, brands, setBrands)}
              />
            ))}
          </div>
          <div className="mt-6">
            <Field label="something else? add your own">
              <input
                value={otherBrand}
                onChange={(e) => setOtherBrand(e.target.value)}
                placeholder="e.g. margiela, kapital"
                className={inputCls}
              />
            </Field>
          </div>
          {brands.length === 0 && !otherBrand.trim() && (
            <p className="font-naya-sans mt-4 text-[11px] text-black/35">
              pick a few and we&apos;ll get better at this, or skip for now.
            </p>
          )}
        </Screen>
      )}

      {step === 3 && (
        <Screen kicker="your aesthetic" title="what's your style?" sub="pick 3 (or more!) to discover your vibe.">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {styleTiles.map((t, i) => (
              <PictureTile
                key={t.name}
                label={t.name}
                image={tileImage(t, i)}
                active={styles.includes(t.name)}
                onClick={() => toggle(t.name, styles, setStyles, 5)}
              />
            ))}
          </div>
        </Screen>
      )}

      {step === 4 && (
        <Screen kicker="era" title="any decade you gravitate to?" sub="optional. leave blank for no preference.">
          <div className="flex flex-wrap gap-2">
            {eraOptions.map((e) => (
              <Chip
                key={e}
                label={e}
                active={!noEraPref && eras.includes(e)}
                onClick={() => {
                  setNoEraPref(false);
                  toggle(e, eras, setEras);
                }}
              />
            ))}
            <Chip
              label="no preference"
              active={noEraPref}
              onClick={() => {
                setNoEraPref(!noEraPref);
                if (!noEraPref) setEras([]);
              }}
            />
          </div>
        </Screen>
      )}

      {step === 5 && (
        <Screen kicker="budget" title="typical budget per item?" sub="softly prioritize finds in your range.">
          <div className="flex flex-wrap gap-2">
            {PRICE_BUCKETS.map((b) => (
              <Chip
                key={b.label}
                label={b.label}
                active={priceCeiling === b.value}
                onClick={() => setPriceCeiling(priceCeiling === b.value ? undefined : b.value)}
              />
            ))}
          </div>
        </Screen>
      )}

      {step === 6 && (
        <Screen kicker="one more thing" title="hunting for anything specific?" sub="optional. we'll use it when the agent launches.">
          <input
            value={hunting}
            onChange={(e) => setHunting(e.target.value)}
            placeholder="brown leather bomber jacket, size M, under $80"
            className={inputCls}
          />
        </Screen>
      )}

      {/* Sticky-style CTA bar */}
      <div className="mt-9 flex items-center justify-between border-t border-black/8 pt-6">
        {step > (emailLocked ? FIRST_QUIZ_STEP : 0) ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(emailLocked ? FIRST_QUIZ_STEP : 0, s - 1))}
            className="font-naya-sans text-[12px] lowercase tracking-[0.1em] text-black/45 transition-colors hover:text-black"
          >
            back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={advance}
          disabled={primaryDisabled}
          className={`font-naya-sans rounded-full px-8 py-3 text-[12px] lowercase tracking-[0.12em] transition-colors disabled:opacity-40 ${
            primaryEmphasized
              ? 'bg-black text-white hover:bg-neutral-800'
              : 'bg-black/5 text-black/55 hover:bg-black/10'
          }`}
        >
          {primaryLabel}
        </button>
      </div>
      {error && (
        <p className="font-naya-sans mt-4 text-center text-[12px] leading-relaxed text-red-600/90">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  'font-naya-sans w-full border-b border-black/10 bg-transparent py-2 text-[13px] text-black placeholder:text-black/25 focus:border-black focus:outline-none';

function Screen({
  kicker,
  title,
  sub,
  children,
}: {
  kicker: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        <p className="font-naya-sans mb-3 text-[10px] uppercase tracking-[0.2em] text-black/30">{kicker}</p>
        <h1 className="font-naya-serif mb-3 text-3xl font-light text-black md:text-4xl">{title}</h1>
        <p className="font-naya-sans text-sm text-black/45">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-naya-sans mb-2 text-[9px] uppercase tracking-[0.18em] text-black/25">{label}</p>
      {children}
    </div>
  );
}
