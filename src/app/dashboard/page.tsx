'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Crown,
  Gamepad2,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
  School,
  Settings,
  Flame,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  Bell
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

const cards = [
  {
    title: 'Tournaments',
    description: 'Launch solos, duos, squads and college championships with live brackets.',
    href: '/tournaments',
    icon: Trophy,
    accent: '#10B981',
    tag: 'ACTIVE LEAGUES',
  },
  {
    title: 'College Hubs',
    description: 'Explore verified college pages, leaderboards, rivalries and club standings.',
    href: '/colleges',
    icon: Crown,
    accent: '#6366F1',
    tag: '120+ CAMPUSES',
  },
  {
    title: 'Team Control',
    description: 'Manage rosters, captain tools, achievements and match history in one place.',
    href: '/teams',
    icon: Users,
    accent: '#3B82F6',
    tag: 'ROSTER ENGINE',
  },
  {
    title: 'Leaderboards',
    description: 'Track top players, teams and colleges across seasonal and monthly rankings.',
    href: '/leaderboards',
    icon: BarChart3,
    accent: '#F59E0B',
    tag: 'NATIONAL RANKINGS',
  },
];

const gameLibrary = [
  { title: 'Valorant', genre: '5v5 Tactical Shooter', mode: '5v5', accent: '#EF4444', image: '/valorant.jpg' },
  { title: 'BGMI', genre: 'Battle Royale', mode: 'Squad', accent: '#F59E0B', image: '/bgmi.jpg' },
  { title: 'Free Fire', genre: 'Battle Royale', mode: 'Squad', accent: '#10B981', image: '/freefire.jpg' },
  { title: 'CS2', genre: 'Tactical Shooter', mode: '5v5', accent: '#3B82F6', image: '/cs2.jpg' },
  { title: 'Apex Legends', genre: 'Hero Battle Royale', mode: 'Trio', accent: '#84CC16', image: '/apex.jpg' },
];

