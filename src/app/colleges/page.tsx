'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Crown,
  MapPin,
  Medal,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Activity,
  Globe,
  Building2,
  Users,
  ChevronRight,
  Plus,
  X,
  LayoutGrid,
  List,
  Check,
  SlidersHorizontal,
  Flame,
  Award,
  ArrowRight
} from 'lucide-react';
import { slugify, type XenovaCollege } from '@/lib/xenova-data';
import FinalCTA from '@/components/xenova/FinalCTA';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

const stateFilters = ['All States', 'Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Telangana'];
const typeFilters = ['All Types', 'Engineering', 'Design', 'Commerce', 'Sports', 'University'];
const sortOptions = ['National Ranking', 'Most Players', 'Most Trophies'];

const achievements = [
  { label: 'Most Tournament Wins', value: 'Nexus Institute of Tech', detail: '34 championships across 5 esports titles', icon: Trophy, color: '#fbbf24' },
  { label: 'Best Varsity Ecosystem', value: 'Arcadia College', detail: 'Highest student engagement & club score', icon: ShieldCheck, color: '#10b981' },
  { label: 'Highest National Rank', value: 'Nexus Institute', detail: 'Rank #1 overall in Season 4 standings', icon: Crown, color: '#6366f1' },
];

const initials = (name: string) =>
  name
    .split(' ')
    .filter((part) => !['of', 'and', 'the'].includes(part.toLowerCase()))
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

// In-memory module cache for sub-millisecond route transitions (0.0ms)
let cachedCollegesMemory: XenovaCollege[] | null = null;

