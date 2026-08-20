'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  Flame,
  Medal,
  Search,
  Shield,
  ShieldCheck,
  Trophy,
  Zap,
  Target,
  Activity,
  Users,
  ChevronRight,
  TrendingUp,
  Plus,
  Trash2,
  X,
  Crown,
  Award,
  Check,
  SlidersHorizontal,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { slugify, type XenovaTeam } from '@/lib/xenova-data';
import FinalCTA from '@/components/xenova/FinalCTA';

const gameFilters = ['All Games', 'BGMI', 'Valorant', 'Free Fire', 'CS2', 'FC24'];
const sortOptions = ['Top Ranked', 'Win Rate', 'Most Trophies'];

const defaultTeamsList: XenovaTeam[] = [
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
  },
];

const recentMatches = [
  { left: 'Titans', right: 'Wolves', score: '2-0', event: 'VALORANT CHAMPIONSHIP', status: 'Finalized', color: '#6366f1' },
  { left: 'Phoenix', right: 'Alpha', score: '1st Place', event: 'CAMPUS INVITATIONAL', status: 'Winner', color: '#f43f5e' },
  { left: 'Hawks', right: 'Strikers', score: '16-13', event: 'CS2 NIGHT CUP', status: 'Live', color: '#fbbf24' },
];

const achievements = [
  { label: 'Longest Streak', value: 'Team Phoenix', detail: '11 consecutive map wins in Season 4', icon: Flame, color: '#f43f5e' },
  { label: 'Highest Rated', value: 'Team Titans', detail: '98/100 active combat score index', icon: Target, color: '#6366f1' },
  { label: 'Win Rate Apex', value: 'Team Phoenix', detail: '91% overall win percentage', icon: TrendingUp, color: '#10b981' },
];

