'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { getCustomTeams, defaultTeams, slugify, type XenovaTeam, type VerificationStatus } from '@/lib/xenova-data';
import FinalCTA from '@/components/xenova/FinalCTA';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

/* --------------------------------------------------------------------------
   TEAM DATA & PRESETS
-------------------------------------------------------------------------- */

const gameImageMap: Record<string, string> = {
  'Valorant': '/valorant.jpg',
  'BGMI': '/bgmi.jpg',
  'CS2': '/cs2.jpg',
  'FC24': '/fc.jpg',
  'Free Fire': '/freefire.jpg',
  'Apex Legends': '/apex.jpg',
};

const gameTagline: Record<string, string> = {
  'Valorant': 'TACTICAL 5v5 SHOOTER',
  'BGMI': 'BATTLE ROYALE SQUAD',
  'CS2': 'COMPETITIVE FPS',
  'FC24': 'FOOTBALL SIMULATION',
  'Free Fire': 'SURVIVAL BATTLE ROYALE',
  'Apex Legends': 'HERO SHOOTER SQUAD',
};

export interface TeamWithRoster extends Omit<XenovaTeam, 'verificationStatus'> {
  verificationStatus?: VerificationStatus;
  roster?: string[];
}

export const defaultTeamsList: TeamWithRoster[] = [
  {
    slug: 'team-phoenix',
    name: 'Team Phoenix',
    college: 'Arcadia College',
    game: 'BGMI',
    rank: 1,
    winRate: 91,
    streak: 'W8',
    captain: 'Kabir "Blaze" Sen',
    trophies: 12,
    members: 5,
    recentWins: 8,
    form: ['W', 'W', 'W', 'W', 'W'],
    activeScore: 99,
    joined: 2024,
    accent: '#f43f5e',
    verified: true,
    roster: [
      'Kabir "Blaze" Sen (Captain)',
      'Aarav "Volt" Nair',
      'Rohan "Shadow" Verma',
      'Vikram "Ghost" Rao',
      'Aditya "Storm" Patel',
    ],
  },
  {
    slug: 'team-titans',
    name: 'Team Titans',
    college: 'Nexus Institute of Technology',
    game: 'Valorant',
    rank: 2,
    winRate: 86,
    streak: 'W6',
    captain: 'Dev "Viper" Mehra',
    trophies: 9,
    members: 6,
    recentWins: 6,
    form: ['W', 'W', 'W', 'L', 'W'],
    activeScore: 96,
    joined: 2024,
    accent: '#6366f1',
    verified: true,
    roster: [
      'Dev "Viper" Mehra (Captain)',
      'Karan "Omen" Singh',
      'Sameer "Jett" Joshi',
      'Nikhil "Sova" Kapoor',
      'Varun "Cypher" Iyer',
      'Rahul "Breach" Das',
    ],
  },
  {
    slug: 'team-wolves',
    name: 'Team Wolves',
    college: 'Metro School of Design',
    game: 'Valorant',
    rank: 3,
    winRate: 82,
    streak: 'W4',
    captain: 'Zoya "Frost" Khan',
    trophies: 7,
    members: 5,
    recentWins: 5,
    form: ['W', 'W', 'L', 'W', 'W'],
    activeScore: 92,
    joined: 2025,
    accent: '#22d3ee',
    verified: true,
    roster: [
      'Zoya "Frost" Khan (Captain)',
      'Priya "Echo" Sharma',
      'Ananya "Sage" Roy',
      'Riya "Raze" Sen',
      'Tara "Reyna" Pillai',
    ],
  },
  {
    slug: 'cyber-hawks',
    name: 'Cyber Hawks',
    college: 'Westbridge Engineering College',
    game: 'CS2',
    rank: 4,
    winRate: 79,
    streak: 'W3',
    captain: 'Arjun "Rift" Menon',
    trophies: 6,
    members: 5,
    recentWins: 4,
    form: ['W', 'L', 'W', 'W', 'L'],
    activeScore: 88,
    joined: 2024,
    accent: '#fbbf24',
    verified: true,
    roster: [
      'Arjun "Rift" Menon (Captain)',
      'Manish "Sniper" Gupta',
      'Kunal "Flash" Bajaj',
      'Siddharth "Smoke" Bose',
      'Deepak "Aim" Yadav',
    ],
  },
  {
    slug: 'royal-strikers',
    name: 'Royal Strikers',
    college: 'National Sports Academy',
    game: 'FC24',
    rank: 5,
    winRate: 75,
    streak: 'W2',
    captain: 'Neil "Apex" Joseph',
    trophies: 5,
    members: 4,
    recentWins: 3,
    form: ['L', 'W', 'W', 'L', 'W'],
    activeScore: 84,
    joined: 2025,
    accent: '#a855f7',
    verified: true,
    roster: [
      'Neil "Apex" Joseph (Captain)',
      'Armaan "Dribble" Sethi',
      'Faizan "Goal" Qureshi',
      'Yuvraj "Strike" Chauhan',
    ],
  },
  {
    slug: 'team-alpha',
    name: 'Team Alpha',
    college: 'Eastern Commerce University',
    game: 'Free Fire',
    rank: 6,
    winRate: 68,
    streak: 'L1',
    captain: 'Rishi "Nova" Sen',
    trophies: 4,
    members: 5,
    recentWins: 2,
    form: ['W', 'L', 'W', 'L', 'L'],
    activeScore: 78,
    joined: 2025,
    accent: '#10b981',
    verified: false,
    roster: [
      'Rishi "Nova" Sen (Captain)',
      'Gaurav "Rush" Pandey',
      'Abhishek "Zone" Mishra',
      'Pranav "Drop" Nair',
      'Suraj "Fire" Tiwari',
    ],
  },
];

