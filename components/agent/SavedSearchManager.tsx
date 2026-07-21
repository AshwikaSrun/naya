'use client';

import { useEffect, useState } from 'react';
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  type SavedSearchRow,
} from '@/lib/agent/client';

interface Props {
  onChanged?: () => void;
  onPaywall?: () => void;
}

export default function SavedSearchManager({ onChanged, onPaywall }: Props) {
  const [searches, setSearches] = useState<SavedSearchRow[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setSearches(await listSavedSearches());
    setLoaded(true);
  };

  useEffect(() => {
    listSavedSearches()
      .then(setSearches)
      .finally(() => setLoaded(true));
  }, []);

  const handleAdd = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    const created = await createSavedSearch(q);
    if (created.search) {
      setInput('');
      await refresh();
      onChanged?.();
    } else if (created.paywalled) {
      onPaywall?.();
    } else if (created.error === 'db_not_configured') {
      setError('database not configured. add your Supabase keys to .env.local and restart the dev server.');
    } else if (created.error === 'db_error') {
      setError('could not save search. run supabase-agent-schema.sql in the Supabase SQL editor, then try again.');
    } else {
      setError('could not save that search. try again in a moment.');
    }
    setBusy(false);
  };

  const handleDelete = async (id: number) => {
    await deleteSavedSearch(id);
    await refresh();
    onChanged?.();
  };

  return (
    <div>
      <p className="font-naya-sans mb-3 text-[10px] uppercase tracking-[0.2em] text-black/30">
        watching for you
      </p>

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="brown leather bomber jacket, size M, under $80"
          className="font-naya-sans flex-1 rounded-full border border-black/12 bg-white px-4 py-2.5 text-[13px] text-black placeholder:text-black/30 focus:border-black focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !input.trim()}
          className="font-naya-sans rounded-full bg-black px-5 py-2.5 text-[12px] lowercase tracking-[0.1em] text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
        >
          {busy ? 'adding…' : 'watch'}
        </button>
      </div>

      {error && (
        <p className="font-naya-sans mt-3 text-[12px] leading-relaxed text-red-700/80">{error}</p>
      )}

      {loaded && searches.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {searches.map((s) => (
            <span
              key={s.id}
              className="font-naya-sans group inline-flex items-center gap-2 rounded-full border border-black/12 bg-[#faf9f7] px-3.5 py-1.5 text-[12px] text-black/70"
            >
              {s.query_text}
              <button
                type="button"
                aria-label="Remove saved search"
                onClick={() => handleDelete(s.id)}
                className="text-black/30 transition-colors hover:text-black"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
