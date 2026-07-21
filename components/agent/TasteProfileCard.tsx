'use client';

import Link from 'next/link';
import type { TasteProfile } from '@/lib/agent/types';

interface Props {
  profile: TasteProfile | null;
  savedCount?: number;
}

/**
 * Compact "your taste" card — vibes first, then brands — so the feed feels
 * personal and users can see the profile their saves are building.
 */
export default function TasteProfileCard({ profile, savedCount = 0 }: Props) {
  if (!profile) return null;

  const vibes = profile.style_tags ?? [];
  const brands = profile.preferred_brands ?? [];
  const eras = profile.era_preference ?? [];
  const cats = profile.preferred_categories ?? [];
  const hasAnything = vibes.length || brands.length || eras.length || cats.length;

  if (!hasAnything && savedCount === 0) return null;

  return (
    <section className="mb-10 rounded-2xl border border-black/8 bg-[#faf9f7] p-6 md:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-naya-sans mb-2 text-[10px] uppercase tracking-[0.2em] text-black/30">
            your taste profile
          </p>
          <h2 className="font-naya-serif text-2xl font-light tracking-[-0.02em] text-black md:text-3xl">
            how naya reads you.
          </h2>
          <p className="font-naya-sans mt-2 max-w-lg text-[13px] leading-relaxed text-black/45">
            vibes from onboarding, sharpened by every save. the agent hunts across
            marketplaces for pieces that fit this profile.
          </p>
        </div>
        <Link
          href="/for-you/edit"
          className="font-naya-sans text-[11px] lowercase tracking-[0.1em] text-black/45 transition-colors hover:text-black"
        >
          edit taste profile
        </Link>
      </div>

      <div className="space-y-5">
        {vibes.length > 0 && (
          <Row label="vibes">
            {vibes.map((v) => (
              <Chip key={v} label={v} emphasis />
            ))}
          </Row>
        )}
        {brands.length > 0 && (
          <Row label="brands">
            {brands.map((b) => (
              <Chip key={b} label={b} />
            ))}
          </Row>
        )}
        {(eras.length > 0 || cats.length > 0) && (
          <Row label="also into">
            {eras.map((e) => (
              <Chip key={e} label={e} />
            ))}
            {cats.map((c) => (
              <Chip key={c} label={c} />
            ))}
          </Row>
        )}
        {profile.price_ceiling != null && (
          <p className="font-naya-sans text-[12px] text-black/40">
            soft budget around ${Math.round(profile.price_ceiling)}
            {savedCount > 0 ? ` · ${savedCount} saved find${savedCount === 1 ? '' : 's'}` : ''}
          </p>
        )}
        {profile.price_ceiling == null && savedCount > 0 && (
          <p className="font-naya-sans text-[12px] text-black/40">
            {savedCount} saved find{savedCount === 1 ? '' : 's'} shaping this profile
          </p>
        )}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-naya-sans mb-2 text-[9px] uppercase tracking-[0.18em] text-black/30">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ label, emphasis }: { label: string; emphasis?: boolean }) {
  return (
    <span
      className={`font-naya-sans rounded-full border px-3 py-1.5 text-[12px] lowercase tracking-[0.04em] ${
        emphasis
          ? 'border-black bg-black text-white'
          : 'border-black/12 bg-white text-black/70'
      }`}
    >
      {label}
    </span>
  );
}