const fakeMatchHistory = [
  { opponent: 'Shadow Legion', score: '13-8', result: 'W', map: 'Haven' },
  { opponent: 'Nexus Reapers', score: '13-11', result: 'W', map: 'Bind' },
  { opponent: 'Vortex Esports', score: '13-5', result: 'W', map: 'Ascent' },
  { opponent: 'Omega Squad', score: '9-13', result: 'L', map: 'Split' },
  { opponent: 'Crimson Blades', score: '13-7', result: 'W', map: 'Lotus' },
];

const teamAchievements = [
  { title: 'National Champions 2025', desc: 'First place at All-India Collegiate Esports Cup', date: 'Dec 2025', icon: Trophy, color: '#f59e0b' },
  { title: 'Invictus Cup Gold', desc: 'Undefeated 12-match championship run', date: 'Oct 2025', icon: Medal, color: '#10b981' },
  { title: 'Regional Masters MVP', desc: 'Awarded highest team average combat rating', date: 'Aug 2025', icon: Star, color: '#6366f1' },
  { title: 'Varsity League Finalists', desc: 'Runner-up finish in 32-team varsity bracket', date: 'May 2025', icon: Award, color: '#ec4899' },
];

/* --------------------------------------------------------------------------
   ANIMATION HELPERS
-------------------------------------------------------------------------- */

