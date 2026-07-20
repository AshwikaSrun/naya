'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import AgentOnboarding from '@/components/agent/AgentOnboarding';
import { getProfile } from '@/lib/agent/client';
import type { TasteProfile } from '@/lib/agent/types';

export default function EditTasteProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setProfile(await getProfile());
      setLoaded(true);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">
            naya
          </Link>
          <div className="flex items-center gap-3">
            <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
              <Link href="/for-you" className="px-3 py-1.5 transition-colors hover:text-black">for you</Link>
              <Link href="/profile" className="px-3 py-1.5 transition-colors hover:text-black">profile</Link>
            </nav>
            <MobileNav />
          </div>
        </div>

        {loaded ? (
          <AgentOnboarding
            initial={profile ?? undefined}
            onComplete={() => router.push('/for-you')}
          />
        ) : (
          <div className="font-naya-sans py-24 text-center text-sm text-black/30">loading…</div>
        )}
      </div>
    </div>
  );
}
