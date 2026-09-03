'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOrganizerAccess() {
      const rawSession = localStorage.getItem('xenova_session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }

      try {
        const user = JSON.parse(rawSession);
        const email = (user.email || '').trim().toLowerCase();
        const role = (user.role || '').toUpperCase();

        // 1. Platform Admin always has full access
        if (role === 'ADMIN' || email === 'admin@xenova.gg') {
          router.replace('/organizer/dashboard');
          return;
        }

        let isApprovedOrganizer = role === 'ORGANIZER' || role === 'HOST';
        let hostName = user.hostName || user.name || 'Verified Host';

        // 2. Real-time Supabase Check on organizer_applications
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('organizer_applications')
            .select('*')
            .eq('email', email);

          if (data && data.length > 0) {
            const app = data[0];
            const status = (app.status || '').toUpperCase();
            if (status === 'APPROVED') {
              isApprovedOrganizer = true;
              hostName = app.host_name || user.name || 'Verified Host';
            }
          }
        } catch (sbErr) {
          console.warn('Supabase host lookup notice:', sbErr);
        }

        // 3. Fallback to API Applications Check if Supabase direct check was empty
        if (!isApprovedOrganizer) {
          try {
            const apiBase =
              typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                ? '/api'
                : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

            const res = await fetch(`${apiBase}/auth/organizers`, { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                const matched = json.data.find(
                  (a: any) => (a.email || '').toLowerCase().trim() === email
                );
                if (matched) {
                  isApprovedOrganizer = true;
                  hostName = matched.name || matched.host_name || user.name;
                }
              }
            }
          } catch (apiErr) {
            console.warn('API host lookup notice:', apiErr);
          }
        }

        if (isApprovedOrganizer) {
          // Elevate session role to organizer in localStorage
          const updatedSession = { ...user, role: 'organizer', hostName };
          localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
          window.dispatchEvent(new Event('xenova-auth-change'));
          router.replace('/organizer/dashboard');
        } else {
          // Demote session role to player in localStorage and route to apply form
          const updatedSession = { ...user, role: 'player' };
          delete updatedSession.hostName;
          localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
          window.dispatchEvent(new Event('xenova-auth-change'));
          router.replace('/organizer/apply');
        }
      } catch {
        router.replace('/login');
      }
    }

    checkOrganizerAccess();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070B14] text-white font-sans">
      <div className="flex flex-col items-center gap-4 text-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Xenova Host & Organizer Arena</h3>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Checking organizer credentials in database...</p>
        </div>
      </div>
    </div>
  );
}
