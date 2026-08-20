'use client';

import React, { use, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
  Flame,
  ChevronRight,
  Award,
  Crown,
  Share2,
  Check,
  Building2,
  Target,
  Sparkles,
  Swords,
  Crosshair,
  Medal,
  TrendingUp,
  Gamepad2,
  Calendar,
  Star,
  CircleDot,
  BarChart3,
} from 'lucide-react';
import { getCustomTeams, defaultTeams, slugify, type XenovaTeam } from '@/lib/xenova-data';
import FinalCTA from '@/components/xenova/FinalCTA';

/* ═══════════════════════════════════════════════════════════════════════════
   TEAM DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const gameImageMap: Record<string, string> = {
  'Valorant': '/valorant.jpg',
  'BGMI': '/bgmi.jpg',
  'CS2': '/cs2.jpg',
  'FC24': '/fc.jpg',
  'Free Fire': '/freefire.jpg',
  'Apex Legends': '/apex.jpg',
  'COD Mobile': '/codm.jpg',
  'Rocket League': '/rocket.jpg',
};

const gameTagline: Record<string, string> = {
  'Valorant': '5v5 TACTICAL SHOOTER',
  'BGMI': 'BATTLE ROYALE',
  'CS2': '5v5 DEFUSE',
  'FC24': '1v1 FOOTBALL SIM',
  'Free Fire': 'BATTLE ROYALE',
  'Apex Legends': 'BATTLE ROYALE',
  'COD Mobile': 'FPS MOBILE',
  'Rocket League': 'VEHICULAR SOCCER',
};

interface TeamWithRoster extends XenovaTeam {
  roster?: string[];
}

const defaultTeamsList: TeamWithRoster[] = [
  {
    slug: 'team-phoenix',
    name: 'Team Phoenix',
    college: 'Arcadia College',
    game: 'BGMI',
    rank: 1,
    winRate: 91,
    streak: 'W11',
    captain: 'Nisha "Blaze" Menon',
    trophies: 12,
    members: 5,
    recentWins: 7,
    form: ['W', 'W', 'W', 'W', 'W'],
    activeScore: 96,
    joined: 2025,
    accent: '#f43f5e',
    verified: true,
    verificationStatus: 'approved',
    roster: ['Nisha "Blaze" Menon (Captain)', 'Rahul "Psycho" Nair', 'Abhi "Raptor" Sen', 'Vikram "Spike" Das', 'Kriti "Frost" Pillai'],
  },
  {
    slug: 'team-titans',
    name: 'Team Titans',
    college: 'Nexus Institute of Technology',
    game: 'Valorant',
    rank: 2,
    winRate: 86,
    streak: 'W7',
    captain: 'Aarav "Viper" Rao',
    trophies: 9,
    members: 6,
    recentWins: 5,
    form: ['W', 'W', 'W', 'L', 'W'],
    activeScore: 98,
    joined: 2026,
    accent: '#6366f1',
    verified: true,
    verificationStatus: 'approved',
    roster: ['Aarav "Viper" Rao (Captain)', 'Rohan "Sage" Dev', 'Karan "Omen" Sen', 'Amit "Breach" Roy', 'Vikas "Sova" Jha', 'Neil "Jett" Vyas'],
  },
  {
    slug: 'cyber-hawks',
    name: 'Cyber Hawks',
    college: 'Westbridge Engineering College',
    game: 'CS2',
    rank: 3,
    winRate: 79,
    streak: 'W4',
    captain: 'Rehan "Scope" Khan',
    trophies: 7,
    members: 5,
    recentWins: 4,
    form: ['W', 'W', 'L', 'W', 'W'],
    activeScore: 91,
    joined: 2025,
    accent: '#fbbf24',
    verified: true,
    verificationStatus: 'approved',
    roster: ['Rehan "Scope" Khan (Captain)', 'Arijit "Flash" Roy', 'Nikhil "Smoke" Dev', 'Sameer "Burst" Das', 'Tanu "Heal" Shah'],
  },
  {
    slug: 'team-wolves',
    name: 'Team Wolves',
    college: 'Metro School of Design',
    game: 'Valorant',
    rank: 4,
    winRate: 73,
    streak: 'L1',
    captain: 'Kabir "Ghost" Singh',
    trophies: 5,
    members: 6,
    recentWins: 3,
    form: ['W', 'L', 'W', 'W', 'L'],
    activeScore: 88,
    joined: 2024,
    accent: '#22d3ee',
    verified: true,
    verificationStatus: 'approved',
    roster: ['Kabir "Ghost" Singh (Captain)', 'Siddharth "Neon" Lal', 'Aman "Cypher" Shah', 'Meera "Fade" Patel', 'Dev "Chamber" Gill', 'Jaya "Reyna" Bose'],
  },
  {
    slug: 'royal-strikers',
    name: 'Royal Strikers',
    college: 'National Sports Academy',
    game: 'FC24',
    rank: 5,
    winRate: 75,
    streak: 'W3',
    captain: 'Dev "Prime" Kapoor',
    trophies: 6,
    members: 3,
    recentWins: 4,
    form: ['W', 'L', 'W', 'W', 'W'],
    activeScore: 84,
    joined: 2024,
    accent: '#a855f7',
    verified: true,
    verificationStatus: 'approved',
    roster: ['Dev "Prime" Kapoor (Captain)', 'Kunal "Striker" Dev', 'Sam "Goalie" Roy'],
  },
  {
    slug: 'team-alpha',
    name: 'Team Alpha',
    college: 'Eastern Commerce University',
    game: 'Free Fire',
    rank: 6,
    winRate: 68,
    streak: 'W2',
    captain: 'Ishan "Ace" Verma',
    trophies: 4,
    members: 4,
    recentWins: 2,
    form: ['L', 'W', 'L', 'W', 'W'],
    activeScore: 77,
    joined: 2026,
    accent: '#10b981',
    verified: true,
    verificationStatus: 'approved',
    roster: ['Ishan "Ace" Verma (Captain)', 'Raj "Sniper" Pal', 'Priya "Storm" Vyas', 'Sunny "Viper" Gill'],
  },
];

/* Fictional match history for timeline */
const fakeMatchHistory = [
  { opponent: 'Shadow Legion', score: '13-8', result: 'W', map: 'Haven' },
  { opponent: 'Nexus Reapers', score: '13-11', result: 'W', map: 'Bind' },
  { opponent: 'Vortex Esports', score: '13-5', result: 'W', map: 'Ascent' },
  { opponent: 'Omega Squad', score: '9-13', result: 'L', map: 'Split' },
  { opponent: 'Crimson Blades', score: '13-7', result: 'W', map: 'Lotus' },
];

