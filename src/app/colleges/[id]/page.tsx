'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BadgeCheck, 
  MapPin, 
  Globe, 
  Trophy, 
  Users, 
  ShieldCheck, 
  Crown, 
  Activity,
  ArrowUpRight,
  Sparkles,
  Zap,
  Cpu,
  Monitor,
  Wifi,
  Video,
  Medal,
  Award,
  ChevronRight,
  Share2,
  Check
} from 'lucide-react';
import { defaultColleges, getCustomColleges, getCustomTeams, defaultTeams, slugify, type XenovaCollege, type XenovaTeam } from '@/lib/xenova-data';
import FinalCTA from '@/components/xenova/FinalCTA';

const fallbackTeams = [
  { name: 'Team Titans', college: 'Nexus Institute of Technology', game: 'Valorant', winRate: 86, rank: 2, accent: '#6366f1' },
  { name: 'Team Phoenix', college: 'Arcadia College', game: 'BGMI', winRate: 91, rank: 1, accent: '#f43f5e' },
  { name: 'Team Wolves', college: 'Metro School of Design', game: 'Valorant', winRate: 73, rank: 5, accent: '#22d3ee' },
  { name: 'Team Alpha', college: 'Eastern Commerce University', game: 'Free Fire', winRate: 68, rank: 8, accent: '#10b981' },
  { name: 'Cyber Hawks', college: 'Westbridge Engineering College', game: 'CS2', winRate: 79, rank: 4, accent: '#fbbf24' },
  { name: 'Royal Strikers', college: 'National Sports Academy', game: 'FC24', winRate: 75, rank: 6, accent: '#a855f7' },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default function CollegeProfilePage({ params }: Props) {
  const { id } = use(params);
  const [customColleges, setCustomColleges] = useState<XenovaCollege[]>([]);
  const [customTeams, setCustomTeams] = useState<XenovaTeam[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'trophies' | 'athletes'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const apiBase =
          typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? '/api'
            : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

        const [colRes, teamRes] = await Promise.all([
          fetch(`${apiBase}/colleges/`),
          fetch(`${apiBase}/teams/`)
        ]);
        const colData = await colRes.json();
        const teamData = await teamRes.json();

        if (colData.success && Array.isArray(colData.data)) {
          setCustomColleges(colData.data.map((c: any) => ({
            ...c,
            slug: c.slug || slugify(c.name),
            nationalRank: c.national_rank || c.nationalRank || 99,
            stateRank: c.state_rank || c.stateRank || 99,
            teams: c.teams ?? c.teams_count ?? 0,
            teamsCount: c.teams_count ?? c.teams ?? 0,
            verificationStatus: c.verification_status || c.verificationStatus || (c.verified ? 'approved' : 'pending'),
          })));
        }

        if (teamData.success && Array.isArray(teamData.data)) {
          setCustomTeams(teamData.data.map((t: any) => ({
            ...t,
            slug: t.slug || slugify(t.name),
            winRate: t.win_rate || t.winRate || 50,
            recentWins: t.recent_wins || t.recentWins || 0,
            activeScore: t.active_score || t.activeScore || 75,
            verificationStatus: t.verification_status || t.verificationStatus || (t.verified ? 'approved' : 'pending'),
          })));
        }
      } catch (err) {
        console.error('Failed to load college from backend:', err);
      }
    };

    loadBackendData();
  }, []);

  const generatedCollege = useMemo(() => {
    const title = id
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return {
      slug: id,
      name: title || 'College Program',
      location: id.includes('reddy') || id.includes('hyderabad') ? 'Hyderabad, Telangana' : 'India',
      state: id.includes('reddy') || id.includes('hyderabad') ? 'Telangana' : 'India',
      type: 'University',
      nationalRank: 12,
      stateRank: 3,
      players: 180,
      teams: 8,
      teamsCount: 8,
      trophies: 9,
      wins: 7,
      verified: false,
      verificationStatus: 'pending',
      accent: '#ef4444',
      website: `${id}.edu`,
    } satisfies XenovaCollege;
  }, [id]);

  const college = useMemo(() => {
    const allColleges = customColleges;
    const cleanId = decodeURIComponent(id || '').trim().toLowerCase();
    const numId = parseInt(cleanId);

    return (
      allColleges.find(
        (c) =>
          c.slug === cleanId ||
          slugify(c.name) === slugify(cleanId) ||
          c.name.toLowerCase() === cleanId ||
          (!isNaN(numId) && c.nationalRank === numId)
      ) || generatedCollege
    );
  }, [customColleges, generatedCollege, id]);

  const collegeTeams = useMemo(() => {
    return customTeams.filter(
      (t) => t.college.toLowerCase() === college.name.toLowerCase()
    );
  }, [customTeams, college.name]);

  const initials = (name: string) =>
    name
      .split(' ')
      .filter((part) => !['of', 'and', 'the'].includes(part.toLowerCase()))
      .map((part) => part[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. CINEMATIC HERO BANNER ═══════════════ */}
      <section className="relative min-h-[460px] w-full overflow-hidden border-b border-zinc-900 bg-black flex items-end">
        
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-950 via-black to-[#09090b]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#10b98115,transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        {/* Header Actions */}
        <div className="absolute top-8 left-0 right-0 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/colleges"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Colleges
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Dossier'}
          </button>
        </div>

        {/* Hero Identity Block */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-28">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              
              {/* Emblem Logo Crest */}
              <div
                className="relative grid place-items-center h-28 w-28 sm:h-36 sm:w-36 rounded-3xl border-2 font-black text-white shadow-2xl shrink-0"
                style={{
                  borderColor: college.accent ? `${college.accent}66` : '#10b98166',
                  background: `linear-gradient(135deg, ${college.accent || '#10b981'}33, rgba(255,255,255,0.05))`,
                }}
              >
                <span className="text-3xl sm:text-4xl italic tracking-tighter text-white font-black">{initials(college.name)}</span>
              </div>

              {/* Identity Details */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified Campus
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase">
                    <Crown className="h-3.5 w-3.5" /> Rank #{college.nationalRank} National
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs font-bold uppercase">
                    #{college.stateRank} in {college.state}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-none">
                  {college.name}
                </h1>

                <p className="text-xs sm:text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" /> {college.location}
                  <span>•</span>
                  <span className="text-zinc-400">{college.type} Program</span>
                </p>
              </div>

            </div>

            {/* External Website Button */}
            <div className="shrink-0">
              <a
                href={`https://${college.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-emerald-400 transition cursor-pointer"
              >
                <Globe className="h-4 w-4" />
                {college.website}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 2. DOSSIER METRICS BAR ═══════════════ */}
      <section className="border-b border-zinc-900 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Collegiate Athletes</span>
              <p className="text-2xl font-black text-white mt-1">{college.players} Players</p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Roster Squads</span>
              <p className="text-2xl font-black text-white mt-1">{college.teamsCount ?? college.teams ?? 0} Teams</p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Championship Wins</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{college.wins} Wins</p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trophies Cabinet</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{college.trophies} Trophies</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. NAVIGATION TAB SWITCHER ═══════════════ */}
      <section className="sticky top-0 z-30 border-b border-zinc-900 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-4 overflow-x-auto py-3 no-scrollbar">
            {[
              { id: 'overview', label: 'Overview & Esports Lab', icon: Cpu },
              { id: 'teams', label: 'Varsity Squads', icon: ShieldCheck },
              { id: 'trophies', label: 'Trophy Cabinet', icon: Trophy },
              { id: 'athletes', label: 'Campus Roster', icon: Users },
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

      {/* ═══════════════ 4. DYNAMIC TABBED DOSSIER CONTENT ═══════════════ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        
        {/* TAB 1: OVERVIEW & ESPORTS LAB INFRASTRUCTURE */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            {/* Overview Description */}
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-4 shadow-2xl">
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-emerald-400" /> Program Dossier & Campus Overview
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {college.name} hosts one of India's top-tier university esports facilities. Featuring a dedicated gaming lounge, low-latency fiber infrastructure, and official student club accreditation, the program actively represents the institution in national varsity leagues.
              </p>
            </div>

            {/* Esports Lab Specifications Bento Grid */}
            <div className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Campus Esports Lab Specifications</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase">12 Dedicated Rigs</h4>
                  <p className="text-xs text-zinc-400">High-tier Intel Core i9 & RTX 4080 graphics setups for competition.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 w-fit">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase">240Hz Esports Monitors</h4>
                  <p className="text-xs text-zinc-400">Low response-time gaming displays for precision competitive play.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 w-fit">
                    <Wifi className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase">Dedicated Fiber Line</h4>
                  <p className="text-xs text-zinc-400">1Gbps symmetrical low-ping connection with sub-10ms server routing.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 w-fit">
                    <Video className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase">Broadcast Station</h4>
                  <p className="text-xs text-zinc-400">Caster booth setup for hosting and live-streaming campus scrims.</p>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 2: VARSITY SQUADS GRID */}
        {activeTab === 'teams' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Campus Competitors</span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Active Varsity Squads</h2>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
                  {collegeTeams.length} Registered Squads
                </span>
              </div>

              {collegeTeams.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 border border-dashed border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider">
                  No varsity teams registered under this college program yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collegeTeams.map((team) => (
                    <div
                      key={team.name}
                      className="p-6 rounded-2xl border border-white/10 bg-black flex items-center justify-between hover:border-emerald-500/40 transition group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="h-12 w-12 border-2 font-black text-sm italic flex items-center justify-center rounded-2xl shrink-0"
                          style={{
                            borderColor: `${team.accent || '#10b981'}55`,
                            background: `linear-gradient(135deg, ${team.accent || '#10b981'}33, rgba(255,255,255,0.05))`,
                            color: team.accent || '#10b981',
                          }}
                        >
                          {initials(team.name)}
                        </div>
                        <div>
                          <h4 className="font-black text-base text-white uppercase group-hover:text-emerald-400 transition-colors">{team.name}</h4>
                          <p className="text-xs text-zinc-400 mt-0.5">{team.game} Squad • Rank #{team.rank}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400 block">{team.winRate}% Win Rate</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Verified Roster</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </motion.div>
        )}

        {/* TAB 3: TROPHY CABINET */}
        {activeTab === 'trophies' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Varsity Glory</span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Championship Trophies</h2>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase">
                  {college.trophies} Total Cups
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent text-center space-y-3">
                  <Trophy className="h-10 w-10 text-amber-400 mx-auto" />
                  <h4 className="font-black text-white text-base uppercase">National Varsity Cup</h4>
                  <p className="text-xs text-zinc-400">Season 4 Champions • Valorant 5v5</p>
                </div>

                <div className="p-6 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-800/30 to-transparent text-center space-y-3">
                  <Medal className="h-10 w-10 text-zinc-300 mx-auto" />
                  <h4 className="font-black text-white text-base uppercase">State Collegiate League</h4>
                  <p className="text-xs text-zinc-400">Season 3 Runners-Up • BGMI Squad</p>
                </div>

                <div className="p-6 rounded-2xl border border-amber-800/40 bg-gradient-to-b from-amber-950/20 to-transparent text-center space-y-3">
                  <Award className="h-10 w-10 text-amber-600 mx-auto" />
                  <h4 className="font-black text-white text-base uppercase">Inter-University Invitational</h4>
                  <p className="text-xs text-zinc-400">Season 2 3rd Place • CS2 Tactical</p>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 4: CAMPUS ATHLETES DIRECTORY */}
        {activeTab === 'athletes' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Roster Depth</span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Top Verified Athletes</h2>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
                  {college.players} Registered Players
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'Aarav "Viper" Rao', role: 'Team Captain • Duelist', rating: '9.8 Rating', verified: true },
                  { name: 'Nisha "Blaze" Menon', role: 'IGL • Controller', rating: '9.5 Rating', verified: true },
                  { name: 'Rohan "Phantom" Sen', role: 'Initiator • Scout', rating: '9.2 Rating', verified: true },
                  { name: 'Kavya "Aura" Sharma', role: 'Sentinel • Anchor', rating: '9.1 Rating', verified: true },
                ].map((athlete) => (
                  <div key={athlete.name} className="p-5 rounded-2xl border border-white/10 bg-black flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">{athlete.name}</h4>
                      <p className="text-xs text-zinc-400">{athlete.role}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-400">{athlete.rating}</span>
                  </div>
                ))}
              </div>

            </div>

          </motion.div>
        )}

      </div>

      <FinalCTA />
    </main>
  );
}