const initials = (name?: string) =>
  (name || 'Team')
    .replace('Team ', '')
    .split(' ')
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function TeamsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [selectedSort, setSelectedSort] = useState('Top Ranked');
  const [customTeams, setCustomTeams] = useState<XenovaTeam[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newCollegeName, setNewCollegeName] = useState('Nexus Institute of Technology');
  const [newGame, setNewGame] = useState('Valorant');
  const [newCaptain, setNewCaptain] = useState('');

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        setCurrentUser(JSON.parse(rawSession));
      } catch (e) {
        console.error(e);
      }
    }

    const loadTeams = async () => {
      try {
        const apiBase =
          typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? '/api'
            : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

        const res = await fetch(`${apiBase}/teams/`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const mapped = data.data.map((t: any) => ({
            ...t,
            slug: t.slug || slugify(t.name),
            winRate: t.win_rate || t.winRate || 50,
            recentWins: t.recent_wins || t.recentWins || 0,
            activeScore: t.active_score || t.activeScore || 75,
            verificationStatus: t.verification_status || t.verificationStatus || (t.verified ? 'approved' : 'pending'),
          }));
          setCustomTeams(mapped);
        }
      } catch (err) {
        console.error('Failed to load teams from backend:', err);
      }
    };

    loadTeams();
  }, []);

  const allTeams = useMemo(() => {
    return customTeams;
  }, [customTeams]);

  const filteredTeams = useMemo(() => {
    const visible = allTeams.filter((team) => {
      const isApproved = team.verificationStatus === 'approved' || team.verification_status === 'approved' || team.verified;
      if (!isApproved) return false;

      const matchesSearch = [team.name, team.college, team.game, team.captain]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesGame = selectedGame === 'All Games' || team.game === selectedGame;

      return matchesSearch && matchesGame;
    });

    return [...visible].sort((a, b) => {
      if (selectedSort === 'Win Rate') return (b.winRate || 0) - (a.winRate || 0);
      if (selectedSort === 'Most Trophies') return (b.trophies || 0) - (a.trophies || 0);
      return (a.rank || 99) - (b.rank || 99);
    });
  }, [allTeams, searchTerm, selectedGame, selectedSort]);

  const topPodiumTeams = useMemo(() => {
    const verifiedOnly = allTeams.filter(t => t.verificationStatus === 'approved' || t.verification_status === 'approved' || t.verified);
    return [...verifiedOnly].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 3);
  }, [allTeams]);

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in first to submit a team roster.');
      return;
    }

    const cleanName = newTeamName.trim();
    if (!cleanName || !newCaptain.trim()) {
      alert('Team name and captain handle are required.');
      return;
    }

    const slug = slugify(cleanName);
    const exists = allTeams.some((t) => t.slug === slug || t.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      alert('A team with this name already exists.');
      return;
    }

    const pendingTeam = {
      slug,
      name: cleanName,
      college: newCollegeName,
      game: newGame,
      rank: allTeams.length + 1,
      win_rate: 70,
      streak: 'W1',
      captain: newCaptain.trim(),
      trophies: 0,
      members: 5,
      recent_wins: 1,
      form: ['W'],
      active_score: 75,
      joined: 2026,
      accent: '#10b981',
      verified: false,
      verification_status: 'pending',
      created_by: currentUser.email,
      captain_email: currentUser.email,
    };

    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      await fetch(`${apiBase}/teams/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingTeam),
      });

      // Reload fresh list from backend database
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
        })));
      }
    } catch (err) {
      console.error(err);
    }

    setNewTeamName('');
    setNewCaptain('');
    setIsAddModalOpen(false);
    alert('Team roster submitted successfully to the database! It will appear on the leaderboard upon Admin approval.');
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. SLANTED KINETIC HERO BANNER ═══════════════ */}
      <section 
        className="relative overflow-hidden bg-black py-16 sm:py-24 border-b border-emerald-500/30"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 93%, 0 100%)',
        }}
      >
        {/* Game Cover Artwork Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src="/apex.jpg"
            alt="Campus Esports Teams"
            className="w-full h-full object-cover filter brightness-[0.35] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        {/* Slanted Geometric Divider Line */}
        <div 
          className="absolute top-0 right-1/3 w-80 h-full bg-gradient-to-b from-rose-500 via-emerald-400 to-transparent opacity-20 hidden lg:block pointer-events-none"
          style={{ clipPath: 'polygon(50% 0, 65% 0, 15% 100%, 0 100%)' }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg"
              >
                <ShieldCheck className="h-4 w-4 fill-rose-400" /> Official Varsity Team Rosters
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-none drop-shadow-2xl"
              >
                Collegiate <span className="bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 bg-clip-text text-transparent">Esports Squads</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-2xl"
              >
                Explore verified varsity squads across India. Inspect match win rates, active captain handles, map win streaks, and championship trophies.
              </motion.p>
            </div>

            {/* Live Telemetry Summary HUD */}
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-6 rounded-2xl border border-white/15 bg-black/80 px-6 py-4 backdrop-blur-2xl shadow-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Squads</p>
                  <p className="text-2xl font-black text-white mt-0.5">{allTeams.length}</p>
                </div>
                <div className="h-8 w-px bg-zinc-800" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Avg Win Rate</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">78%</p>
                </div>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-4 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:scale-[1.02] transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Register Squad
                </button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-4 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:scale-[1.02] transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Register Squad
                </Link>
              )}
            </div>
          </div>

          {/* Search & Filters Panel */}
          <div className="mt-10 pt-8 border-t border-zinc-800/80 grid gap-4 lg:grid-cols-12 items-center">
            
            {/* Search Bar */}
            <div className="lg:col-span-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search squad name, university, game, or captain..."
                className="w-full rounded-2xl border border-white/15 bg-zinc-950/90 pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 transition shadow-inner backdrop-blur-md"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="lg:col-span-6 flex flex-wrap items-center gap-3 justify-end">
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="rounded-xl border border-white/15 bg-zinc-950 px-3.5 py-3 text-xs font-bold text-zinc-300 outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                {gameFilters.map((gm) => (
                  <option key={gm} value={gm} className="bg-zinc-950 text-white">{gm}</option>
                ))}
              </select>

              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="rounded-xl border border-white/15 bg-zinc-950 px-3.5 py-3 text-xs font-bold text-zinc-300 outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                {sortOptions.map((so) => (
                  <option key={so} value={so} className="bg-zinc-950 text-white">{so}</option>
                ))}
              </select>
            </div>

          </div>

        </div>
      </section>

      {/* ═══════════════ 2. TOP 3 TEAMS CHAMPIONSHIP PODIUM ═══════════════ */}
      <section className="py-14 sm:py-20 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Apex Squads</span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-0.5">Top Varsity Teams</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            
            {/* 2nd Place Silver Team Podium */}
            {topPodiumTeams[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/20 via-[#09090b] to-black p-6 space-y-5 shadow-2xl order-2 md:order-1"
              >
                <div className="flex items-start justify-between">
                  <TeamEmblem name={topPodiumTeams[1].name} accent={topPodiumTeams[1].accent} />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-600 text-indigo-300 text-xs font-black uppercase">
                    <Medal className="h-3.5 w-3.5 text-indigo-300" /> RANK #2
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">{topPodiumTeams[1].name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{topPodiumTeams[1].college} • <span className="text-indigo-400 font-bold">{topPodiumTeams[1].game}</span></p>
                  <p className="text-xs text-zinc-400 mt-0.5">Captain: <span className="text-white font-bold">{topPodiumTeams[1].captain}</span></p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/60 border border-white/5 text-center">
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Win Rate</span>
                    <span className="text-xs font-black text-indigo-400">{topPodiumTeams[1].winRate}%</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Streak</span>
                    <span className="text-xs font-black text-emerald-400">{topPodiumTeams[1].streak}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Trophies</span>
                    <span className="text-xs font-black text-amber-400">{topPodiumTeams[1].trophies}</span>
                  </div>
                </div>

                <Link
                  href={`/teams/${topPodiumTeams[1].slug || slugify(topPodiumTeams[1].name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white hover:bg-white/10 transition cursor-pointer"
                >
                  View Team Roster <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}

            {/* 1st Place Gold Champion Team Podium */}
            {topPodiumTeams[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl border-2 border-rose-500/60 bg-gradient-to-b from-rose-500/25 via-[#09090b] to-black p-8 space-y-6 shadow-2xl shadow-rose-500/10 order-1 md:order-2 md:-translate-y-4"
              >
                <div className="flex items-start justify-between">
                  <TeamEmblem name={topPodiumTeams[0].name} accent={topPodiumTeams[0].accent} large />
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-black uppercase shadow-lg">
                    <Crown className="h-4 w-4" /> RANK #1 APEX SQUAD
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">{topPodiumTeams[0].name}</h3>
                  <p className="text-xs text-rose-300/80 mt-1 font-semibold">{topPodiumTeams[0].college} • <span className="text-amber-400 font-bold">{topPodiumTeams[0].game}</span></p>
                  <p className="text-xs text-zinc-300 mt-0.5">Captain: <span className="text-white font-bold">{topPodiumTeams[0].captain}</span></p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-black/80 border border-rose-500/30 text-center">
                  <div>
                    <span className="block text-[9px] font-black text-rose-400/80 uppercase">Win Rate</span>
                    <span className="text-sm font-black text-emerald-400">{topPodiumTeams[0].winRate}%</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-rose-400/80 uppercase">Streak</span>
                    <span className="text-sm font-black text-amber-400">{topPodiumTeams[0].streak}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-rose-400/80 uppercase">Trophies</span>
                    <span className="text-sm font-black text-amber-300">{topPodiumTeams[0].trophies}</span>
                  </div>
                </div>

                <Link
                  href={`/teams/${topPodiumTeams[0].slug || slugify(topPodiumTeams[0].name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  Inspect Active Roster <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}

            {/* 3rd Place Bronze Team Podium */}
            {topPodiumTeams[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/20 via-[#09090b] to-black p-6 space-y-5 shadow-2xl order-3"
              >
                <div className="flex items-start justify-between">
                  <TeamEmblem name={topPodiumTeams[2].name} accent={topPodiumTeams[2].accent} />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-xs font-black uppercase">
                    <Award className="h-3.5 w-3.5 text-amber-400" /> RANK #3
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">{topPodiumTeams[2].name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{topPodiumTeams[2].college} • <span className="text-amber-400 font-bold">{topPodiumTeams[2].game}</span></p>
                  <p className="text-xs text-zinc-400 mt-0.5">Captain: <span className="text-white font-bold">{topPodiumTeams[2].captain}</span></p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/60 border border-white/5 text-center">
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Win Rate</span>
                    <span className="text-xs font-black text-emerald-400">{topPodiumTeams[2].winRate}%</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Streak</span>
                    <span className="text-xs font-black text-amber-400">{topPodiumTeams[2].streak}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Trophies</span>
                    <span className="text-xs font-black text-amber-300">{topPodiumTeams[2].trophies}</span>
                  </div>
                </div>

                <Link
                  href={`/teams/${topPodiumTeams[2].slug || slugify(topPodiumTeams[2].name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white hover:bg-white/10 transition cursor-pointer"
                >
                  View Team Roster <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}

          </div>

        </div>
      </section>

      {/* ═══════════════ 3. ALL VARSITY TEAMS GRID WITH SLANTED CUT CARDS ═══════════════ */}
      <section className="py-14 bg-black border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Team Directory</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                All Verified Teams ({filteredTeams.length})
              </h2>
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-16 text-center text-zinc-400 text-sm">
              No teams match your search selection. Try clearing filters or registering a new team roster.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTeams.map((team, index) => (
                <motion.article
                  key={team.slug || team.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] p-6 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                >
                  <div>
                    {/* Header Emblem & Badges */}
                    <div className="flex items-start justify-between mb-4">
                      <TeamEmblem name={team.name} accent={team.accent} />
                      
                      <div className="text-right space-y-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                          <ShieldCheck className="h-3 w-3" /> VERIFIED
                        </span>
                        <p className="text-xs font-black text-zinc-400">Rank <strong className="text-white">#{team.rank}</strong></p>
                      </div>
                    </div>

                    {/* Team Info */}
                    <div className="space-y-1">
                      <h3 className="text-lg font-black uppercase text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                        {team.name}
                      </h3>
                      <p className="text-xs text-zinc-400 font-medium">
                        {team.college} • <span className="text-emerald-400 font-bold">{team.game}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        Capt: <span className="text-zinc-300 font-semibold">{team.captain}</span>
                      </p>
                    </div>

                    {/* Performance Stats Bento Box */}
                    <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-2xl bg-black/70 border border-white/10 text-center text-xs">
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">Win Rate</span>
                        <span className="font-black text-emerald-400">{team.winRate}%</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">Streak</span>
                        <span className="font-black text-amber-400">{team.streak}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">Trophies</span>
                        <span className="font-black text-white">{team.trophies}</span>
                      </div>
                    </div>

                    {/* Recent Match Form Sequence */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-900 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recent Form</span>
                      <div className="flex gap-1">
                        {(team.form || ['W', 'W', 'L', 'W']).map((res, i) => (
                          <span
                            key={i}
                            className={`h-5 w-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                              res === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-6">
                    <Link
                      href={`/teams/${team.slug || slugify(team.name)}`}
                      prefetch={true}
                      className="w-full inline-flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 transition cursor-pointer group/btn active:scale-95"
                    >
                      <span>Roster Details</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* REGISTRATION MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Team Roster Portal</span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Register Campus Squad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterTeam} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Team Name
                    <input
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                      placeholder="e.g. Team Valkyrie"
                      required
                    />
                  </label>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Captain Handle / Name
                    <input
                      value={newCaptain}
                      onChange={(e) => setNewCaptain(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                      placeholder="e.g. Viper#123"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    College / University
                    <input
                      value={newCollegeName}
                      onChange={(e) => setNewCollegeName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                      placeholder="Nexus Institute of Technology"
                      required
                    />
                  </label>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Game Title
                    <select
                      value={newGame}
                      onChange={(e) => setNewGame(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                    >
                      {gameFilters.filter((g) => g !== 'All Games').map((g) => (
                        <option key={g} value={g} className="bg-zinc-950">{g}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                  >
                    Submit Roster
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FinalCTA />
    </main>
  );
}

function TeamEmblem({ name, accent, large = false }: { name: string; accent: string; large?: boolean }) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center border-2 font-black text-white shadow-xl ${
        large ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-xs'
      }`}
      style={{
        borderRadius: 16,
        borderColor: accent ? `${accent}66` : '#f43f5e66',
        background: `linear-gradient(135deg, ${accent || '#f43f5e'}33, rgba(255,255,255,0.05))`,
      }}
    >
      <span className="italic uppercase tracking-tighter">{initials(name)}</span>
    </div>
  );
}