/* Fictional achievements */
const teamAchievements = [
  { title: 'NEXUS Champions Cup S3', icon: Trophy, tier: 'gold' },
  { title: 'Campus Clash Finalists', icon: Award, tier: 'silver' },
  { title: '10-Win Streak Record', icon: Flame, tier: 'bronze' },
  { title: 'MVP Award — Capt. Viper', icon: Star, tier: 'gold' },
  { title: 'University Pro League S4', icon: Medal, tier: 'silver' },
  { title: 'Best Clutch Play 2026', icon: Crosshair, tier: 'gold' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: Animated Counter
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 1200;
    const stepTime = Math.max(Math.floor(duration / end), 16);
    const timer = setInterval(() => {
      start += Math.ceil(end / (duration / stepTime));
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: Radial Score Gauge
   ═══════════════════════════════════════════════════════════════════════════ */

function RadialGauge({ score, accent }: { score: number; accent: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Score</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER: Section Wrapper with scroll-triggered animation
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface Props {
  params: Promise<{ id: string }>;
}

export default function TeamProfilePage({ params }: Props) {
  const { id } = use(params);
  const [customTeams, setCustomTeams] = useState<TeamWithRoster[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const apiBase =
          typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? '/api'
            : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

        const res = await fetch(`${apiBase}/teams/`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCustomTeams(data.data.map((t: any) => ({
            ...t,
            slug: t.slug || slugify(t.name),
            winRate: t.win_rate || t.winRate || 50,
            recentWins: t.recent_wins || t.recentWins || 0,
            activeScore: t.active_score || t.activeScore || 75,
            verificationStatus: t.verification_status || t.verificationStatus || (t.verified ? 'approved' : 'pending'),
            roster: t.roster || [
              `${t.captain || 'Captain'} (Captain)`,
              'Active Assaulter',
              'Support / Medic',
              'Entry Fragger',
              'IGL Tactician',
            ],
          })));
        }
      } catch (err) {
        console.error('Failed to load team from backend:', err);
      }
    };

    loadBackendData();
  }, []);

  const generatedTeam = useMemo((): TeamWithRoster => {
    const title = id
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return {
      slug: id,
      name: title || 'Varsity Squad',
      college: 'University Esports League',
      game: 'Valorant',
      rank: 10,
      winRate: 75,
      streak: 'W3',
      captain: 'Captain Alpha',
      trophies: 3,
      members: 5,
      recentWins: 3,
      form: ['W', 'W', 'L', 'W'],
      activeScore: 80,
      joined: 2026,
      accent: '#10b981',
      verified: true,
      verificationStatus: 'approved',
      roster: ['Captain Alpha (Captain)', 'Player 2', 'Player 3', 'Player 4', 'Player 5'],
    };
  }, [id]);

  const team: TeamWithRoster = useMemo(() => {
    const allTeams: TeamWithRoster[] = customTeams;
    const cleanId = decodeURIComponent(id || '').trim().toLowerCase();
    return (
      allTeams.find(
        (t) =>
          t.slug === cleanId ||
          slugify(t.name) === slugify(cleanId) ||
          t.name.toLowerCase() === cleanId,
      ) || generatedTeam
    );
  }, [customTeams, generatedTeam, id]);

  const similarTeams = useMemo(() => {
    return customTeams.filter((t) => t.slug !== team.slug).slice(0, 4);
  }, [customTeams, team.slug]);

  const initials = (name: string) =>
    name
      .replace('Team ', '')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const heroImage = gameImageMap[team.game] || '/valorant.jpg';
  const tagline = gameTagline[team.game] || '5v5 COMPETITIVE';
  const accentColor = team.accent || '#10b981';
  const roster = team.roster || [team.captain];
  const matchHistory = fakeMatchHistory.map((m, i) => ({
    ...m,
    result: team.form[i] || m.result,
  }));

  const tierColor: Record<string, string> = {
    gold: 'from-amber-400 to-yellow-500',
    silver: 'from-zinc-300 to-zinc-400',
    bronze: 'from-orange-400 to-amber-600',
  };

  const tierBorder: Record<string, string> = {
    gold: 'border-amber-500/40',
    silver: 'border-zinc-400/30',
    bronze: 'border-orange-500/30',
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950 overflow-x-hidden">

      {/* ═══════════════ 1. CINEMATIC HERO SECTION ═══════════════ */}
      <section className="relative min-h-[560px] lg:min-h-[620px] w-full overflow-hidden flex items-end">
        {/* Background Image + Overlays */}
        <div className="absolute inset-0 z-0">
          <motion.img
            src={heroImage}
            alt={team.name}
            className="w-full h-full object-cover"
            initial={{ scale: 1.15, filter: 'brightness(0.3) saturate(1.6)' }}
            animate={{ scale: 1.05, filter: 'brightness(0.3) saturate(1.5)' }}
            transition={{ duration: 8, ease: 'easeOut' }}
          />
          {/* Multi-layer gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
          {/* Team-accent colored glow */}
          <div
            className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[160px] opacity-20 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute top-1/3 right-0 w-[400px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        {/* Header Actions */}
        <motion.div
          className="absolute top-6 left-0 right-0 z-30 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link
            href="/teams"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/60 backdrop-blur-2xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white hover:border-emerald-500/40 shadow-2xl group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Teams
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 backdrop-blur-2xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white hover:border-emerald-500/40 shadow-2xl cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Profile'}
          </button>
        </motion.div>

        {/* Game Type Banner */}
        <motion.div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-2xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Gamepad2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
            {team.game} • {tagline}
          </span>
        </motion.div>

        {/* Hero Identity Block */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-32 lg:pt-40">
          <motion.div
            className="flex flex-col sm:flex-row sm:items-end gap-8"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {/* Team Crest Emblem */}
            <motion.div
              variants={scaleIn}
              className="relative shrink-0"
            >
              <div
                className="relative grid place-items-center h-32 w-32 sm:h-40 sm:w-40 rounded-3xl font-black text-white shadow-2xl overflow-hidden"
                style={{
                  border: `2px solid ${accentColor}55`,
                  background: `linear-gradient(135deg, ${accentColor}30, rgba(0,0,0,0.8))`,
                }}
              >
                {/* Animated glow ring */}
                <div
                  className="absolute inset-0 rounded-3xl animate-pulse opacity-30"
                  style={{
                    boxShadow: `inset 0 0 40px ${accentColor}40, 0 0 60px ${accentColor}20`,
                  }}
                />
                <span className="text-4xl sm:text-5xl italic tracking-tighter text-white font-black relative z-10 drop-shadow-lg">
                  {initials(team.name)}
                </span>
              </div>
              {/* Verified badge */}
              {team.verified && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center shadow-lg">
                  <Check className="h-4 w-4 text-black" strokeWidth={3} />
                </div>
              )}
            </motion.div>

            {/* Team Info */}
            <motion.div className="space-y-4 flex-1" variants={stagger}>
              {/* Badges Row */}
              <motion.div className="flex flex-wrap items-center gap-2" variants={fadeUp}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck className="h-3 w-3" /> Verified Roster
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40`, color: accentColor, border: `1px solid ${accentColor}40` }}>
                  <Crown className="h-3 w-3" /> Rank #{team.rank}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${team.streak.startsWith('W') ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 border' : 'bg-rose-500/15 border-rose-500/30 text-rose-400 border'}`}>
                  <Flame className="h-3 w-3" /> {team.streak} Streak
                </span>
              </motion.div>

              {/* Team Name */}
              <motion.h1
                className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-[0.95] drop-shadow-2xl"
                variants={fadeUp}
              >
                {team.name}
              </motion.h1>

              {/* Meta Info */}
              <motion.div
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm font-semibold text-zinc-300"
                variants={fadeUp}
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-400" /> {team.college}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5" style={{ color: accentColor }}>
                  <Gamepad2 className="h-4 w-4" /> {team.game} Squad
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Est. {team.joined}
                </span>
              </motion.div>

              {/* Captain */}
              <motion.div
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
                variants={fadeUp}
              >
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-400">Captain:</span>
                <span className="text-xs font-black text-white">{team.captain}</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════ 2. GLASSMORPHIC STATS DASHBOARD ═══════════════ */}
      <AnimatedSection>
        <section className="relative border-b border-zinc-900 bg-[#050810]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Stat Cards */}
              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Win Rate', value: team.winRate, suffix: '%', icon: TrendingUp, color: '#10b981' },
                  { label: 'Trophies Won', value: team.trophies, suffix: '', icon: Trophy, color: '#f59e0b' },
                  { label: 'Active Streak', value: parseInt(team.streak.replace(/\D/g, '')) || 0, suffix: ` ${team.streak[0]}`, icon: Flame, color: team.streak.startsWith('W') ? '#10b981' : '#ef4444' },
                  { label: 'Roster Size', value: team.members || 5, suffix: '', icon: Users, color: '#8b5cf6' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="relative overflow-hidden p-5 rounded-2xl border border-white/10 bg-[#09090b]/80 backdrop-blur-xl group hover:border-white/20 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* Glow accent */}
                    <div
                      className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"
                      style={{ backgroundColor: stat.color }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">{stat.label}</span>
                        <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                      </div>
                      <p className="text-2xl sm:text-3xl font-black" style={{ color: stat.color }}>
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Active Score Gauge */}
              <div className="lg:col-span-4 flex justify-center">
                <motion.div
                  className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-white/10 bg-[#09090b]/80 backdrop-blur-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500">Combat Readiness</span>
                  <RadialGauge score={team.activeScore} accent={accentColor} />
                  <span className="text-[10px] font-bold text-zinc-400">Top {Math.max(1, 100 - team.activeScore)}% of all teams</span>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>


      {/* ═══════════════ 3. TEAM BIO / ABOUT ═══════════════ */}
      <AnimatedSection>
        <section className="py-14 bg-black border-b border-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Team Dossier
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-4">
                About <span style={{ color: accentColor }}>{team.name}</span>
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                Representing <strong className="text-zinc-200">{team.college}</strong>, {team.name} is a verified collegiate {team.game} squad
                ranked <strong className="text-emerald-400">#{team.rank}</strong> nationally on the XENOVA platform. With a dominant{' '}
                <strong className="text-white">{team.winRate}% win rate</strong> and{' '}
                <strong className="text-white">{team.trophies} championship trophies</strong>, the roster has established itself as one of
                India&apos;s most formidable varsity esports teams. Captained by{' '}
                <strong className="text-white">{team.captain}</strong>, the squad competes in national-tier tournaments with a focus on
                precision tactics and coordinated aggression.
              </p>
            </div>
          </div>
        </section>
      </AnimatedSection>


      {/* ═══════════════ 4. PREMIUM ROSTER GRID ═══════════════ */}
      <AnimatedSection>
        <section className="py-16 sm:py-20 bg-black">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-3">
                  <Users className="h-3.5 w-3.5" /> Squad Composition
                </div>
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  Active Starting Roster
                </h2>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#09090b] border border-white/10 text-zinc-400 text-xs font-black uppercase">
                <CircleDot className="h-3.5 w-3.5 text-emerald-400" /> {roster.length} Active
              </span>
            </div>

            {/* Roster Cards Grid */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {roster.map((player, i) => {
                const isCaptain = player.includes('(Captain)');
                const displayName = player.replace(' (Captain)', '');
                const playerInitials = displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <motion.div
                    key={player}
                    variants={fadeUp}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="relative overflow-hidden p-5 rounded-2xl border border-white/10 bg-[#09090b] hover:border-white/20 transition-all duration-300 group cursor-default"
                  >
                    {/* Accent glow on hover */}
                    <div
                      className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                      style={{ backgroundColor: accentColor }}
                    />

                    <div className="relative z-10 flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border"
                        style={{
                          backgroundColor: `${accentColor}15`,
                          borderColor: `${accentColor}30`,
                          color: accentColor,
                        }}
                      >
                        {playerInitials}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase truncate group-hover:text-emerald-400 transition-colors">
                            {displayName}
                          </h4>
                          {isCaptain && <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                            {isCaptain ? 'Team Captain' : `Roster Slot ${String(i + 1).padStart(2, '0')}`}
                          </span>
                        </div>
                      </div>

                      {/* Verified */}
                      <ShieldCheck className="h-5 w-5 text-emerald-500/60 shrink-0 group-hover:text-emerald-400 transition-colors" />
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                        {team.college}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50 flex items-center gap-1">
                        <Check className="h-3 w-3" /> ID Verified
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </AnimatedSection>


      {/* ═══════════════ 5. MATCH TIMELINE ═══════════════ */}
      <AnimatedSection>
        <section className="py-16 sm:py-20 bg-[#050810] border-y border-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Section Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-3">
                <Swords className="h-3.5 w-3.5" /> Recent Engagements
              </div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                Match Timeline
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Verified inter-college tournament results and map telemetry.
              </p>
            </div>

            {/* Timeline Cards */}
            <div className="space-y-3">
              {matchHistory.map((match, i) => {
                const isWin = match.result === 'W';
                return (
                  <motion.div
                    key={i}
                    className={`relative overflow-hidden flex items-center gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl border transition-all duration-300 group ${
                      isWin
                        ? 'border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40'
                        : 'border-rose-500/20 bg-rose-500/[0.03] hover:border-rose-500/40'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    {/* Result Indicator */}
                    <div
                      className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-lg font-black border ${
                        isWin
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {match.result}
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-black text-white uppercase truncate">
                          vs {match.opponent}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isWin ? 'VICTORY' : 'DEFEAT'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {match.map} Map • {team.game} Tournament
                      </p>
                    </div>

                    {/* Score */}
                    <div className="shrink-0 text-right">
                      <span className={`text-xl sm:text-2xl font-black font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {match.score}
                      </span>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-0.5">
                        Final Score
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Form Summary */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Season Form:</span>
              <div className="flex items-center gap-2">
                {(team.form || ['W', 'W', 'W', 'L', 'W']).map((res, idx) => (
                  <div
                    key={idx}
                    className={`h-8 w-8 rounded-lg text-xs font-black flex items-center justify-center border shadow-sm ${
                      res === 'W'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {res}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-zinc-600">
                {team.form.filter((f) => f === 'W').length}W {team.form.filter((f) => f === 'L').length}L
              </span>
            </div>
          </div>
        </section>
      </AnimatedSection>


      {/* ═══════════════ 6. ACHIEVEMENTS SHOWCASE ═══════════════ */}
      <AnimatedSection>
        <section className="py-16 sm:py-20 bg-black">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">
                <Award className="h-3.5 w-3.5" /> Hall of Glory
              </div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                Achievements & Honours
              </h2>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {teamAchievements.map((achievement, i) => {
                const Icon = achievement.icon;
                return (
                  <motion.div
                    key={achievement.title}
                    variants={fadeUp}
                    whileHover={{ scale: 1.02 }}
                    className={`relative overflow-hidden p-5 rounded-2xl border bg-[#09090b] group cursor-default transition-all duration-300 hover:shadow-xl ${tierBorder[achievement.tier]}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${tierColor[achievement.tier]}`}>
                        <Icon className="h-5 w-5 text-black" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white uppercase truncate group-hover:text-emerald-400 transition-colors">
                          {achievement.title}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                          {achievement.tier.toUpperCase()} TIER • Season 2026
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </AnimatedSection>


      {/* ═══════════════ 7. SIMILAR TEAMS DISCOVERY ═══════════════ */}
      <AnimatedSection>
        <section className="py-16 sm:py-20 bg-[#050810] border-t border-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" /> Discover More
                </div>
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  Other Varsity Squads
                </h2>
              </div>
              <Link
                href="/teams"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/10 hover:border-emerald-500/40 transition group"
              >
                View All Teams <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {similarTeams.map((t) => {
                const teamImage = gameImageMap[t.game] || '/valorant.jpg';
                return (
                  <motion.div key={t.slug} variants={fadeUp}>
                    <Link
                      href={`/teams/${t.slug}`}
                      className="block relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] group hover:border-emerald-500/30 transition-all duration-300"
                    >
                      {/* Card Image */}
                      <div className="relative h-36 overflow-hidden">
                        <img
                          src={teamImage}
                          alt={t.name}
                          className="w-full h-full object-cover filter brightness-50 saturate-125 group-hover:scale-110 group-hover:brightness-60 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/70 text-[9px] font-black text-emerald-400 uppercase border border-emerald-500/30 backdrop-blur-md">
                          #{t.rank}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                            style={{
                              backgroundColor: `${t.accent}20`,
                              color: t.accent,
                            }}
                          >
                            {initials(t.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-white uppercase truncate group-hover:text-emerald-400 transition-colors">
                              {t.name}
                            </h4>
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                              {t.college}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[9px] font-black text-zinc-500 uppercase">{t.game}</span>
                          <span className="text-[10px] font-black text-emerald-400">{t.winRate}% WR</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </AnimatedSection>

      <FinalCTA />
    </main>
  );
}
