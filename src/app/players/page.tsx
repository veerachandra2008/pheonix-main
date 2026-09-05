'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Crown,
  Building2,
  Trophy,
  ExternalLink,
  Sparkles,
  Zap,
  ArrowRight,
  Flame,
  Heart,
  UserX
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';
import { supabase } from '@/lib/supabase';

type Player = {
  id: string;
  name: string;
  email: string;
  tag: string;
  college?: string;
  team?: string;
  bio?: string;
  role?: string;
  avatar?: string;
  avatar_url?: string;
  rank?: number;
  win_rate?: number;
  trophies?: number;
};

// In-memory module cache for sub-millisecond route transitions (0.0ms)
const PLAYERS_CACHE_KEY = 'xenova_players_cache_v2';
let cachedPlayersMemory: Player[] | null = null;
let cachedFollowsMemory: Set<string> | null = null;

export const preloadPlayers = async () => {
  if (cachedPlayersMemory && cachedPlayersMemory.length > 0) return cachedPlayersMemory;
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('users')
      .select('id, name, email, college, role, bio, tag, avatar_url, rank, win_rate, trophies, created_at')
      .limit(500);
    if (data && Array.isArray(data) && data.length > 0) {
      const sorted = [...data].sort((a: any, b: any) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
      const mapped = sorted.map((u: any, idx: number) => ({
        id: String(u.id || idx),
        name: u.name || 'Varsity Athlete',
        email: (u.email || '').trim().toLowerCase(),
        college: u.college || 'University Campus',
        role: (u.role || 'PLAYER').toLowerCase(),
        bio: u.bio || '',
        tag: u.tag || `@${(u.name || 'player').toLowerCase().replace(/\s+/g, '')}`,
        avatar: u.avatar_url || '/valorant.jpg',
        avatar_url: u.avatar_url || '/valorant.jpg',
        rank: u.rank || idx + 1,
        win_rate: u.win_rate ?? 0.0,
        trophies: u.trophies ?? 0,
      }));
      cachedPlayersMemory = mapped;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(mapped));
        } catch {}
      }
      return mapped;
    }
  } catch {}
  return null;
};

