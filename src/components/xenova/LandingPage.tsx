'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Trophy,
  Zap,
  Gamepad2,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Swords,
  Layers,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import FinalCTA from './FinalCTA';
import SpotlightCard from './SpotlightCard';
import { ServiceCarousel, type Service } from '@/components/ui/services-card';
import { getXenovaSession } from '@/lib/auth-session';
import { fetchFreshTournaments, isTournamentExpired, cleanDescriptionText } from '@/lib/tournaments-db';
import { isGameFilterMatch } from '@/app/tournaments/data';
import { supabase } from '@/lib/supabase';

// Component Imports
import PlatformBentoGrid from './PlatformBentoGrid';
import LeaderboardWidget from './LeaderboardWidget';
import HeroCarousel from '@/components/HeroCarousel';

/* ───────── Data ───────── */

const marqueeGames = [
  'VALORANT',
  'BGMI',
  'COUNTER-STRIKE 2',
  'EA SPORTS FC 24',
  'FREE FIRE',
  'APEX LEGENDS',
  'ROCKET LEAGUE',
  'COD MOBILE',
];

/* ───────── MAIN COMPONENT ───────── */

export default function LandingPage() {
  const router = useRouter();
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  // Load real active tournaments from database
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const list = await fetchFreshTournaments();
        if (isMounted) {
          const active = (list || []).filter((t: any) => !isTournamentExpired(t));
          setTournaments(active);
          setLoadingTournaments(false);
        }
      } catch {
        if (isMounted) setLoadingTournaments(false);
      }
    };
    load();

    const handleUpdate = () => load();
    window.addEventListener('xenova-tournaments-updated', handleUpdate);

    const channel = supabase
      .channel('realtime:landing_tournaments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('xenova-tournaments-updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  const eventServices: (Service & { category: string })[] = useMemo(() => {
    return tournaments.map((t, idx) => {
      const cleanDesc = cleanDescriptionText(t.description || '');
      const subtitle = cleanDesc
        ? cleanDesc.length > 120 ? cleanDesc.slice(0, 120) + '...' : cleanDesc
        : `${t.college || t.host || 'University Circuit'} • ${t.format || 'Tournament'} • ${t.teams || 'Open Brackets'}`;

      const isLive = (t.status || '').toLowerCase() === 'live';

      return {
        number: String(idx + 1).padStart(3, '0'),
        title: t.title || t.name,
        description: subtitle,
        icon: isLive ? Swords : Trophy,
        gradient: 'from-emerald-950/90 via-zinc-950 to-black',
        tag: isLive ? 'LIVE NOW' : 'REGISTRATIONS OPEN',
        prizePool: t.prize,
        mode: `${t.game} • ${t.format || 'Collegiate'}`,
        image: t.image || '/hero-arena.jpg',
        category: (t.game || '').toUpperCase(),
        actionUrl: `/tournaments/${t.slug}`,
      };
    });
  }, [tournaments]);

  const filteredEvents = useMemo(() => {
    if (selectedGameFilter === 'ALL') return eventServices;
    return eventServices.filter((e) => isGameFilterMatch(e.category, selectedGameFilter));
  }, [eventServices, selectedGameFilter]);

  // Top Scroll Progress Line
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requireLogin = (target = '/dashboard') => {
    if (typeof window !== 'undefined' && getXenovaSession()) {
      router.push(target);
      return;
    }
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950 overflow-x-hidden">
      
      {/* Top Scroll Micro-Animation Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 z-50 origin-left"
        style={{ scaleX }}
      />

      <main className="relative z-10">
        
        {/* ═══════════════ 1. SPACIOUS CINEMATIC FULLSCREEN HERO CAROUSEL ═══════════════ */}
        <section className="relative w-full">
          <HeroCarousel fullscreen />
        </section>

        {/* ═══════════════ 2. SLEEK HORIZONTAL GAME MARQUEE ═══════════════ */}
        <section className="border-y border-zinc-900 bg-black/90 py-3 overflow-hidden select-none backdrop-blur-xl">
          <div className="relative flex overflow-x-hidden whitespace-nowrap">
            <motion.div
              className="flex items-center gap-12 text-zinc-400"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            >
              {[...marqueeGames, ...marqueeGames].map((game, i) => (
                <div key={i} className="flex items-center gap-12 shrink-0">
                  <span className="text-sm sm:text-base font-extrabold italic tracking-wider text-zinc-300 hover:text-emerald-400 transition cursor-default uppercase">
                    {game}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════ 4. REDESIGNED EVENT CARDS (SCROLL MICRO-ANIMATION) ═══════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
          className="py-20 md:py-28 bg-black/80"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header & Filter Controls */}
            <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Varsity Tournaments
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
                  Live & Upcoming Events
                </h2>
                <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl">
                  Quick apply for active college tournaments using our animated carousel cards.
                </p>
              </div>

              {/* Game Title Filter Upgrade */}
              <div className="flex flex-wrap items-center gap-2 bg-[#09090b]/90 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                {['ALL', 'VALORANT', 'BGMI', 'CS2', 'FC24'].map((game) => (
                  <button
                    key={game}
                    onClick={() => setSelectedGameFilter(game)}
                    className={`px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer ${
                      selectedGameFilter === game
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {game}
                  </button>
                ))}
              </div>
            </div>

            {/* Animated Service Carousel Component */}
            {loadingTournaments ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-[460px] rounded-3xl bg-zinc-900/60 border border-white/10 animate-pulse" />
                ))}
              </div>
            ) : filteredEvents.length > 0 ? (
              <ServiceCarousel services={filteredEvents} />
            ) : (
              <div className="rounded-3xl border border-white/10 bg-[#09090b]/80 p-12 text-center backdrop-blur-md">
                <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2">No Active Tournaments</h3>
                <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                  There are currently no active tournaments matching this selection. Explore all circuits or host your own tournament.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/tournaments"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition"
                  >
                    View All Tournaments
                  </Link>
                  <Link
                    href="/organizer/tournament/create"
                    className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 text-white text-xs font-black uppercase tracking-wider hover:bg-white/10 transition"
                  >
                    Host Tournament
                  </Link>
                </div>
              </div>
            )}

          </div>
        </motion.section>

        {/* ═══════════════ 4. ACETERNITY / MAGIC UI BENTO GRID (SCROLL REVEAL) ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <PlatformBentoGrid />
        </motion.div>

        {/* ═══════════════ 5. UNIQUE 3-TIER PODIUM LEADERBOARD WIDGET ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <LeaderboardWidget />
        </motion.div>

        {/* ═══════════════ 6. FINAL CTA & FOOTER ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <FinalCTA />
        </motion.div>

      </main>

      {/* Floating Micro-Animation Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-2xl shadow-emerald-500/40 border border-emerald-300 transition hover:scale-110 cursor-pointer"
          title="Scroll to top"
        >
          <ChevronUp className="w-5 h-5 stroke-[3]" />
        </motion.button>
      )}

    </div>
  );
}