import { getUserRegistrations, TournamentRegistrationRecord } from '@/lib/tournaments-db';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [userRegistrations, setUserRegistrations] = useState<TournamentRegistrationRecord[]>([]);

  useEffect(() => {
    // Remove any stale local storage mock registration tickets
    try {
      localStorage.removeItem('xenova_registrations');
    } catch {}

    const loadProfileData = async (userEmail: string, initialUser: any) => {
      const cleanEmail = userEmail.trim().toLowerCase();

      // 1. Direct Supabase Query (Fastest, direct from PostgreSQL users table)
      try {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!error && dbUser) {
          const liveData: any = {
            id: dbUser.id,
            name: dbUser.name || cleanEmail.split('@')[0],
            email: dbUser.email || cleanEmail,
            college: dbUser.college || 'General Campus',
            team: dbUser.team || 'Free Agent',
            tag: dbUser.tag || `@${(dbUser.name || 'player').toUpperCase().replace(/\s+/g, '')}#1337`,
            bio: dbUser.bio || 'Verified collegiate esports competitor.',
            role: (dbUser.role || 'PLAYER').toLowerCase(),
            rank: dbUser.rank || 1,
            win_rate: dbUser.win_rate || 84.5,
            trophies: dbUser.trophies || 5,
          };
          if (dbUser.avatar_url || dbUser.avatar) {
            liveData.avatar = dbUser.avatar_url || dbUser.avatar;
            liveData.avatar_url = dbUser.avatar_url || dbUser.avatar;
          }
          setSession((prev: any) => ({ ...(prev || {}), ...liveData }));
          try {
            const raw = localStorage.getItem('xenova_session');
            const existing = raw ? JSON.parse(raw) : {};
            localStorage.setItem('xenova_session', JSON.stringify({ ...existing, ...liveData }));
            window.dispatchEvent(new Event('xenova-auth-change'));
          } catch {}
        }
      } catch (sbErr) {
        console.warn('Dashboard Supabase users fetch notice:', sbErr);
      }

      // 2. Fetch fresh user profile from Backend API (/api/auth/profile)
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/auth/profile?email=${encodeURIComponent(cleanEmail)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setSession((prev: any) => ({ ...(prev || {}), ...data.data }));
            try {
              const raw = localStorage.getItem('xenova_session');
              const existing = raw ? JSON.parse(raw) : {};
              localStorage.setItem('xenova_session', JSON.stringify({ ...existing, ...data.data }));
              window.dispatchEvent(new Event('xenova-auth-change'));
            } catch {}
          }
        }
      } catch (apiErr) {
        // Relative /api fallback
        try {
          const fallbackRes = await fetch(`/api/auth/profile?email=${encodeURIComponent(cleanEmail)}`, { cache: 'no-store' });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            if (data.success && data.data) {
              setSession((prev: any) => ({ ...(prev || {}), ...data.data }));
              window.dispatchEvent(new Event('xenova-auth-change'));
            }
          }
        } catch {}
      }
    };

    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        const user = JSON.parse(rawSession);
        setSession(user);

        // Instant optimistic passes render from local cache (0ms)
        try {
          const cachedPasses = localStorage.getItem(`xenova_passes_${user.email}`);
          if (cachedPasses) {
            setUserRegistrations(JSON.parse(cachedPasses));
          }
        } catch {}

        // Load user registrations strictly from Backend / Supabase
        getUserRegistrations(user.email).then((regs) => {
          if (regs && Array.isArray(regs)) {
            setUserRegistrations(regs);
            try {
              localStorage.setItem(`xenova_passes_${user.email}`, JSON.stringify(regs));
            } catch {}
          }
        });

        // Load full user details from Database
        loadProfileData(user.email, user);
      } catch (e) {
        router.replace('/login');
      }
    } else {
      // Check active Supabase Auth session if local storage was cleared
      supabase.auth.getSession().then(({ data: { session: authSession } }) => {
        if (authSession?.user?.email) {
          const email = authSession.user.email;
          const initialUser = {
            id: authSession.user.id,
            email: email,
            name: authSession.user.user_metadata?.name || email.split('@')[0],
            college: 'General Campus',
            role: 'player',
          };
          setSession(initialUser);
          localStorage.setItem('xenova_session', JSON.stringify(initialUser));

          getUserRegistrations(email).then((regs) => {
            if (regs && Array.isArray(regs)) setUserRegistrations(regs);
          });
          loadProfileData(email, initialUser);
        } else {
          router.replace('/login');
        }
      }).catch(() => {
        router.replace('/login');
      });
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. WELCOME GAMER HERO ═══════════════ */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        
        <div className="absolute inset-0 z-0">
          <img
            src="/valorant.jpg"
            alt="Dashboard"
            className="w-full h-full object-cover filter brightness-[0.3] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              
              {/* Avatar Crest */}
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/10 overflow-hidden flex items-center justify-center font-black text-emerald-400 text-3xl shadow-2xl shrink-0">
                {session?.avatar || session?.avatar_url ? (
                  <img src={session.avatar || session.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  session?.name?.slice(0, 2).toUpperCase() || 'XP'
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Varsity Athlete
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-bold uppercase">
                    {session?.college || 'Nexus Institute of Technology'}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                  Welcome back, <span className="text-emerald-400">{session?.name || 'Player'}</span>
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-400 font-medium">
                  <span>Gamer Tag: <strong className="text-white font-bold">@{session?.tag || 'player'}</strong></span>
                  <span>•</span>
                  <span>Team: <strong className="text-emerald-400 font-bold">{session?.team || 'Free Agent'}</strong></span>
                  {session?.role && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-300">Role: <strong className="text-teal-400 font-bold uppercase">{session.role}</strong></span>
                    </>
                  )}
                  {session?.rank && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">★ {session.rank}</span>
                    </>
                  )}
                </div>

                {/* Athlete Bio Card */}
                <div className="pt-2">
                  {session?.bio ? (
                    <div className="inline-flex items-start gap-2.5 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-2.5 max-w-2xl backdrop-blur-md">
                      <span className="text-emerald-400 text-sm font-serif select-none">“</span>
                      <p className="text-xs sm:text-sm text-zinc-200 font-normal italic leading-relaxed">
                        {session.bio}
                      </p>
                      <span className="text-emerald-400 text-sm font-serif select-none">”</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 px-3.5 py-1.5 text-xs text-zinc-500">
                      <span>No athlete bio added yet.</span>
                      <Link href="/settings" className="text-emerald-400 hover:underline font-bold">
                        + Add Bio in Settings
                      </Link>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3.5 text-xs font-black uppercase tracking-wider text-white transition cursor-pointer"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <Link
                href="/notifications"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                <Bell className="h-4 w-4" /> Alerts
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 2. QUICK ACTION BENTO GRID ═══════════════ */}
      <section className="py-14 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Control Center</span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Quick Actions & Modules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              const cardBgImages = ['/valorant.jpg', '/hero-arena.jpg', '/cs2.jpg', '/bgmi.jpg'];
              const bgImg = cardBgImages[idx % cardBgImages.length];
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] p-6 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                >
                  {/* Background Image Layer */}
                  <div className="absolute inset-0 pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity duration-500">
                    <img src={bgImg} alt={card.title} className="w-full h-full object-cover filter saturate-150" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 backdrop-blur-md">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-black/60 px-2.5 py-1 rounded-full border border-white/10">{card.tag}</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black uppercase text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 font-normal leading-relaxed">{card.description}</p>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6 flex items-center justify-between text-xs font-black text-emerald-400">
                    <span>LAUNCH ENGINE</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ═══════════════ REGISTERED TOURNAMENTS SECTION ═══════════════ */}
          {userRegistrations.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-zinc-900">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Database Verified</span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">My Registered Tournaments</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userRegistrations.map((reg, idx) => (
                  <div
                    key={reg.passId ? `${reg.passId}-${idx}` : `reg-${reg.tournamentSlug || idx}-${idx}`}
                    className="p-5 rounded-3xl bg-[#09090b] border border-emerald-500/30 hover:border-emerald-500/60 transition space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-bold tracking-wider">
                        {reg.passId}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        {new Date(reg.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white truncate">{reg.tournamentTitle}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">Team: <span className="text-emerald-400 font-bold">{reg.teamName}</span> • {reg.college}</p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">Captain: <strong className="text-white">{reg.captainName}</strong></span>
                      <Link
                        href={`/registration/${reg.tournamentSlug}/pass?passId=${reg.passId}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 hover:underline"
                      >
                        View Pass →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════ 3. ESPORTS GAME LIBRARY GRID ═══════════════ */}
          <div className="space-y-6 pt-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Official Titles</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Supported Esports Games</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {gameLibrary.map((game) => (
                <div key={game.title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] h-48 flex flex-col justify-end p-4">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] saturate-125 group-hover:scale-110 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  <div className="relative z-10 space-y-1">
                    <span className="text-[9px] font-black uppercase text-emerald-400">{game.mode}</span>
                    <h4 className="text-base font-black text-white uppercase leading-none">{game.title}</h4>
                    <p className="text-[10px] text-zinc-400">{game.genre}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