export default function PlayersPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  
  // High-performance Instant SWR State (0ms First Contentful Paint)
  const [players, setPlayers] = useState<Player[]>(() => {
    if (cachedPlayersMemory && cachedPlayersMemory.length > 0) return cachedPlayersMemory;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PLAYERS_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedPlayersMemory = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  });

  const [followingSet, setFollowingSet] = useState<Set<string>>(() => {
    if (cachedFollowsMemory) return cachedFollowsMemory;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('xenova_following');
        if (stored) {
          const set = new Set<string>(JSON.parse(stored));
          cachedFollowsMemory = set;
          return set;
        }
      } catch {}
    }
    return new Set<string>();
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following' | 'player' | 'organizer'>('all');
  const [loading, setLoading] = useState(() => {
    if (cachedPlayersMemory && cachedPlayersMemory.length > 0) return false;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PLAYERS_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch {}
    }
    return true;
  });

  useEffect(() => {
    let currentEmail = '';
    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession);
        setSession(parsed);
        currentEmail = (parsed.email || '').toLowerCase().trim();
      } catch (e) {
        console.error(e);
      }
    }

    // High-Speed Parallel Direct Database Dispatch with SWR background update
    const fetchLatestData = async () => {
      try {
        const [usersResult, followsResult] = await Promise.all([
          supabase
            .from('users')
            .select('id, name, email, college, role, bio, tag, avatar_url, rank, win_rate, trophies, created_at')
            .limit(500),
          currentEmail
            ? supabase.from('user_follows').select('target_email').eq('follower_email', currentEmail)
            : Promise.resolve({ data: null, error: null })
        ]);

        let dbUsers: Player[] = [];

        // 1. Process Supabase Users
        if (!usersResult.error && Array.isArray(usersResult.data) && usersResult.data.length > 0) {
          const sorted = [...usersResult.data].sort((a: any, b: any) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return timeB - timeA;
          });

          dbUsers = sorted.map((u: any, idx: number) => ({
            id: String(u.id || idx),
            name: u.name || 'Varsity Athlete',
            email: (u.email || '').trim().toLowerCase(),
            college: u.college || 'University Campus',
            role: (u.role || 'PLAYER').toLowerCase(),
            bio: u.bio || '',
            tag: u.tag || `@${(u.name || 'player').toLowerCase().replace(/\s+/g, '')}`,
            avatar: u.avatar_url || '/valorant.jpg',
            avatar_url: u.avatar_url || '/valorant.jpg',
            rank: u.rank || idx + 1,
            win_rate: u.win_rate ?? 0.0,
            trophies: u.trophies ?? 0,
          }));
        } else {
          // 2. Fast non-blocking fallback if Supabase is unavailable (500ms timeout)
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 600);
            const apiBase =
              typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                ? '/api'
                : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

            const res = await fetch(`${apiBase}/auth/users`, {
              cache: 'no-store',
              signal: controller.signal,
            });
            clearTimeout(timer);

            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                dbUsers = json.data.map((u: any, idx: number) => ({
                  id: String(u.id || idx),
                  name: u.name || 'Varsity Athlete',
                  email: (u.email || '').trim().toLowerCase(),
                  college: u.college || 'University Campus',
                  role: (u.role || 'PLAYER').toLowerCase(),
                  bio: u.bio || '',
                  tag: u.tag || `@${(u.name || 'player').toLowerCase().replace(/\s+/g, '')}`,
                  avatar: u.avatar_url || u.avatar || '/valorant.jpg',
                  avatar_url: u.avatar_url || u.avatar || '/valorant.jpg',
                  rank: u.rank || idx + 1,
                  win_rate: u.win_rate ?? 0.0,
                  trophies: u.trophies ?? 0,
                }));
              }
            }
          } catch {}
        }

        // 3. Process follows result
        if (followsResult?.data && Array.isArray(followsResult.data)) {
          const newFollows = new Set(followsResult.data.map((r: any) => (r.target_email || '').toLowerCase()));
          setFollowingSet(newFollows);
          cachedFollowsMemory = newFollows;
          localStorage.setItem('xenova_following', JSON.stringify(Array.from(newFollows)));
        }

        // Exclude current logged in user
        const finalPlayers = dbUsers.filter((p) => p.email && p.email !== currentEmail);
        
        setPlayers(finalPlayers);
        cachedPlayersMemory = finalPlayers;
        if (typeof window !== 'undefined' && finalPlayers.length > 0) {
          try {
            localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(finalPlayers));
          } catch {}
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchLatestData();
  }, []);

  const handleToggleFollow = async (targetEmail: string) => {
    let currentEmail = (session?.email || '').trim().toLowerCase();
    if (!currentEmail) {
      try {
        const raw = localStorage.getItem('xenova_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          currentEmail = (parsed.email || '').trim().toLowerCase();
        }
      } catch { }
    }

    if (!currentEmail) {
      router.push('/login');
      return;
    }

    const emailNorm = targetEmail.trim().toLowerCase();
    const isCurrentlyFollowing = followingSet.has(emailNorm);

    const nextSet = new Set(followingSet);
    if (isCurrentlyFollowing) {
      nextSet.delete(emailNorm);
    } else {
      nextSet.add(emailNorm);
    }

    setFollowingSet(nextSet);
    localStorage.setItem('xenova_following', JSON.stringify(Array.from(nextSet)));

    // Primary Backend API sync with Supabase persistence
    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const res = await fetch(`${apiBase}/auth/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_email: currentEmail,
          target_email: emailNorm,
        }),
      });

      if (!res.ok) {
        // Fallback directly to Supabase client if API returned error
        if (isCurrentlyFollowing) {
          await supabase
            .from('user_follows')
            .delete()
            .eq('follower_email', currentEmail)
            .eq('target_email', emailNorm);
        } else {
          await supabase.from('user_follows').insert({
            follower_email: currentEmail,
            target_email: emailNorm,
          });
        }
      }
    } catch {
      // Offline fallback directly to Supabase client
      if (isCurrentlyFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_email', currentEmail)
          .eq('target_email', emailNorm);
      } else {
        await supabase.from('user_follows').insert({
          follower_email: currentEmail,
          target_email: emailNorm,
        });
      }
    }
  };

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const pEmail = (p.email || '').toLowerCase();

      // Following filter
      if (selectedFilter === 'following' && !followingSet.has(pEmail)) {
        return false;
      }

      // Role filter
      if (selectedFilter === 'player' && (p.role || 'player').toLowerCase() !== 'player') {
        return false;
      }
      if (selectedFilter === 'organizer' && (p.role || '').toLowerCase() !== 'organizer') {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(term);
        const matchesEmail = (p.email || '').toLowerCase().includes(term);
        const matchesCollege = (p.college || '').toLowerCase().includes(term);
        const matchesTag = (p.tag || '').toLowerCase().includes(term);
        return matchesName || matchesEmail || matchesCollege || matchesTag;
      }

      return true;
    });
  }, [players, searchTerm, selectedFilter, followingSet]);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">

      {/* ═══════════════ 1. HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-16 sm:py-20">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-arena.jpg"
            alt="Varsity Athletes"
            className="w-full h-full object-cover filter brightness-[0.22] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">

            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Users className="h-3.5 w-3.5" /> Collegiate Athletes Directory
              </div>

              <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
                Varsity <span className="text-emerald-400">Athletes</span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 font-normal">
                Discover, network with, and follow collegiate competitors and team captains from other universities across India.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-4 rounded-3xl shrink-0">
              <div className="px-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Other Athletes</span>
                <p className="text-2xl sm:text-3xl font-black text-white">{players.length}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="px-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Following</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400">{followingSet.size}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 2. SEARCH & FOLLOWING FILTERS ═══════════════ */}
      <section className="sticky top-16 z-30 border-b border-white/10 bg-black/90 backdrop-blur-2xl py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Search Bar */}
            <div className="relative w-full sm:w-80 md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search other athletes by name, college, IGN..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-900/80 pl-11 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/80 border border-white/10 overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${selectedFilter === 'all'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                All Athletes ({players.length})
              </button>

              <button
                onClick={() => setSelectedFilter('following')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${selectedFilter === 'following'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Heart className="h-3.5 w-3.5" /> Following ({followingSet.size})
              </button>

              <button
                onClick={() => setSelectedFilter('player')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${selectedFilter === 'player'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                Players
              </button>

              <button
                onClick={() => setSelectedFilter('organizer')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${selectedFilter === 'organizer'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                Organizers
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 3. ATHLETES GRID ═══════════════ */}
      <section className="py-12 sm:py-16 bg-black min-h-[50vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {loading && players.length === 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="rounded-3xl border border-white/5 bg-[#09090b] p-6 space-y-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900" />
                    <div className="w-20 h-7 rounded-xl bg-zinc-900" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="w-36 h-5 rounded bg-zinc-900" />
                    <div className="w-24 h-3.5 rounded bg-zinc-900/60" />
                    <div className="w-28 h-3.5 rounded bg-zinc-900/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase text-white">No Athletes Found</h3>
              <p className="text-xs text-zinc-400">
                {selectedFilter === 'following'
                  ? "You haven't followed any other athletes yet. Browse 'All Athletes' to follow collegiate rivals!"
                  : searchTerm
                    ? `No athletes match "${searchTerm}".`
                    : 'No other registered athletes found in the database yet.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlayers.map((player, idx) => {
                const avatarSrc = player.avatar_url || player.avatar || '/valorant.jpg';
                const isFollowing = followingSet.has((player.email || '').toLowerCase());
                const playerRole = (player.role || '').toUpperCase();
                const roleBadgeColor =
                  playerRole === 'ADMIN'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : playerRole === 'ORGANIZER'
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                return (
                  <motion.div
                    key={player.email || player.id || `p-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.012, 0.15) }}
                    className="group rounded-3xl border border-white/10 bg-[#09090b] hover:border-emerald-500/40 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/5 relative overflow-hidden"
                  >
                    {/* Top Glow Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="space-y-4">
                      {/* Header Avatar & Follow Button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/15 group-hover:border-emerald-500 transition-colors bg-zinc-900 shrink-0 flex items-center justify-center">
                            {avatarSrc ? (
                              <img src={avatarSrc} alt={player.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-black text-emerald-400">
                                {player.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Follow / Following Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(player.email)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${isFollowing
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400'
                              : 'bg-white/5 border border-white/15 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-500 shadow-md'
                            }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5 group-hover:hidden" />
                              <UserX className="h-3.5 w-3.5 hidden group-hover:inline" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Name, Tag & Role */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black uppercase text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors">
                            {player.name}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${roleBadgeColor}`}>
                            {player.role || 'PLAYER'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-emerald-400 font-mono truncate">
                          {player.tag || `@${player.name.toLowerCase().replace(/\s+/g, '')}`}
                        </p>
                      </div>

                      {/* College */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold truncate pt-1">
                        <Building2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{player.college || 'General Campus'}</span>
                      </div>

                      {/* Bio */}
                      {player.bio && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed pt-1">
                          {player.bio}
                        </p>
                      )}
                    </div>

                    {/* Footer CTA */}
                    <div className="pt-5 mt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase">
                        Rank #{player.rank || 1}
                      </span>

                      <Link
                        href={`/players/${encodeURIComponent(player.email || player.id)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-500 text-xs font-black uppercase tracking-wider text-slate-200 transition"
                      >
                        Profile <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
