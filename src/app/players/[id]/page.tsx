'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  ArrowLeft, 
  BadgeCheck, 
  Crown, 
  Gamepad2, 
  ShieldCheck, 
  Trophy, 
  Zap,
  Target,
  ChevronRight,
  TrendingUp,
  Building2,
  Users,
  Check,
  Share2,
  Ticket,
  ExternalLink,
  Settings,
  Sparkles,
  Award,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { getUserRegistrations, TournamentRegistrationRecord } from '@/lib/tournaments-db';
import FinalCTA from '@/components/xenova/FinalCTA';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

type Player = {
  id?: string | number;
  name?: string;
  email?: string;
  tag?: string;
  bio?: string;
  avatar?: string;
  avatar_url?: string;
  college?: string;
  team?: string;
  role?: string;
  rank?: number;
  win_rate?: number;
  trophies?: number;
  followers?: string[];
  following?: string[];
};

function slugify(value: string) {
  return (value || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function PlayerProfilePage() {
  const routeParams = useParams();
  const rawId = decodeURIComponent((routeParams?.id as string) || '');
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [profileData, setProfileData] = useState<Player | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [userPasses, setUserPasses] = useState<TournamentRegistrationRecord[]>([]);

  useEffect(() => {
    let sessionUser: Player | null = null;
    const updateFromLocal = () => {
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        try {
          sessionUser = JSON.parse(rawSession);
          setCurrentUser(sessionUser);
          if (
            rawId === 'me' ||
            rawId === 'profile' ||
            (sessionUser && (
              sessionUser.email?.toLowerCase() === rawId.toLowerCase() ||
              slugify(sessionUser.name || '') === slugify(rawId) ||
              (sessionUser.tag && sessionUser.tag.toLowerCase() === rawId.toLowerCase())
            ))
          ) {
            setProfileData(sessionUser);
            setLoading(false);
          }
        } catch (e) {}
      }
    };

    updateFromLocal();
    window.addEventListener('xenova-auth-change', updateFromLocal);
    window.addEventListener('storage', updateFromLocal);

    // 1. INSTANT OPTIMISTIC RENDER (0ms)
    const isSelf = 
      rawId === 'me' || 
      rawId === 'profile' || 
      (sessionUser && (
        sessionUser.email?.toLowerCase() === rawId.toLowerCase() ||
        slugify(sessionUser.name || '') === slugify(rawId) ||
        (sessionUser.tag && sessionUser.tag.toLowerCase() === rawId.toLowerCase())
      ));

    if (isSelf && sessionUser) {
      setProfileData(sessionUser);
      setLoading(false);
    }

    const loadProfile = async () => {
      const apiBase = getApiBaseUrl();

      const targetIdentifier = isSelf && sessionUser?.email ? sessionUser.email : rawId;

      let matched: Player | null = null;

      // 1. Direct Supabase Query (Fastest, real database data)
      try {
        let sbQuery = supabase.from('users').select('*');
        if (targetIdentifier.includes('@')) {
          sbQuery = sbQuery.eq('email', targetIdentifier.toLowerCase());
        } else {
          sbQuery = sbQuery.or(`email.ilike.%${targetIdentifier}%,name.ilike.%${targetIdentifier}%`);
        }
        const { data: sbUser } = await sbQuery.limit(1).maybeSingle();
        if (sbUser) {
          matched = {
            id: sbUser.id,
            name: sbUser.name || 'ATHLETE',
            email: sbUser.email,
            college: sbUser.college || 'General Campus',
            team: sbUser.team || 'Free Agent',
            tag: sbUser.tag || `@${slugify(sbUser.name || 'athlete')}`,
            bio: sbUser.bio || 'Verified collegiate esports competitor.',
            avatar_url: sbUser.avatar_url || '/valorant.jpg',
            avatar: sbUser.avatar_url || '/valorant.jpg',
            role: (sbUser.role || 'PLAYER').toLowerCase(),
            rank: sbUser.rank || 1,
            win_rate: sbUser.win_rate || 84.5,
            trophies: sbUser.trophies || 5,
          };
        }
      } catch (err) {
        console.warn('Direct Supabase lookup notice:', err);
      }

      // 2. Fallback to Backend Profile API if not yet matched
      if (!matched) {
        try {
          const profileRes = await fetch(`${apiBase}/auth/profile?email=${encodeURIComponent(targetIdentifier)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (profileRes?.success && profileRes?.data) {
            matched = profileRes.data;
          }
        } catch (err) {
          console.warn('API lookup notice:', err);
        }
      }

      // 3. Fallback to all users list if still not matched
      if (!matched) {
        try {
          const usersRes = await fetch(`${apiBase}/auth/users`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (usersRes?.success && Array.isArray(usersRes.data)) {
            matched = usersRes.data.find((u: any) =>
              u.email?.toLowerCase() === rawId.toLowerCase() ||
              String(u.id) === rawId ||
              slugify(u.name || '') === slugify(rawId) ||
              (u.tag && u.tag.toLowerCase() === rawId.toLowerCase())
            ) || null;
          }
        } catch {}
      }

      if (matched) {
        setProfileData(matched);
        if (matched.email && isSelf && sessionUser) {
          localStorage.setItem('xenova_session', JSON.stringify({ ...sessionUser, ...matched }));
        }
      }

      // Load Passes in background
      const emailForPasses = matched?.email || (isSelf && sessionUser?.email ? sessionUser.email : '');
      if (emailForPasses) {
        try {
          const passes = await getUserRegistrations(emailForPasses);
          if (passes && Array.isArray(passes)) {
            setUserPasses(passes);
          }
        } catch {}
      }

      setLoading(false);

      // Check following status
      try {
        const rawFollowing = localStorage.getItem('xenova_following');
        if (rawFollowing && (matched?.email || targetIdentifier)) {
          const set = new Set(JSON.parse(rawFollowing));
          setIsFollowing(set.has((matched?.email || targetIdentifier).toLowerCase()));
        }
      } catch {}
    };

    loadProfile();

    return () => {
      window.removeEventListener('xenova-auth-change', updateFromLocal);
      window.removeEventListener('storage', updateFromLocal);
    };
  }, [rawId]);

  const playerName = profileData?.name || 'ATHLETE';
  const playerTag = profileData?.tag || `@${slugify(playerName)}`;
  const playerCollege = profileData?.college || 'University Campus';
  const playerTeam = profileData?.team || 'Free Agent';
  const playerAvatar = profileData?.avatar_url || profileData?.avatar || '/valorant.jpg';
  const playerBio = profileData?.bio || 'Verified collegiate esports competitor.';
  const isOwnProfile = currentUser && profileData && (currentUser.email?.toLowerCase() === profileData.email?.toLowerCase());

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <section className="relative min-h-[440px] w-full overflow-hidden border-b border-zinc-900 bg-black flex items-end">
        
        <div className="absolute inset-0 z-0">
          <img
            src="/apex.jpg"
            alt={playerName}
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full">
          
          <div className="flex items-center justify-between gap-4 mb-8">
            <Link
              href="/players"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Players
            </Link>

            <div className="flex items-center gap-3">
              {isOwnProfile ? (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
                >
                  <Settings className="h-4 w-4" /> Edit Profile & Photo
                </Link>
              ) : profileData?.email ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUser) {
                      router.push('/login');
                      return;
                    }
                    const targetEmail = profileData.email!.toLowerCase();
                    const rawFollowing = localStorage.getItem('xenova_following');
                    const set = new Set(rawFollowing ? JSON.parse(rawFollowing) : []);
                    const nowFollowing = !set.has(targetEmail);
                    if (nowFollowing) set.add(targetEmail); else set.delete(targetEmail);
                    localStorage.setItem('xenova_following', JSON.stringify(Array.from(set)));
                    setIsFollowing(nowFollowing);

                    try {
                      const apiBase =
                        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                          ? '/api'
                          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';
                      await fetch(`${apiBase}/auth/follow`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ follower_email: currentUser.email, target_email: targetEmail }),
                      });
                    } catch {}
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
                    isFollowing
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <BadgeCheck className="h-4 w-4" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Follow Athlete
                    </>
                  )}
                </button>
              ) : null}

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white transition active:scale-95 cursor-pointer"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                {copiedLink ? 'Link Copied!' : 'Share Profile'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
            
            {/* Avatar Crest */}
            <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-3xl border-2 border-emerald-500/60 bg-zinc-950 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center">
              {playerAvatar ? (
                <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-emerald-400 text-3xl sm:text-4xl">
                  {playerName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Varsity Athlete
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase">
                  <Crown className="h-3.5 w-3.5" /> Rank #{profileData?.rank || 1}
                </span>
                {profileData?.role && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-black uppercase">
                    {profileData.role.toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                {playerName}
              </h1>

              <p className="text-xs sm:text-sm font-semibold text-zinc-300 flex flex-wrap items-center gap-2">
                <span className="text-emerald-400 font-bold">{playerTag}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Building2 className="h-4 w-4 text-emerald-400" /> {playerCollege}</span>
                <span>•</span>
                <span className="text-zinc-400">Team: <strong className="text-white">{playerTeam}</strong></span>
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ STATS & METRICS ═══════════════ */}
      <section className="py-14 sm:py-16 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Bio Card */}
          {playerBio && (
            <div className="p-6 rounded-3xl border border-white/10 bg-[#09090b] space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Athlete Biography
              </span>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {playerBio}
              </p>
            </div>
          )}

          {/* Metric Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Win Rate</span>
              <p className="text-3xl font-black text-emerald-400 mt-1">{profileData?.win_rate || 84.5}%</p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trophies Earned</span>
              <p className="text-3xl font-black text-amber-400 mt-1">{profileData?.trophies || 5} Trophies</p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Passes</span>
              <p className="text-3xl font-black text-white mt-1">{userPasses.length} Entries</p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</span>
              <p className="text-3xl font-black text-emerald-400 mt-1">Verified</p>
            </div>
          </div>

          {/* Registered Tournament Passes */}
          {userPasses.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/20 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" /> Authenticated Passes
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                    Active Tournament Passes ({userPasses.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPasses.map((pass, idx) => (
                  <div
                    key={pass.passId ? `${pass.passId}-${idx}` : `pass-${idx}`}
                    className="p-5 rounded-2xl bg-black border border-white/10 hover:border-emerald-500/50 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                        {pass.passId}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        {pass.tournamentFormat || 'Tournament'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white truncate">{pass.tournamentTitle}</h4>
                    <p className="text-xs text-zinc-400 truncate">Squad: <span className="text-emerald-400 font-bold">{pass.teamName}</span> • {pass.college}</p>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        {new Date(pass.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>

                      <Link
                        href={`/registration/${pass.tournamentSlug}/pass?passId=${pass.passId}`}
                        className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        View Pass <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
