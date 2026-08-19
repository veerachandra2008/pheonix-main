'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Old /registration route is retired — the new flow lives at /registration/[slug]
// Redirect to tournaments so users pick a specific event first
export default function RegistrationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tournaments');
  }, [router]);

  return (
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-emerald-500 animate-spin" />
    </main>
  );
}
