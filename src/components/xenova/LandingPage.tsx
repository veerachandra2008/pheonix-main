'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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

// New Component Imports
import LiveMatchTicker from './LiveMatchTicker';
import PlatformBentoGrid from './PlatformBentoGrid';
import LeaderboardWidget from './LeaderboardWidget';
import LiveTelecaster from './LiveTelecaster';

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
    actionUrl: "/tournaments/nexus-valorant-champions-cup",
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
    actionUrl: "/tournaments/bgmi-college-cup-season-4",
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
    actionUrl: "/tournaments/cs2-campus-clash",
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
    actionUrl: "/tournaments/campus-fc24-showdown",
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
    if (typeof window !== 'undefined' && localStorage.getItem('xenova_session')) {
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
        
        {/* ═══════════════ 1. SPACIOUS CINEMATIC HERO ═══════════════ */}
        <section className="relative min-h-screen flex items-center justify-start overflow-hidden py-28 md:py-36 pl-6 sm:pl-16 lg:pl-24 pr-6">
          {/* Background Image Layer - Themed Esports Vignette & Atmosphere Overlays */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <Image
              src="/image.png"
              alt="XENOVA Collegiate Esports Arena"
              fill
              priority
              quality={95}
              sizes="100vw"
              className="w-full h-full object-cover object-[center_35%] scale-[1.02] filter brightness-[0.80] contrast-[1.15] saturate-[1.25] transform-gpu will-change-transform"
            />
            {/* Left Vignette for High-Contrast Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 via-45% to-black/20 md:to-transparent" />
            
            {/* Top Vignette blending into navbar */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
            
            {/* Ambient Cyberpunk Emerald & Cyan Tournament Arena Lighting over Battle Scene */}
            <div
              className="absolute inset-0 opacity-70 mix-blend-screen"
              style={{
                background: 'radial-gradient(circle at 72% 48%, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.12) 30%, transparent 65%)'
              }}
            />

            {/* Subtle Combat Muzzle Flare Warmth Accent */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                background: 'radial-gradient(circle at 62% 46%, rgba(245, 158, 11, 0.18) 0%, transparent 40%)'
              }}
            />

            {/* Tactical Grid Overlay for Cyberpunk Varsity Aesthetic */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9810a_1px,transparent_1px),linear-gradient(to_bottom,#10b9810a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] opacity-35" />
          </div>

          {/* Left-Aligned Hero Content - Larger Scale & Spacing */}
          <div className="relative z-10 max-w-5xl text-left space-y-10 flex flex-col items-start pt-12">
            
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-widest backdrop-blur-md"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Collegiate Varsity Infrastructure
            </motion.div>

            {/* Headline - Substantially Larger & High Impact */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl sm:text-8xl lg:text-[8rem] xl:text-[8.5rem] font-black tracking-tighter text-white leading-[0.9] uppercase drop-shadow-2xl max-w-5xl"
            >
              The Collegiate <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                Esports Hub
              </span>
            </motion.h1>

            {/* Subtext - Increased Size & Spacing */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-3xl text-lg sm:text-2xl text-zinc-300 leading-relaxed font-normal drop-shadow-md"
            >
              The unified competitive portal for university esports teams and players. Host, compete, and dominate in national varsity leagues.
            </motion.p>

            {/* Liquid Glassmorphic CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-5 pt-4 z-20"
            >
              <button
                type="button"
                onClick={() => router.push('/host')}
                className="blob-btn inline-flex items-center gap-3 rounded-full bg-emerald-500 px-9 py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 hover:bg-emerald-400 transition shadow-2xl shadow-emerald-500/40 hover:scale-105 cursor-pointer border border-emerald-400/40"
              >
                <Trophy className="h-4.5 w-4.5 fill-zinc-950" />
                <span className="nav-menu-link tracking-[0.14em]">HOST EVENT</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </button>

              <button
                type="button"
                onClick={() => requireLogin('/tournaments')}
                className="blob-btn-secondary inline-flex items-center gap-3 rounded-full border border-white/20 bg-black/60 backdrop-blur-2xl px-9 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-200 hover:bg-white/10 hover:text-white hover:border-emerald-500/50 transition shadow-2xl hover:scale-105 cursor-pointer"
              >
                <Gamepad2 className="h-4.5 w-4.5 text-emerald-400" />
                <span className="nav-menu-link tracking-[0.14em]">Explore Tournaments</span>
              </button>
            </motion.div>
          </div>
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
