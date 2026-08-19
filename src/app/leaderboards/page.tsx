'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Search, Trophy, Zap, Activity, TrendingUp, ChevronRight, Medal, Award, Flame, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { collegeStandings, leaderboardTabs, playerStandings } from './data';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function LeaderboardsPage() {
  const [activeTab, setActiveTab] = useState<(typeof leaderboardTabs)[number]>('Colleges');
  const [search, setSearch] = useState('');

  const tableData = activeTab === 'Colleges' ? collegeStandings : playerStandings;

  const filteredStandings = useMemo(
    () =>
      tableData.filter((entry) =>
        [entry.name, entry.tag, entry.detail]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search, tableData]
  );

  const podium = filteredStandings.slice(0, 3);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. HERO HEADER WITH GAME BACKDROP ═══════════════ */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        
        {/* Background Image Layer with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/cs2.jpg"
            alt="National Esports Leaderboards"
            className="w-full h-full object-cover filter brightness-[0.35] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-3xl space-y-3">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider"
              >
                <Trophy className="h-4 w-4" /> Season 4 ELO Standings
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-none"
              >
                National <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Leaderboards</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-2xl"
              >
                Real-time national rankings for verified university esports programs and apex collegiate athletes. ELO telemetry updated live post-match.
              </motion.p>
            </div>

            {/* Tab Switcher & Search Controls */}
            <div className="flex flex-col gap-4 shrink-0">
              <div className="flex bg-[#09090b] p-1.5 rounded-2xl border border-white/15 backdrop-blur-xl shadow-2xl">
                {leaderboardTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-8 py-3 text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                      activeTab === tab ? 'text-zinc-950 bg-emerald-500 shadow-lg shadow-emerald-500/25' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {tab === 'Colleges' ? <Building2 className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      {tab}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 pt-6 border-t border-zinc-900 relative max-w-xl">
            <Search className="absolute left-4 top-1/2 translate-y-1 h-4 w-4 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()} by name, tag, or region...`}
              className="w-full rounded-2xl border border-white/10 bg-[#09090b] pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50 transition shadow-inner"
            />
          </div>

        </div>
      </section>

      {/* ═══════════════ 2. TOP 3 PODIUM SHOWCASE ═══════════════ */}
      <section className="py-14 sm:py-16 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Hall of Fame</span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-0.5">Top 3 Apex Standings</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            
            {/* 2nd Place Silver */}
            {podium[1] && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-800/40 via-[#09090b] to-black p-6 space-y-5 shadow-2xl order-2 md:order-1"
              >
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-800 border border-zinc-600 flex items-center justify-center font-black text-white text-base shadow-lg">
                    #{podium[1].rank}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-300 text-xs font-black uppercase">
                    <Medal className="h-3.5 w-3.5 text-zinc-300" /> SILVER
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">{podium[1].name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{podium[1].tag} • {podium[1].detail}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/60 border border-white/5">
                  <span className="text-xs text-zinc-400 font-bold">ELO Rating</span>
                  <span className="text-base font-black text-emerald-400">{podium[1].points} pts</span>
                </div>
              </motion.div>
            )}

            {/* 1st Place Gold Champion */}
            {podium[0] && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/25 via-[#09090b] to-black p-8 space-y-6 shadow-2xl shadow-amber-500/10 order-1 md:order-2 md:-translate-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="h-16 w-16 rounded-2xl bg-amber-500/30 border border-amber-400 flex items-center justify-center font-black text-amber-300 text-2xl shadow-xl">
                    #1
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black uppercase shadow-lg">
                    <Crown className="h-4 w-4" /> CHAMPION
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">{podium[0].name}</h3>
                  <p className="text-xs text-amber-300/80 mt-1 font-semibold">{podium[0].tag} • {podium[0].detail}</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/80 border border-amber-500/30">
                  <span className="text-xs text-amber-400 font-bold">Peak ELO Rating</span>
                  <span className="text-lg font-black text-amber-300">{podium[0].points} pts</span>
                </div>
              </motion.div>
            )}

            {/* 3rd Place Bronze */}
            {podium[2] && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-3xl border border-amber-800/50 bg-gradient-to-b from-amber-950/30 via-[#09090b] to-black p-6 space-y-5 shadow-2xl order-3"
              >
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-amber-950 border border-amber-800 flex items-center justify-center font-black text-amber-500 text-base shadow-lg">
                    #{podium[2].rank}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-400 text-xs font-black uppercase">
                    <Award className="h-3.5 w-3.5 text-amber-500" /> BRONZE
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">{podium[2].name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{podium[2].tag} • {podium[2].detail}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/60 border border-white/5">
                  <span className="text-xs text-zinc-400 font-bold">ELO Rating</span>
                  <span className="text-base font-black text-emerald-400">{podium[2].points} pts</span>
                </div>
              </motion.div>
            )}

          </div>

        </div>
      </section>

      {/* ═══════════════ 3. CLEAN DIRECTORY TABLE ═══════════════ */}
      <section className="py-14 bg-black border-t border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="overflow-hidden rounded-3xl border border-white/15 bg-[#09090b] shadow-2xl">
            <div className="grid grid-cols-[80px_minmax(0,2fr)_1fr_1fr_120px] gap-4 px-6 py-4 border-b border-zinc-800 bg-black text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <span className="text-center">Rank</span>
              <span>Name / Program</span>
              <span className="text-center">Affiliation</span>
              <span className="text-center">ELO Points</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-zinc-900">
              {filteredStandings.map((entry) => (
                <div
                  key={entry.name}
                  className="grid grid-cols-[80px_minmax(0,2fr)_1fr_1fr_120px] gap-4 items-center px-6 py-4 hover:bg-white/5 transition"
                >
                  <div className="text-center">
                    <span className="text-lg font-black text-emerald-400">#{entry.rank}</span>
                  </div>

                  <div>
                    <h4 className="font-black uppercase text-white text-sm">{entry.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{entry.tag}</p>
                  </div>

                  <div className="text-center text-xs font-semibold text-zinc-300">
                    {entry.detail}
                  </div>

                  <div className="text-center">
                    <span className="text-sm font-black text-emerald-400">{entry.points}</span>
                    <span className="block text-[9px] font-bold text-emerald-500/80 uppercase">▲ {entry.change} ELO</span>
                  </div>

                  <div className="text-right">
                    <Link
                      href={activeTab === 'Colleges' ? `/colleges` : `/players`}
                      className="inline-flex items-center justify-center p-2.5 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-emerald-500 hover:text-zinc-950 transition cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