export function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const end = value;
    const duration = 1200;
    const stepTime = Math.max(Math.floor(duration / (end || 1)), 16);
    let start = 0;
    const timer = setInterval(() => {
      start += Math.ceil(end / 30);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function RadialGauge({ score, accent }: { score: number; accent: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#1e293b"
          strokeWidth="10"
          fill="transparent"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          stroke={accent}
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Index</span>
      </div>
    </div>
  );
}

export default function TeamProfileView({ id: propId }: { id?: string }) {
  const routeParams = useParams();
  const id = propId || (routeParams?.id as string) || '';
  const [customTeams, setCustomTeams] = useState<TeamWithRoster[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        // 1. Direct Supabase Query
        try {
          const { data: sbData } = await supabase.from('teams').select('*');
          if (sbData && Array.isArray(sbData) && sbData.length > 0) {
            setCustomTeams(sbData.map((t: any) => ({
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
        } catch (sbErr) {
          console.warn('Supabase team details notice:', sbErr);
        }

        // 2. Backend API Query
        try {
          const apiBase = getApiBaseUrl();
          const res = await fetch(`${apiBase}/teams/`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
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
          }
        } catch (apiErr) {
          console.warn('Backend team details notice:', apiErr);
        }
      } catch (err) {
        console.error('Failed to load team data:', err);
      }
    };

    loadBackendData();
  }, []);

  const generatedTeam = useMemo((): TeamWithRoster => {
    const title = id
      ? id
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
      : 'Squad';

    return {
      slug: id,
      name: title,
      college: 'Autonomous Collegiate Squad',
      game: 'Valorant',
      rank: 12,
      winRate: 74,
      streak: 'W2',
      captain: 'Team Captain',
      trophies: 3,
      members: 5,
      recentWins: 2,
      form: ['W', 'L', 'W', 'W', 'L'],
      activeScore: 78,
      joined: 2025,
      accent: '#6366f1',
      verified: true,
      roster: [
        'Team Captain (Captain)',
        'Active Assaulter',
        'Support / Medic',
        'Entry Fragger',
        'IGL Tactician',
      ],
    };
  }, [id]);

  const team: TeamWithRoster = useMemo(() => {
    const allTeams: TeamWithRoster[] = customTeams.length > 0 ? customTeams : defaultTeamsList;
    const cleanId = decodeURIComponent(id || '').trim().toLowerCase();
    const cleanSlug = slugify(cleanId);

    const found = allTeams.find(
      (t) =>
        t.slug.toLowerCase() === cleanId ||
        t.slug.toLowerCase() === cleanSlug ||
        slugify(t.name) === cleanSlug
    );
    return found || generatedTeam;
  }, [id, customTeams, generatedTeam]);

  const similarTeams = useMemo(() => {
    const allTeams: TeamWithRoster[] = customTeams.length > 0 ? customTeams : defaultTeamsList;
    return allTeams.filter((t) => t.slug !== team.slug).slice(0, 4);
  }, [customTeams, team.slug]);

  const initials = (name: string) =>
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const heroImage = gameImageMap[team.game] || '/valorant.jpg';
  const tagline = gameTagline[team.game] || '5v5 COMPETITIVE';
  const accentColor = team.accent || '#10b981';
  const roster = team.roster || [team.captain];
  const matchHistory = fakeMatchHistory.map((m, i) => ({
    ...m,
    result: (team.form && team.form[i]) || m.result,
  }));

  const tierBorder: Record<string, string> = {
    '1': 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    '2': 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
    '3': 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">

      {/* TOP HERO BANNER */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-black pt-28 pb-14">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt={team.name}
            className="h-full w-full object-cover object-center opacity-20 filter blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/80 to-transparent" />
          <div
            className="absolute inset-0 opacity-15"
            style={{
              background: `radial-gradient(circle at 50% 30%, ${accentColor} 0%, transparent 65%)`,
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb & Share */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-semibold text-zinc-400 backdrop-blur-md transition-all hover:border-zinc-700 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Teams Directory
            </Link>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-semibold text-zinc-400 backdrop-blur-md transition-all hover:border-zinc-700 hover:text-white"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Profile</span>
                </>
              )}
            </button>
          </div>

          {/* Hero Content */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {/* Left: Avatar + Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

              {/* Emblem Box */}
              <div
                className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border-2 font-black text-4xl shadow-2xl backdrop-blur-xl"
                style={{
                  borderColor: `${accentColor}88`,
                  background: `linear-gradient(135deg, ${accentColor}22 0%, #0c1322 100%)`,
                  color: accentColor,
                  boxShadow: `0 0 35px ${accentColor}33`,
                }}
              >
                <span>{initials(team.name)}</span>
                {team.verified && (
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg">
                    <ShieldCheck className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tierBorder[String(team.rank)] || 'border-zinc-700 bg-zinc-800 text-zinc-300'
                      }`}
                  >
                    <Crown className="h-3 w-3" /> Rank #{team.rank}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${team.streak.startsWith('W') ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 border' : 'bg-rose-500/15 border-rose-500/30 text-rose-400 border'}`}>
                    <Flame className="h-3 w-3" /> {team.streak} Streak
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800/80 border border-zinc-700 text-zinc-400">
                    <Crosshair className="h-3 w-3" /> {team.game}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
                  {team.name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Building2 className="h-4 w-4 text-emerald-400" /> {team.college}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Gamepad2 className="h-4 w-4" /> {team.game} Squad
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Est. {team.joined}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/tournaments"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
              >
                <Swords className="h-4 w-4" /> Challenge Team
              </Link>
              <Link
                href={`/teams/${team.slug}/manage`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-zinc-700 hover:border-zinc-600"
              >
                Manage Roster
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KEY PERFORMANCE METRICS */}
      <section className="border-b border-zinc-800 bg-[#0b101d] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">

            {[
              { label: 'Win Rate', value: team.winRate, suffix: '%', icon: TrendingUp, color: '#10b981' },
              { label: 'Trophies Won', value: team.trophies, suffix: '', icon: Trophy, color: '#f59e0b' },
              { label: 'Active Streak', value: parseInt(team.streak.replace(/\D/g, '')) || 0, suffix: ` ${team.streak[0] || 'W'}`, icon: Flame, color: team.streak.startsWith('W') ? '#10b981' : '#ef4444' },
              { label: 'Roster Size', value: team.members || 5, suffix: ' Players', icon: Users, color: '#8b5cf6' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {stat.label}
                    </span>
                    <Icon className="h-4 w-4" style={{ color: stat.color }} />
                  </div>
                  <p className="mt-2 text-2xl sm:text-3xl font-black text-white">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* MAIN CONTENT GRID */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">

          {/* LEFT 2 COLS: Roster & Match History */}
          <div className="space-y-10 lg:col-span-2">

            {/* 1. Official Roster */}
            <AnimatedSection className="rounded-3xl border border-zinc-800 bg-[#0d1424] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-400" /> Official Active Roster
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Verified collegiate student-athletes registered under {team.college}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  {roster.length} Registered
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roster.map((player, idx) => {
                  const isCaptain = player.includes('(Captain)');
                  const displayName = player.replace(' (Captain)', '');
                  const playerInitials = displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${isCaptain
                          ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isCaptain
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                        >
                          {playerInitials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-1.5">
                            {displayName}
                            {isCaptain && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                          </p>
                          <p className="text-[11px] font-semibold text-zinc-500">
                            {isCaptain ? 'Team Captain & IGL' : `Player Slot #${idx + 1}`}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>

            {/* 2. Match History */}
            <AnimatedSection className="rounded-3xl border border-zinc-800 bg-[#0d1424] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Swords className="h-5 w-5 text-indigo-400" /> Recent Match History
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Verified collegiate scrims and tournament matches</p>
                </div>
              </div>

              <div className="space-y-3">
                {matchHistory.map((match, i) => {
                  const isWin = match.result === 'W';
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${isWin
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                          {match.result}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white">vs. {match.opponent}</p>
                          <p className="text-[11px] font-semibold text-zinc-500">
                            {match.map} Map • {team.game} Tournament
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-zinc-200">{match.score}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? 'Victory' : 'Defeat'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>

          </div>

          {/* RIGHT COL: Combat Score, Achievements & Similar */}
          <div className="space-y-10">

            {/* Active Combat Score Index */}
            <AnimatedSection className="rounded-3xl border border-zinc-800 bg-[#0d1424] p-6 sm:p-8 text-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
                Active Combat Rating
              </h3>

              <div className="flex justify-center mb-4">
                <RadialGauge score={team.activeScore} accent={accentColor} />
              </div>

              <p className="text-xs font-bold text-zinc-300">
                Performance Index Rank: <span className="text-emerald-400 font-extrabold">Top {Math.max(1, 100 - team.activeScore)}%</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Computed from win rate, tournament placement, and recent scrimmage rounds.
              </p>
            </AnimatedSection>

            {/* Trophy Cabinet & Achievements */}
            <AnimatedSection className="rounded-3xl border border-zinc-800 bg-[#0d1424] p-6 sm:p-8">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-amber-400" /> Trophy Cabinet
              </h3>

              <div className="space-y-3">
                {teamAchievements.map((ach, i) => {
                  const Icon = ach.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3.5"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-black"
                        style={{ backgroundColor: `${ach.color}22`, color: ach.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white truncate">{ach.title}</p>
                          <span className="text-[10px] text-zinc-500 font-semibold">{ach.date}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{ach.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>

            {/* Similar Squads */}
            <AnimatedSection className="rounded-3xl border border-zinc-800 bg-[#0d1424] p-6 sm:p-8">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-cyan-400" /> Other Contenders
              </h3>

              <div className="space-y-3">
                {similarTeams.map((sTeam) => (
                  <Link
                    key={sTeam.slug}
                    href={`/teams/${sTeam.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-[11px] font-black text-zinc-300">
                        {initials(sTeam.name)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{sTeam.name}</p>
                        <p className="text-[10px] text-zinc-400">{sTeam.college}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </Link>
                ))}
              </div>
            </AnimatedSection>

          </div>

        </div>
      </div>

      <FinalCTA />
    </main>
  );
}
