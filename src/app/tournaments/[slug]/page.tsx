'use client';

import Link from 'next/link';
import { useRouter, useParams, notFound } from 'next/navigation';
import { FormEvent, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Crown,
  Medal,
  Award,
  FileText,
  Clock,
  Sparkles,
  Share2,
  Check,
  ChevronRight,
  Gamepad2,
  Layers,
  DollarSign,
  Ticket
} from 'lucide-react';
import { tournaments as defaultTournaments } from '../data';
import { getUserRegistrations } from '@/lib/tournaments-db';
import { flaskApi } from '@/lib/flask-api';

interface TournamentPageParams {
  params?: Promise<{
    slug: string;
  }>;
}

// Game specific defaults for maps & rules
const GAME_METADATA: Record<string, { maps: string[]; defaultRules: string[]; defaultDesc: string }> = {
  Valorant: {
    maps: ['Ascent', 'Bind', 'Haven', 'Lotus', 'Split', 'Sunset'],
    defaultRules: [
      'Standard 5v5 Competitive Mode with 13-round victory condition.',
      'All 4 main players must be registered active university students.',
      'Riot Vanguard Anti-Cheat is mandatory on all client machines.',
      'A 10-minute check-in grace period applies before match forfeit.',
      'Overtime format: Win by 2 (Max 2 overtime sets then Sudden Death).',
    ],
    defaultDesc: 'Official university Valorant championship. Assemble your 4-player squad, prove tactical superiority, and climb the collegiate brackets for varsity glory and cash rewards.'
  },
  BGMI: {
    maps: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi'],
    defaultRules: [
      'Battle Royale Squad matches with standard 10-point scoring table.',
      'Only mobile devices permitted (Emulators, iPad, and Triggers strictly prohibited).',
      'All 4 players must submit registered gamer tags and university emails.',
      'Point System: 1st Place = 10 pts, 2nd = 6 pts, 3rd = 5 pts, 4th = 4 pts + 1 pt per elimination.',
      'Room credentials will be dispatched to squad captains 15 minutes before lobby launch.',
    ],
    defaultDesc: 'The ultimate battleground for university mobile gamers. Drop into Erangel and Miramar with your 4-player squad to claim the regional championship trophy.'
  },
  CS2: {
    maps: ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust II'],
    defaultRules: [
      'Standard MR12 Competitive rules on 128-tick verified private match servers.',
      'Valve Anti-Cheat (VAC) and custom server anticheat active.',
      'Map veto system: Ban-Ban-Pick-Pick-Decider for BO3 matches.',
      'Tactical pauses: Maximum two 30-second timeouts allowed per team per map.',
    ],
    defaultDesc: 'Collegiate CS2 championship series. Execute precision smokes, site retakes, and tactical gunplay across the active duty map pool.'
  },
  'Free Fire': {
    maps: ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine'],
    defaultRules: [
      'Classic Squad Battle Royale mode across 4 rotating maps.',
      'Gun skins with attribute enhancements are disabled for competitive parity.',
      'Emulators and root devices are strictly disqualified.',
      'Kill point multiplier and placement points tally after each match set.',
    ],
    defaultDesc: 'High-octane collegiate Free Fire tournament. Form your 4-player squad and outlast university rivals in fast-paced survival action.'
  },
  'FC / FIFA': {
    maps: ['Champions Stadium', 'Wembley', 'Santiago Bernabéu'],
    defaultRules: [
      '1v1 / 2v2 Competitive Head-to-Head with 95 OVR squad balancing.',
      '6-minute halves with tactical defending required.',
      'In case of a draw at 90 minutes, match proceeds to Classic Extra Time and Penalties.',
    ],
    defaultDesc: 'The premier collegiate virtual football open. Showcase precision dribbling, tactical builds, and competitive skill.'
  }
};

