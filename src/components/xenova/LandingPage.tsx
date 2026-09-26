'use client';

import { useState, useEffect, useRef } from 'react';
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
import FinalCTA from './FinalCTA';
import SpotlightCard from './SpotlightCard';
import { ServiceCarousel, type Service } from '@/components/ui/services-card';
import { getXenovaSession } from '@/lib/auth-session';

// New Component Imports
import LiveMatchTicker from './LiveMatchTicker';
import PlatformBentoGrid from './PlatformBentoGrid';
import LeaderboardWidget from './LeaderboardWidget';
import LiveTelecaster from './LiveTelecaster';
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

// Event Cards formatted as Service items for animated ServiceCarousel with direct actionUrl redirection
const allEventServices: (Service & { category: string })[] = [
  {
    number: "001",
    title: "Inter-College Valorant Showdown",
    description: "IIT Bombay & BITS Pilani • 32 Colleges competing in 5v5 Tactical Shooter mode for ₹1,50,000 prize pool.",
    icon: Swords,
    gradient: "from-purple-950/90 via-zinc-950 to-black",
    tag: "LIVE NOW",
    prizePool: "₹1,50,000",
    mode: "VALORANT • 5v5 Tactical",
    image: "/valorant.jpg",
    category: "VALORANT",
    actionUrl: "/tournaments",
  },
  {
    number: "002",
    title: "National Collegiate BGMI Championship",
    description: "Delhi University Esports Hub • 64 Squads battle in Battle Royale for bragging rights and ₹2,50,000 prize pool.",
    icon: Trophy,
    gradient: "from-amber-950/90 via-zinc-950 to-black",
    tag: "QUICK APPLY",
    prizePool: "₹2,50,000",
    mode: "BGMI • Battle Royale",
    image: "/bgmi.jpg",
    category: "BGMI",
    actionUrl: "/tournaments",
  },
  {
    number: "003",
    title: "CS2 University Pro League S4",
    description: "Anna University & SRM • 16 Top teams in 5v5 Defuse battling for ₹1,00,000 total prize pool.",
    icon: ShieldCheck,
    gradient: "from-emerald-950/90 via-zinc-950 to-black",
    tag: "REGISTRATION OPEN",
    prizePool: "₹1,00,000",
    mode: "COUNTER-STRIKE 2 • 5v5",
    image: "/cs2.jpg",
    category: "CS2",
    actionUrl: "/tournaments",
  },
  {
    number: "004",
    title: "Campus FC24 Showdown",
    description: "University Sports Federation • 1v1 Football tournament with high-stakes individual bracket competition.",
    icon: Gamepad2,
    gradient: "from-blue-950/90 via-zinc-950 to-black",
    tag: "UPCOMING",
    prizePool: "₹75,000",
    mode: "EA SPORTS FC24 • 1v1",
    image: "/fc.jpg",
    category: "FC24",
    actionUrl: "/tournaments",
  },
];

/* ───────── MAIN COMPONENT ───────── */

export default function LandingPage() {
  const router = useRouter();
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const filteredEvents = selectedGameFilter === 'ALL'
    ? allEventServices
    : allEventServices.filter(e => e.category === selectedGameFilter);

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

        {/* ═══════════════ 2. LIVE MATCH TICKER (MICRO-SCROLL REVEAL) ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <LiveMatchTicker />
        </motion.div>

        {/* ═══════════════ 3. SLEEK HORIZONTAL GAME MARQUEE ═══════════════ */}
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
            <ServiceCarousel services={filteredEvents} />

          </div>
        </motion.section>

        {/* ═══════════════ 5. ACETERNITY / MAGIC UI BENTO GRID (SCROLL REVEAL) ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <PlatformBentoGrid />
        </motion.div>

        {/* ═══════════════ 6. UNIQUE 3-TIER PODIUM LEADERBOARD WIDGET ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <LeaderboardWidget />
        </motion.div>

        {/* ═══════════════ 7. LIVE MATCH TELECASTER ═══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          <LiveTelecaster />
        </motion.div>

        {/* ═══════════════ 8. FINAL CTA & FOOTER ═══════════════ */}
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