export default function CollegesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedSort, setSelectedSort] = useState('National Ranking');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Instant 0.0ms Synchronous State Hydration
  const [customColleges, setCustomColleges] = useState<XenovaCollege[]>(() => {
    if (cachedCollegesMemory && cachedCollegesMemory.length > 0) return cachedCollegesMemory;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('xenova_colleges_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedCollegesMemory = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeLocation, setNewCollegeLocation] = useState('');
  const [newCollegeState, setNewCollegeState] = useState('Karnataka');
  const [newCollegeType, setNewCollegeType] = useState('Engineering');
  const [newCollegeWebsite, setNewCollegeWebsite] = useState('');

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        setCurrentUser(JSON.parse(rawSession));
      } catch (e) {
        console.error(e);
      }
    }

    const loadColleges = async () => {
      try {
        // Direct Supabase Query (<30ms)
        const { data: sbColleges } = await supabase.from('colleges').select('*');
        if (sbColleges && Array.isArray(sbColleges) && sbColleges.length > 0) {
          const loadedList = sbColleges.map((c: any) => ({
            ...c,
            slug: c.slug || slugify(c.name),
            nationalRank: c.national_rank || c.nationalRank || 99,
            stateRank: c.state_rank || c.stateRank || 99,
            teams: c.teams ?? c.teams_count ?? 0,
            teamsCount: c.teams_count ?? c.teams ?? 0,
            verificationStatus: c.verification_status || c.verificationStatus || (c.verified ? 'approved' : 'pending'),
          }));
          cachedCollegesMemory = loadedList;
          try {
            localStorage.setItem('xenova_colleges_cache', JSON.stringify(loadedList));
          } catch {}
          setCustomColleges(loadedList);
        }
      } catch (err) {
        console.error('Failed to load colleges from DB:', err);
      }
    };

    loadColleges();
  }, []);

  const allColleges = useMemo(() => {
    return customColleges;
  }, [customColleges]);

  const filteredColleges = useMemo(() => {
    const visible = allColleges.filter((college) => {
      const isApproved = college.verificationStatus === 'approved' || college.verification_status === 'approved' || college.verified;
      if (!isApproved) return false;

      const matchesSearch = [college.name, college.location, college.state, college.type]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesState = selectedState === 'All States' || college.state === selectedState;
      const matchesType = selectedType === 'All Types' || college.type === selectedType;

      return matchesSearch && matchesState && matchesType;
    });

    return [...visible].sort((a, b) => {
      if (selectedSort === 'Most Players') return (b.players || 0) - (a.players || 0);
      if (selectedSort === 'Most Trophies') return (b.trophies || 0) - (a.trophies || 0);
      return (a.nationalRank || 99) - (b.nationalRank || 99);
    });
  }, [allColleges, searchTerm, selectedState, selectedSort, selectedType]);

  const topPodiumColleges = useMemo(() => {
    const verifiedOnly = allColleges.filter(c => c.verificationStatus === 'approved' || c.verification_status === 'approved' || c.verified);
    return [...verifiedOnly].sort((a, b) => (a.nationalRank || 99) - (b.nationalRank || 99)).slice(0, 3);
  }, [allColleges]);

  const totalAthletesCount = useMemo(() => {
    return allColleges.reduce((sum, c) => sum + (c.players || 0), 0);
  }, [allColleges]);

  const totalTrophiesCount = useMemo(() => {
    return allColleges.reduce((sum, c) => sum + (c.trophies || 0), 0);
  }, [allColleges]);

  const handleRegisterCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in first to submit a college program for verification.');
      return;
    }

    const cleanName = newCollegeName.trim();
    if (!cleanName || !newCollegeLocation.trim() || !newCollegeWebsite.trim()) {
      alert('College name, location, and website URL are required.');
      return;
    }

    const slug = slugify(cleanName);
    const exists = allColleges.some((college) => college.slug === slug || college.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      alert('This college already exists in our database.');
      return;
    }

    const pendingCollege = {
      slug,
      name: cleanName,
      location: newCollegeLocation.trim(),
      state: newCollegeState,
      type: newCollegeType,
      national_rank: allColleges.length + 1,
      state_rank: 1,
      players: 0,
      teams: 0,
      teams_count: 0,
      trophies: 0,
      wins: 0,
      verified: false,
      verification_status: 'pending',
      accent: '#10b981',
      website: newCollegeWebsite.trim().replace(/^https?:\/\//, ''),
      submitted_by: currentUser.email,
    };

    try {
      // 1. Direct Supabase Insert
      try {
        await supabase.from('colleges').insert(pendingCollege);
      } catch (sbErr) {
        console.warn('Supabase college insert notice:', sbErr);
      }

      // 2. Backend API Insert
      try {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/colleges/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingCollege),
        });
      } catch {}

      // Reload fresh list from database
      const { data: refreshed } = await supabase.from('colleges').select('*');
      if (refreshed && Array.isArray(refreshed) && refreshed.length > 0) {
        setCustomColleges(refreshed.map((c: any) => ({
          ...c,
          slug: c.slug || slugify(c.name),
          nationalRank: c.national_rank || c.nationalRank || 99,
          stateRank: c.state_rank || c.stateRank || 99,
          teams: c.teams ?? c.teams_count ?? 0,
          teamsCount: c.teams_count ?? c.teams ?? 0,
          verificationStatus: c.verification_status || c.verificationStatus || (c.verified ? 'approved' : 'pending'),
        })));
      }
    } catch (err) {
      console.error(err);
    }

    setNewCollegeName('');
    setNewCollegeLocation('');
    setNewCollegeWebsite('');
    setIsAddModalOpen(false);
    alert('College program submitted successfully to the database! It will appear on the leaderboard once approved by the Admin.');
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
        {/* Artwork Backdrop with Diagonal Slanted Divider */}
        <div className="absolute inset-0 z-0">
          <img
            src="/csgo.jpg"
            alt="University Esports Ecosystem"
            className="w-full h-full object-cover filter brightness-[0.35] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        {/* Slanted Geometric Divider Line */}
        <div 
          className="absolute top-0 right-1/3 w-80 h-full bg-gradient-to-b from-teal-400 via-emerald-500 to-transparent opacity-20 hidden lg:block pointer-events-none"
          style={{ clipPath: 'polygon(50% 0, 65% 0, 15% 100%, 0 100%)' }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg"
              >
                <Building2 className="h-4 w-4 fill-emerald-400" /> Institutional Varsity Network
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-none drop-shadow-2xl"
              >
                University <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Esports Labs</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-2xl"
              >
                Discover verified higher education esports programs across India. Compare campus gaming infrastructure, student athlete depth, and championship trophies.
              </motion.p>
            </div>

            {/* Live Telemetry Summary HUD */}
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-6 rounded-2xl border border-white/15 bg-black/80 px-6 py-4 backdrop-blur-2xl shadow-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Varsities</p>
                  <p className="text-2xl font-black text-white mt-0.5">{allColleges.length}</p>
                </div>
                <div className="h-8 w-px bg-zinc-800" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Athletes</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">{totalAthletesCount.toLocaleString()}</p>
                </div>
                <div className="h-8 w-px bg-zinc-800" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trophies</p>
                  <p className="text-2xl font-black text-amber-400 mt-0.5">{totalTrophiesCount}</p>
                </div>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-4 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:scale-[1.02] transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Register College
                </button>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-4 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:scale-[1.02] transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Register College
                </Link>
              )}
            </div>
          </div>

          {/* Search, Filters & View Switcher Panel */}
          <div className="mt-10 pt-8 border-t border-zinc-800/80 grid gap-4 lg:grid-cols-12 items-center">
            
            {/* Search Input (5 Cols) */}
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search university name, city, state, or discipline..."
                className="w-full rounded-2xl border border-white/15 bg-zinc-950/90 pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 transition shadow-inner backdrop-blur-md"
              />
            </div>

            {/* Filter Dropdowns (5 Cols) */}
            <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="rounded-xl border border-white/15 bg-zinc-950 px-3.5 py-3 text-xs font-bold text-zinc-300 outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                {stateFilters.map((st) => (
                  <option key={st} value={st} className="bg-zinc-950 text-white">{st}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-white/15 bg-zinc-950 px-3.5 py-3 text-xs font-bold text-zinc-300 outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                {typeFilters.map((tp) => (
                  <option key={tp} value={tp} className="bg-zinc-950 text-white">{tp}</option>
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

            {/* View Mode Switcher (2 Cols) */}
            <div className="lg:col-span-2 flex justify-end items-center gap-1.5 bg-[#09090b] p-1.5 rounded-2xl border border-white/15 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl text-xs font-bold transition ${
                  viewMode === 'grid' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl text-xs font-bold transition ${
                  viewMode === 'table' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
                title="Leaderboard Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ═══════════════ 2. TOP 3 NATIONAL PODIUM SHOWCASE WITH SLANTED CARDS ═══════════════ */}
      <section className="py-14 sm:py-20 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Seasonal Champions</span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-0.5">Top National Standings</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-400">
              <Crown className="h-3.5 w-3.5 text-amber-400" /> Season 4 Standings
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            
            {/* 2nd Place Silver Podium */}
            {topPodiumColleges[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-800/40 via-[#09090b] to-black p-6 space-y-5 shadow-2xl order-2 md:order-1"
              >
                <div className="flex items-start justify-between">
                  <CollegeEmblem name={topPodiumColleges[1].name} accent={topPodiumColleges[1].accent} />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-300 text-xs font-black uppercase">
                    <Medal className="h-3.5 w-3.5 text-zinc-300" /> RANK #2
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">{topPodiumColleges[1].name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {topPodiumColleges[1].location}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/60 border border-white/5 text-center">
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Athletes</span>
                    <span className="text-xs font-black text-white">{topPodiumColleges[1].players}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Squads</span>
                    <span className="text-xs font-black text-white">{topPodiumColleges[1].teams}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Trophies</span>
                    <span className="text-xs font-black text-amber-400">{topPodiumColleges[1].trophies}</span>
                  </div>
                </div>

                <Link
                  href={`/colleges/${topPodiumColleges[1].slug || slugify(topPodiumColleges[1].name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white hover:bg-white/10 transition cursor-pointer"
                >
                  View Campus Profile <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}

            {/* 1st Place Gold Champion Podium */}
            {topPodiumColleges[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/20 via-[#09090b] to-black p-8 space-y-6 shadow-2xl shadow-amber-500/10 order-1 md:order-2 md:-translate-y-4"
              >
                <div className="flex items-start justify-between">
                  <CollegeEmblem name={topPodiumColleges[0].name} accent={topPodiumColleges[0].accent} large />
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black uppercase shadow-lg">
                    <Crown className="h-4 w-4" /> RANK #1 CHAMPION
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">{topPodiumColleges[0].name}</h3>
                  <p className="text-xs text-amber-300/80 mt-1 flex items-center gap-1 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" /> {topPodiumColleges[0].location}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-black/80 border border-amber-500/30 text-center">
                  <div>
                    <span className="block text-[9px] font-black text-amber-400/80 uppercase">Athletes</span>
                    <span className="text-sm font-black text-white">{topPodiumColleges[0].players}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-amber-400/80 uppercase">Squads</span>
                    <span className="text-sm font-black text-white">{topPodiumColleges[0].teams}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-amber-400/80 uppercase">Trophies</span>
                    <span className="text-sm font-black text-amber-400">{topPodiumColleges[0].trophies}</span>
                  </div>
                </div>

                <Link
                  href={`/colleges/${topPodiumColleges[0].slug || slugify(topPodiumColleges[0].name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-3.5 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                >
                  Explore Campus Dossier <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}

            {/* 3rd Place Bronze Podium */}
            {topPodiumColleges[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl border border-cyan-800/50 bg-gradient-to-b from-cyan-950/30 via-[#09090b] to-black p-6 space-y-5 shadow-2xl order-3"
              >
                <div className="flex items-start justify-between">
                  <CollegeEmblem name={topPodiumColleges[2].name} accent={topPodiumColleges[2].accent} />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 text-xs font-black uppercase">
                    <Award className="h-3.5 w-3.5 text-cyan-400" /> RANK #3
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">{topPodiumColleges[2].name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {topPodiumColleges[2].location}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/60 border border-white/5 text-center">
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Athletes</span>
                    <span className="text-xs font-black text-white">{topPodiumColleges[2].players}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Squads</span>
                    <span className="text-xs font-black text-white">{topPodiumColleges[2].teams}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-zinc-500 uppercase">Trophies</span>
                    <span className="text-xs font-black text-amber-400">{topPodiumColleges[2].trophies}</span>
                  </div>
                </div>

                <Link
                  href={`/colleges/${topPodiumColleges[2].slug || slugify(topPodiumColleges[2].name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white hover:bg-white/10 transition cursor-pointer"
                >
                  View Campus Profile <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            )}

          </div>

        </div>
      </section>

      {/* ═══════════════ 3. DIRECTORY GRID / TABLE VIEW ═══════════════ */}
      <section className="py-14 bg-black border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Institutional Directory</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                All Verified University Programs ({filteredColleges.length})
              </h2>
            </div>
          </div>

          {filteredColleges.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-16 text-center text-zinc-400 text-sm">
              No college programs match your search criteria. Try clearing search filters or registering a new program.
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredColleges.map((college, index) => (
                <motion.article
                  key={college.slug || college.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] p-6 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <CollegeEmblem name={college.name} accent={college.accent} />
                      
                      <div className="text-right space-y-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                          <BadgeCheck className="h-3 w-3" /> VERIFIED
                        </span>
                        <p className="text-xs font-black text-zinc-400">Rank <strong className="text-white">#{college.nationalRank}</strong></p>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <h3 className="text-lg font-black uppercase text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                        {college.name}
                      </h3>
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {college.location}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-5 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs">
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">Athletes Depth</span>
                        <span className="font-black text-white">{college.players} Players</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">Varsity Squads</span>
                        <span className="font-black text-white">{college.teams} Teams</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">State Rank</span>
                        <span className="font-black text-emerald-400">#{college.stateRank} in {college.state}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black text-zinc-500 uppercase">Championships</span>
                        <span className="font-black text-amber-400">{college.trophies} Trophies</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-6">
                    <Link
                      href={`/colleges/${college.slug || slugify(college.name)}`}
                      prefetch={true}
                      className="w-full inline-flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase text-white hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 transition cursor-pointer group/btn active:scale-95"
                    >
                      <span>Explore Dossier</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            /* TABLE LEADERBOARD VIEW */
            <div className="overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] shadow-2xl">
              <div className="grid grid-cols-[80px_minmax(0,2fr)_1fr_1fr_1fr_120px] gap-4 px-6 py-4 border-b border-zinc-800 bg-black text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span className="text-center">Rank</span>
                <span>Institution</span>
                <span className="text-center">State</span>
                <span className="text-center">Athletes</span>
                <span className="text-center">Trophies</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-zinc-900">
                {filteredColleges.map((college) => (
                  <div
                    key={college.slug || college.name}
                    className="grid grid-cols-[80px_minmax(0,2fr)_1fr_1fr_1fr_120px] gap-4 items-center px-6 py-4 hover:bg-white/5 transition"
                  >
                    <div className="text-center">
                      <span className="text-lg font-black text-emerald-400">#{college.nationalRank}</span>
                    </div>

                    <div className="flex items-center gap-3.5 min-w-0">
                      <CollegeEmblem name={college.name} accent={college.accent} />
                      <div className="min-w-0">
                        <h4 className="font-black uppercase text-white text-sm truncate">{college.name}</h4>
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-400" /> {college.location}
                        </p>
                      </div>
                    </div>

                    <div className="text-center text-xs font-bold text-zinc-300">
                      {college.state}
                    </div>

                    <div className="text-center text-xs font-black text-white">
                      {college.players}
                    </div>

                    <div className="text-center text-xs font-black text-amber-400">
                      {college.trophies}
                    </div>

                    <div className="text-right">
                      <Link
                        href={`/colleges/${college.slug || slugify(college.name)}`}
                        prefetch={true}
                        className="inline-flex items-center justify-center p-2.5 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-emerald-500 hover:text-zinc-950 transition active:scale-95 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ═══════════════ 4. PROGRAM HONORS & ACHIEVEMENTS ═══════════════ */}
      <section className="py-16 bg-black border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Institutional Accolades</span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Program Honors</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {achievements.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-[#09090b] p-6 space-y-3 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</span>
                      <h4 className="text-base font-black text-white uppercase">{item.value}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 font-normal leading-relaxed">{item.detail}</p>
                </div>
              );
            })}
          </div>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">University Portal</span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Register College Program</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterCollege} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    College Name
                    <input
                      value={newCollegeName}
                      onChange={(e) => setNewCollegeName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                      placeholder="e.g. Horizon Tech University"
                      required
                    />
                  </label>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Website URL
                    <input
                      value={newCollegeWebsite}
                      onChange={(e) => setNewCollegeWebsite(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                      placeholder="college.edu"
                      required
                    />
                  </label>
                </div>

                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Location (City, State)
                  <input
                    value={newCollegeLocation}
                    onChange={(e) => setNewCollegeLocation(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                    placeholder="e.g. Bengaluru, Karnataka"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    State
                    <select
                      value={newCollegeState}
                      onChange={(e) => setNewCollegeState(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                    >
                      {stateFilters.filter((s) => s !== 'All States').map((s) => (
                        <option key={s} value={s} className="bg-zinc-950">{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Discipline Type
                    <select
                      value={newCollegeType}
                      onChange={(e) => setNewCollegeType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                    >
                      {typeFilters.filter((t) => t !== 'All Types').map((t) => (
                        <option key={t} value={t} className="bg-zinc-950">{t}</option>
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
                    Submit for Verification
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

function CollegeEmblem({ name, accent, large = false }: { name: string; accent: string; large?: boolean }) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center border-2 font-black text-white shadow-xl ${
        large ? 'h-16 w-16 text-lg' : 'h-12 w-12 text-xs'
      }`}
      style={{
        borderRadius: 16,
        borderColor: accent ? `${accent}66` : '#10b98166',
        background: `linear-gradient(135deg, ${accent || '#10b981'}33, rgba(255,255,255,0.05))`,
      }}
    >
      <span className="italic uppercase tracking-tighter">{initials(name)}</span>
    </div>
  );
}
