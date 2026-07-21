'use client';

import { useState } from 'react';
import { saveProfile } from '@/lib/agent/client';
import type { TasteProfile } from '@/lib/agent/types';
import { STYLE_TAGS } from '@/lib/vocab';

const BRAND_OPTIONS = [
  'carhartt', 'levis', 'the north face', 'nike', 'adidas', 'polo ralph lauren',
  'patagonia', 'stussy', 'supreme', 'champion', 'new balance', 'dickies',
  'arcteryx', 'stone island', 'uniqlo', 'brandy melville',
];

const CATEGORY_OPTIONS = [
  'outerwear', 'denim', 'knitwear', 'hoodie', 'tops', 'pants', 'shoes', 'bags', 'dresses', 'skirts',
];

const STYLE_OPTIONS = Object.keys(STYLE_TAGS);

const ERA_OPTIONS = ['90s', '2000s', '80s', '70s'];

interface Props {
  initial?: Partial<TasteProfile>;
  onComplete: (profile: Partial<TasteProfile>) => void;
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

export default function AgentOnboarding({ initial, onComplete }: Props) {
  const [brands, setBrands] = useState<string[]>(initial?.preferred_brands ?? []);
  const [categories, setCategories] = useState<string[]>(initial?.preferred_categories ?? []);
  const [styles, setStyles] = useState<string[]>(initial?.style_tags ?? []);
  const [eras, setEras] = useState<string[]>(initial?.era_preference ?? []);
  const [sizeTops, setSizeTops] = useState(initial?.size_profile?.tops ?? '');
  const [sizeDenim, setSizeDenim] = useState(initial?.size_profile?.denim ?? '');
  const [sizeShoes, setSizeShoes] = useState(initial?.size_profile?.shoes ?? '');
  const [priceCeiling, setPriceCeiling] = useState<string>(
    initial?.price_ceiling != null ? String(initial.price_ceiling) : '',
  );
  const [saving, setSaving] = useState(false);

  const toggle = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    max?: number,
  ) => {
    if (list.includes(value)) setList(list.filter((v) => v !== value));
    else if (!max || list.length < max) setList([...list, value]);
  };

  const canSubmit = brands.length > 0 || categories.length > 0 || styles.length > 0;

  const handleSubmit = async () => {
    setSaving(true);
    const size_profile: Record<string, string> = {};
    if (sizeTops.trim()) size_profile.tops = sizeTops.trim();
    if (sizeDenim.trim()) size_profile.denim = sizeDenim.trim();
    if (sizeShoes.trim()) size_profile.shoes = sizeShoes.trim();

    const profile: Partial<TasteProfile> = {
      preferred_brands: brands,
      preferred_categories: categories,
      style_tags: styles,
      era_preference: eras,
      size_profile,
      price_ceiling: priceCeiling ? Number(priceCeiling) : null,
    };
    await saveProfile(profile);
    setSaving(false);
    onComplete(profile);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <p className="font-naya-sans mb-4 text-[10px] uppercase tracking-[0.2em] text-black/30">
          teach your agent
        </p>
        <h1 className="font-naya-serif mb-3 text-3xl font-light text-black md:text-4xl">
          what are you into?
        </h1>
        <p className="font-naya-sans text-sm text-black/45">
          pick a few and naya will watch every marketplace for you.
        </p>
      </div>

      <Section title="brands you love">
        <div className="flex flex-wrap gap-2">
          {BRAND_OPTIONS.map((b) => (
            <Chip key={b} label={b} active={brands.includes(b)} onClick={() => toggle(b, brands, setBrands)} />
          ))}
        </div>
      </Section>

      <Section title="categories">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <Chip key={c} label={c} active={categories.includes(c)} onClick={() => toggle(c, categories, setCategories)} />
          ))}
        </div>
      </Section>

      <Section title="your vibes (pick 3–5)">
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((s) => (
            <Chip key={s} label={s} active={styles.includes(s)} onClick={() => toggle(s, styles, setStyles, 5)} />
          ))}
        </div>
      </Section>

      <Section title="eras">
        <div className="flex flex-wrap gap-2">
          {ERA_OPTIONS.map((e) => (
            <Chip key={e} label={e} active={eras.includes(e)} onClick={() => toggle(e, eras, setEras)} />
          ))}
        </div>
      </Section>

      <Section title="sizes">
        <div className="grid grid-cols-3 gap-4">
          <SizeInput label="tops" value={sizeTops} onChange={setSizeTops} placeholder="M" />
          <SizeInput label="denim" value={sizeDenim} onChange={setSizeDenim} placeholder="32x30" />
          <SizeInput label="shoes" value={sizeShoes} onChange={setSizeShoes} placeholder="9" />
        </div>
      </Section>

      <Section title="budget ceiling">
        <div className="flex flex-wrap gap-2">
          {['40', '60', '80', '120', '200'].map((p) => (
            <Chip key={p} label={`$${p}`} active={priceCeiling === p} onClick={() => setPriceCeiling(priceCeiling === p ? '' : p)} />
          ))}
        </div>
      </Section>

      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="font-naya-sans rounded-full bg-black px-8 py-3 text-[12px] lowercase tracking-[0.12em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'saving…' : 'start my feed'}
        </button>
        {!canSubmit && (
          <p className="font-naya-sans text-[11px] text-black/35">pick at least one brand, category, or style</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <p className="font-naya-sans mb-3 text-[10px] uppercase tracking-[0.18em] text-black/30">{title}</p>
      {children}
    </section>
  );
}

function SizeInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="font-naya-sans mb-1 text-[9px] uppercase tracking-[0.18em] text-black/25">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-naya-sans w-full border-b border-black/10 bg-transparent py-2 text-[13px] text-black placeholder:text-black/25 focus:border-black focus:outline-none"
      />
    </div>
  );
}
