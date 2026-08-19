'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HostPage() {
  const router = useRouter();

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (!rawSession) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(rawSession);
      if (user.role === 'organizer' || user.role === 'admin') {
        router.replace('/organizer/dashboard');
      } else {
        router.replace('/organizer/apply');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070B14] text-white font-sans">
      <div className="flex flex-col items-center gap-4 text-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Xenova Organizer Portal</h3>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Routing to your organizer console...</p>
        </div>
      </div>
    </div>
  );
}
