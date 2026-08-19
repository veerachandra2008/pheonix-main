'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Search, SlidersHorizontal, Trophy, Users, Zap, Flame, ShieldCheck, ArrowRight } from 'lucide-react';
import { gameFilters, statusFilters, tournaments as defaultTournaments } from './data';
import { getAllTournaments, getUserRegistrations } from '@/lib/tournaments-db';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function TournamentsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Live' | 'Registering' | 'Upcoming'>('All');
  const [selectedGame, setSelectedGame] = useState('All');
  const [tournamentsList, setTournamentsList] = useState<any[]>(defaultTournaments);
  const [registeredSlugs, setRegisteredSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      // 1. Fetch DB / Seeded Tournaments
      const all = await getAllTournaments();
      setTournamentsList(all);

      // 2. Fetch User Registrations
      try {
        const rawSession = localStorage.getItem('xenova_session');
        const email = rawSession ? JSON.parse(rawSession).email : undefined;
        const regs = await getUserRegistrations(email);
        const slugs = new Set(regs.map((r) => r.tournamentSlug));
        setRegisteredSlugs(slugs);
      } catch (err) {
        console.warn('Failed to load user registrations', err);
      }
    }
    loadData();
  }, []);

  const filteredTournaments = useMemo(
    () =>
      tournamentsList.filter((tournament) => {
        const matchesSearch = [tournament.title, tournament.host, tournament.game, tournament.region]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        const matchesStatus = selectedStatus === 'All' || tournament.status === selectedStatus;
        const matchesGame = selectedGame === 'All' || tournament.game === selectedGame;

        return matchesSearch && matchesStatus && matchesGame;
      }),
    [searchTerm, selectedStatus, selectedGame, tournamentsList]
  );

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. SLANTED KINETIC HERO BANNER ═══════════════ */}
      <section 
        className="relative overflow-hidden bg-black py-16 sm:py-24 border-b border-emerald-500/30"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
        }}
      >
        {/* Background Artwork Layer with Parallax Glow */}
        <div className="absolute inset-0 z-0">
          <img
            src="/valorant.jpg"
            alt="Collegiate Esports Tournaments"
            className="w-full h-full object-cover filter brightness-[0.35] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_60%)]" />
        </div>

        {/* Slanted Geometric Neon Divider Lines */}
        <div className="absolute top-0 right-1/4 w-96 h-full pointer-events-none opacity-20 hidden lg:block">
          <div 
            className="w-full h-full bg-gradient-to-b from-emerald-400 via-teal-500 to-transparent"
            style={{ clipPath: 'polygon(60% 0, 75% 0, 15% 100%, 0 100%)' }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            
            <div className="space-y-4 max-w-3xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg"
              >
                <Zap className="h-4 w-4 fill-emerald-400 animate-pulse" /> Official University Esports Circuits
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase text-white leading-none drop-shadow-2xl"
              >
                Collegiate <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Tournaments</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-2xl"
              >
                Compete in official varsity brackets, represent your university squad, and battle for national rank points and direct prize money across India.
              </motion.p>
            </div>

            {/* Micro Stats Counter */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 rounded-2xl border border-white/15 bg-black/80 px-6 py-4 backdrop-blur-2xl shadow-2xl shrink-0"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Brackets</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">{tournamentsList.length}</p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Prize</p>
                <p className="text-2xl font-black text-amber-400 mt-0.5">₹4,50,000</p>
              </div>
            </motion.div>

          </div>

          {/* Search & Filters HUD */}
          <div className="mt-10 pt-8 border-t border-zinc-800/80 flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              
              <label className="flex min-h-12 flex-1 items-center gap-3 border border-white/15 bg-zinc-950/90 px-4 text-xs text-zinc-400 rounded-2xl shadow-inner backdrop-blur-md">
                <Search className="h-4 w-4 text-zinc-500" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-zinc-500 text-white text-xs sm:text-sm"
                  placeholder="Search by title, host university, game mode, or region..."
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" />
                  Status:
                </span>
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status as typeof selectedStatus)}
                    aria-pressed={selectedStatus === status}
                    className={`border px-4 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer uppercase tracking-wider ${
                      selectedStatus === status
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'border-white/10 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

            </div>
            
            <div className="flex flex-wrap gap-2">
              {gameFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedGame(filter)}
                  aria-pressed={selectedGame === filter}
                  className={`border px-4 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer uppercase tracking-wider ${
                    selectedGame === filter
                      ? 'border-emerald-500 bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════ 2. TOURNAMENTS MATCH GRID WITH SLANTED BENTO CARDS ═══════════════ */}
      <section className="py-14 sm:py-20 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filteredTournaments.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-16 text-center text-zinc-400 text-sm">
              No tournaments match your current search and filter selection.
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments.map((tournament, index) => (
                <motion.article
                  key={tournament.id || tournament.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onMouseEnter={() => {
                    router.prefetch(`/tournaments/${tournament.slug}`);
                    router.prefetch(`/registration/${tournament.slug}`);
                  }}
                  onTouchStart={() => {
                    router.prefetch(`/tournaments/${tournament.slug}`);
                    router.prefetch(`/registration/${tournament.slug}`);
                  }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] p-6 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.2)]"
                >
                  {/* Uneven Slanted Accent Edge Overlay */}
                  <div 
                    className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.8), transparent)',
                      clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
                    }}
                  />

                  <div>
                    {/* Cover Image Header with Zoom Transition */}
                    <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-zinc-950">
                      <img
                        src={tournament.image}
                        alt={`${tournament.game} tournament cover`}
                        className="h-full w-full object-cover filter brightness-95 saturate-110 transition duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-black/40 to-transparent" />
                      
                      {/* Status Badges */}
                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-black/90 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/40 rounded-full shadow-lg">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          {tournament.status}
                        </span>
                        <span className="bg-black/90 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-200 border border-white/15 rounded-full">
                          {tournament.game}
                        </span>
                        {registeredSlugs.has(tournament.slug) && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500 text-black px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-emerald-500/30">
                            REGISTERED ✓
                          </span>
                        )}
                      </div>

                      {/* Slanted Prize Pool Tag */}
                      <div 
                        className="absolute right-0 top-3 bg-black/90 px-4 py-1.5 text-right backdrop-blur-md border-l border-b border-amber-500/40 shadow-lg"
                        style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0% 100%)' }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Prize Pool</p>
                        <p className="text-xs font-black text-amber-400">{tournament.prize}</p>
                      </div>

                      {/* Bottom Live Countdown Badge */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <div className="inline-flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-rose-500/40 text-[10px] font-mono font-black text-rose-400 shadow-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>REGISTRATION CLOSES IN 14h 36m</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content Details */}
                    <div className="pt-5 space-y-3">
                      <div>
                        <h2 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                          {tournament.title || tournament.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-400 font-medium">
                          Hosted by <span className="text-white font-bold">{tournament.host}</span>
                        </p>
                      </div>

                      {/* Key Stats HUD */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-black/70 p-3.5 rounded-2xl border border-white/10">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <CalendarDays className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          {tournament.date}
                        </span>
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          {tournament.region}
                        </span>
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <Trophy className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          {tournament.format}
                        </span>
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          {tournament.players !== undefined ? `${tournament.players?.length || 0} Players` : `${tournament.teams} Teams`}
                        </span>
                      </div>

                      {/* Filled Seats Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="h-2 overflow-hidden bg-zinc-900 rounded-full border border-white/10">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${tournament.filled}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400">
                          <span>{tournament.filled}% Slots Reserved</span>
                          <span className="text-emerald-400">{tournament.fee}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-6 flex gap-3">
                    <Link
                      href={`/tournaments/${tournament.slug}`}
                      prefetch={true}
                      className="flex-1 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black text-white hover:bg-white/10 uppercase tracking-wider transition cursor-pointer active:scale-95"
                    >
                      Details
                    </Link>
                    {registeredSlugs.has(tournament.slug) ? (
                      <Link
                        href={`/registration/${tournament.slug}/pass`}
                        prefetch={true}
                        className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-500 text-black border border-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 cursor-pointer active:scale-95"
                      >
                        View Pass ✓
                      </Link>
                    ) : (
                      <Link
                        href={`/registration/${tournament.slug}`}
                        prefetch={true}
                        className="flex-1 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-zinc-950 hover:bg-emerald-400 uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 hover:scale-[1.03] active:scale-95 cursor-pointer"
                      >
                        Register
                      </Link>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ 3. INFORMATIONAL ABOUT SECTION WITH SLANTED CONTAINER ═══════════════ */}
      <section className="py-16 bg-black border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div 
            className="rounded-3xl border border-white/15 bg-[#09090b] p-8 md:p-12 backdrop-blur-xl shadow-2xl space-y-4 relative overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 96%, 0 100%)',
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5 relative z-10">
              <Trophy className="h-6 w-6 text-emerald-400" /> About XENOVA Collegiate Varsity Tournaments
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-5xl font-normal relative z-10">
              The XENOVA tournament ecosystem connects university gaming clubs across India, facilitating official varsity leagues, verified squad rosters, and automated bracket dispatch. All tournaments feature anti-cheat validation, student ID verification, and transparent prize distribution managed directly by campus esports organizers.
            </p>
          </div>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