export default function TournamentDetailPage({ params: paramsPromise }: TournamentPageParams) {
  const urlParams = useParams();
  const rawSlug = (urlParams?.slug as string) || '';
  const [slug, setSlug] = useState(rawSlug);
  const router = useRouter();

  useEffect(() => {
    if (paramsPromise) {
      paramsPromise.then((p) => {
        if (p?.slug) setSlug(p.slug);
      }).catch(() => {});
    }
  }, [paramsPromise]);

  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [userPassId, setUserPassId] = useState<string | null>(null);
  const [registeredTeamsList, setRegisteredTeamsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'prizes' | 'schedule' | 'teams' | 'rules'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadTournamentData() {
      const apiBase = process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';
      const targetSlug = slug || rawSlug;
      if (!targetSlug) return;

      setLoading(true);

      // 1. Check session
      try {
        const rawSession = localStorage.getItem('xenova_session');
        if (rawSession) {
          const user = JSON.parse(rawSession);
          setSessionUser(user);
          if (user.email) {
            const regs = await getUserRegistrations(user.email.toLowerCase());
            const matchedReg = regs.find((r) => r.tournamentSlug?.toLowerCase() === targetSlug.toLowerCase());
            if (matchedReg) {
              setAlreadyRegistered(true);
              setUserPassId(matchedReg.passId);
            }
          }
        }
      } catch (e) {
        console.warn('Session check notice:', e);
      }

      // 2. Fetch tournament from database
      let found: any = null;
      try {
        const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            found = json.data.find(
              (t: any) =>
                t.slug?.toLowerCase() === targetSlug.toLowerCase() ||
                String(t.id) === targetSlug
            );
          }
        }
      } catch (e) {
        console.warn('Backend tournament fetch notice:', e);
      }

      if (!found) {
        found = defaultTournaments.find(
          (t) => t.slug?.toLowerCase() === targetSlug.toLowerCase()
        );
      }

      if (!found) {
        found = {
          slug: targetSlug,
          title: targetSlug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          game: 'Valorant',
          host: 'Xenova Collegiate',
          image: '/valorant.jpg',
          prize: '₹1,00,000',
          fee: 'Free',
          date: 'Upcoming',
          region: 'Pan India',
          format: '4v4 Squad Tournament',
          teams: '64 Teams',
          status: 'Registering',
          status_color: '#10B981',
        };
      }

      setTournament(found);

      // 3. Fetch registered squads specifically for this tournament
      try {
        const regsRes = await flaskApi.getRegistrationsByTournament(found.slug || targetSlug);
        if (regsRes && regsRes.success && Array.isArray(regsRes.data)) {
          setRegisteredTeamsList(regsRes.data);
        }
      } catch {}

      setLoading(false);
    }

    loadTournamentData();
  }, [slug, rawSlug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Compute game-specific details
  const gameMeta = useMemo(() => {
    if (!tournament) return GAME_METADATA.Valorant;
    const gameKey = Object.keys(GAME_METADATA).find((k) =>
      tournament.game?.toLowerCase().includes(k.toLowerCase())
    );
    return gameKey ? GAME_METADATA[gameKey] : GAME_METADATA.Valorant;
  }, [tournament]);

  // Compute dynamic prize amounts
  const computedPrizes = useMemo(() => {
    if (!tournament) return { first: '₹60,000', second: '₹30,000', third: '₹10,000', total: '₹1,00,000' };
    
    if (tournament.prize_1st && tournament.prize_2nd) {
      return {
        first: tournament.prize_1st,
        second: tournament.prize_2nd,
        third: tournament.prize_3rd || 'Trophy & Verified Badge',
        total: tournament.prize || 'Championship Pool',
      };
    }

    const numericMatch = (tournament.prize || '').match(/\d[\d,]*/);
    if (numericMatch) {
      const rawNum = parseInt(numericMatch[0].replace(/,/g, ''), 10);
      const p1 = Math.round(rawNum * 0.55);
      const p2 = Math.round(rawNum * 0.30);
      const p3 = Math.round(rawNum * 0.15);
      return {
        first: `₹${p1.toLocaleString('en-IN')}`,
        second: `₹${p2.toLocaleString('en-IN')}`,
        third: `₹${p3.toLocaleString('en-IN')}`,
        total: tournament.prize,
      };
    }

    return {
      first: '50% of Pool',
      second: '30% of Pool',
      third: '20% of Pool',
      total: tournament.prize || 'Guaranteed Pool',
    };
  }, [tournament]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Tournament Lobby...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white text-center">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-black">Tournament Not Found</h2>
          <p className="text-sm text-slate-400">The requested championship lobby does not exist or has concluded.</p>
          <Link href="/tournaments" className="inline-flex px-6 py-3 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase">
            Browse Active Tournaments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950 pb-24">
      
      {/* ═══════════════ 1. HERO BANNER ═══════════════ */}
      <section className="relative min-h-[480px] sm:min-h-[520px] w-full overflow-hidden border-b border-zinc-900 bg-black flex items-end">
        
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={tournament.image || '/hero-arena.jpg'}
            alt={tournament.title || 'Tournament'}
            className="h-full w-full object-cover filter brightness-70 saturate-125 scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        {/* Back Link & Quick Actions */}
        <div className="absolute top-8 left-0 right-0 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl"
          >
            <ArrowLeft className="h-4 w-4" /> Tournaments
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Event'}
          </button>
        </div>

        {/* Hero Title & Meta Strip */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-28">
          <div className="space-y-4 max-w-4xl">
            
            {/* Badges Strip */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg"
                style={{ backgroundColor: tournament.status_color || '#10B981' }}
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                {tournament.status || 'Registering'}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-black/80 border border-white/15 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-200 backdrop-blur-md">
                <Gamepad2 className="h-3.5 w-3.5 text-emerald-400" /> {tournament.game}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-amber-400 backdrop-blur-md">
                <Trophy className="h-3.5 w-3.5" /> Prize Pool {tournament.prize}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight">
              {tournament.title || tournament.name}
            </h1>

            {/* Meta Items */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-zinc-300 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Hosted by {tournament.host || 'Xenova Esports'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CalendarDays className="h-4 w-4 text-emerald-400" /> {tournament.date || 'Scheduled'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <MapPin className="h-4 w-4 text-emerald-400" /> {tournament.region || 'Online'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                Fee: {tournament.fee || 'Free'}
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 2. NAVIGATION TAB SWITCHER ═══════════════ */}
      <section className="sticky top-0 z-30 border-b border-zinc-900 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-4 overflow-x-auto py-3 no-scrollbar">
            {[
              { id: 'overview', label: 'Overview & Maps', icon: Trophy },
              { id: 'prizes', label: 'Prize Podium', icon: Crown },
              { id: 'schedule', label: 'Schedule & Stages', icon: Clock },
              { id: 'teams', label: `Registered Squads (${registeredTeamsList.length})`, icon: Users },
              { id: 'rules', label: 'Rules & Guidelines', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. MAIN CONTENT GRID ═══════════════ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN - DYNAMIC TABBED CONTENT (8 COLS) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* TAB 1: OVERVIEW & MAPS */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                {/* Synopsis */}
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-6 sm:p-8 space-y-4 shadow-2xl">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-emerald-400" /> Tournament Synopsis
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
                    {tournament.description || gameMeta.defaultDesc}
                  </p>
                </div>

                {/* Bento Grid Specifications */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Match Mode</span>
                    <p className="text-sm font-black text-white">{tournament.format || '4v4 Squad'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Squad Size</span>
                    <p className="text-sm font-black text-emerald-400">Exactly 4 Players</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Slots Cap</span>
                    <p className="text-sm font-black text-white">{tournament.teams || '64 Teams'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Anti-Cheat</span>
                    <p className="text-sm font-black text-emerald-400">Enforced</p>
                  </div>
                </div>

                {/* Map Pool Section */}
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-6 sm:p-8 space-y-4 shadow-2xl">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-400" /> Competitive Map Pool
                  </h3>
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {(tournament.map_pool
                      ? tournament.map_pool.split(',').map((m: string) => m.trim())
                      : gameMeta.maps
                    ).map((mapName: string) => (
                      <span
                        key={mapName}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200 uppercase tracking-wider"
                      >
                        {mapName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prize Breakdown Quick Card */}
                <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#09090b] to-black p-6 sm:p-8 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" /> Guaranteed Prize Pool Distribution
                    </h3>
                    <span className="text-sm font-black text-amber-400">{computedPrizes.total}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs pt-2">
                    <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-1">
                      <span className="block text-[10px] font-black text-amber-300 uppercase">1st Place</span>
                      <span className="text-base font-black text-white">{computedPrizes.first}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-700 space-y-1">
                      <span className="block text-[10px] font-black text-zinc-400 uppercase">2nd Place</span>
                      <span className="text-base font-black text-white">{computedPrizes.second}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-900/20 border border-amber-800/50 space-y-1">
                      <span className="block text-[10px] font-black text-amber-600 uppercase">3rd Place</span>
                      <span className="text-base font-black text-white">{computedPrizes.third}</span>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: PRIZE POOL PODIUM */}
            {activeTab === 'prizes' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Guaranteed Rewards</span>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Podium Distribution</h2>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-wider">
                      Total: {computedPrizes.total}
                    </span>
                  </div>

                  {/* Podium Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
                    
                    {/* 2nd Place */}
                    <div className="rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-800/40 via-zinc-900/60 to-black p-6 text-center space-y-4 shadow-xl order-2 md:order-1">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-700/30 border border-zinc-600 flex items-center justify-center text-zinc-300">
                        <Medal className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">RUNNERS UP</span>
                        <h3 className="text-2xl font-black text-white mt-1">{computedPrizes.second}</h3>
                        <p className="text-xs text-zinc-400 mt-1">+ Silver Trophy & Points</p>
                      </div>
                    </div>

                    {/* 1st Place - Gold Champion */}
                    <div className="rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/20 via-zinc-950 to-black p-8 text-center space-y-4 shadow-2xl shadow-amber-500/10 order-1 md:order-2 md:-translate-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300 shadow-lg">
                        <Crown className="w-9 h-9" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">NATIONAL CHAMPIONS</span>
                        <h3 className="text-3xl sm:text-4xl font-black text-white mt-1">{computedPrizes.first}</h3>
                        <p className="text-xs text-amber-300/80 mt-1">+ Gold Trophy & Varsity Badges</p>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="rounded-3xl border border-amber-800/50 bg-gradient-to-b from-amber-950/30 via-zinc-900/60 to-black p-6 text-center space-y-4 shadow-xl order-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-amber-600">
                        <Award className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">3RD PLACE</span>
                        <h3 className="text-2xl font-black text-white mt-1">{computedPrizes.third}</h3>
                        <p className="text-xs text-zinc-400 mt-1">+ Bronze Medal</p>
                      </div>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: SCHEDULE & STAGES */}
            {activeTab === 'schedule' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-400" /> Match Schedule & Stages
                  </h3>

                  {tournament.schedule ? (
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/10 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {tournament.schedule}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black shrink-0">
                          STAGE 1
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase">Squad Check-in & Roster Lock</h4>
                          <p className="text-xs text-slate-400 mt-1">Captains confirm attendance with all 4 student ID credentials.</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                        <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black shrink-0">
                          STAGE 2
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase">Group Stage & Eliminators</h4>
                          <p className="text-xs text-slate-400 mt-1">Bracketed matches across {tournament.format || 'Double Elimination'}.</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black shrink-0">
                          FINALS
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase">Grand Finals Championship</h4>
                          <p className="text-xs text-slate-400 mt-1">Live broadcast finals with trophy and prize ceremony.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 4: REGISTERED TEAMS */}
            {activeTab === 'teams' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-400" /> Registered Varsity Squads ({registeredTeamsList.length})
                    </h3>
                  </div>

                  {registeredTeamsList.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs font-medium space-y-2">
                      <Users className="h-8 w-8 mx-auto text-slate-600" />
                      <p>Be the first squad to register for this tournament!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {registeredTeamsList.map((reg, idx) => (
                        <div
                          key={reg.pass_id || idx}
                          className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-white uppercase">{reg.team_name || reg.teamName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                              {reg.pass_id || reg.passId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Captain: <strong className="text-slate-200">{reg.captain_name || reg.captainName}</strong>
                          </p>
                          <p className="text-xs text-slate-500">
                            College: {reg.college || 'Collegiate Campus'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 5: RULES & GUIDELINES */}
            {activeTab === 'rules' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-rose-400" /> Rules & Tournament Regulations
                  </h3>

                  {tournament.rules ? (
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/10 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {tournament.rules}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gameMeta.defaultRules.map((rule, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-rose-500/15 text-rose-400 text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">{rule}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </div>

          {/* RIGHT COLUMN - STICKY 4-PLAYER SQUAD REGISTRATION CTA (4 COLS) */}
          <div className="lg:col-span-4 sticky top-28 space-y-6">
            
            <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#0C111D] via-[#09090b] to-black p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-500/10">
              
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Squad Entry Desk</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">4-Player Squad Registration</h3>
                <p className="text-xs text-slate-400">
                  Entry Fee: <strong className="text-white">{tournament.fee || 'Free'}</strong>
                </p>
              </div>

              {alreadyRegistered ? (
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">Squad Registered!</h4>
                    <p className="text-xs text-slate-400 mt-1">Your 4-player team has been verified for this event.</p>
                  </div>

                  <Link
                    href={`/registration/${tournament.slug}/pass?passId=${userPassId || ''}`}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Ticket className="h-4 w-4" />
                    View 4-Player Entry Pass
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Team Structure</span>
                      <span className="font-bold text-emerald-400">Exactly 4 Players</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Emails Required</span>
                      <span className="font-bold text-white">All 4 Members</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Pass Type</span>
                      <span className="font-bold text-white">Digital QR Ticket</span>
                    </div>
                  </div>

                  <Link
                    href={`/registration/${tournament.slug}`}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Register 4-Player Squad
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* Host Support Info */}
              <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-500 space-y-1">
                <p>Tournament Organized by <span className="text-slate-300 font-bold">{tournament.host || 'Xenova Arena'}</span></p>
                {tournament.contact_email && (
                  <p className="text-emerald-400 font-mono text-[11px]">{tournament.contact_email}</p>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>

    </main>
  );
}
