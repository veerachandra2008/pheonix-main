'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, PlayCircle, Trophy, Swords, Zap, ChevronRight, CircleDot, Flame, Shield } from 'lucide-react';
import Link from 'next/link';

interface MatchTickerItem {
  id: string;
  game: string;
  status: string;
  team1: string;
  college1: string;
  score1: string;
  team2: string;
  college2: string;
  score2: string;
  details: string;
  slug: string;
  streamUrl?: string;
  accent: string;
}

const liveMatches: MatchTickerItem[] = [
  {
    id: 'm-1',
    game: 'VALORANT',
    status: 'MAP 2 • MATCH POINT',
    team1: 'Titans',
    college1: 'IIT Bombay',
    score1: '12',
    team2: 'Vipers',
    college2: 'BITS Pilani',
    score2: '10',
    details: 'Grand Finals • Bind Map',
    slug: 'nexus-valorant-champions-cup',
    accent: '#10b981',
  },
  {
    id: 'm-2',
    game: 'BGMI',
    status: 'MATCH 4 • ERANGEL',
    team1: 'DU Esports',
    college1: 'Delhi University',
    score1: '#1',
    team2: 'SRM Strikers',
    college2: 'SRM Institute',
    score2: '#3',
    details: '48 Squads Alive',
    slug: 'bgmi-college-cup-season-4',
    accent: '#f59e0b',
  },
  {
    id: 'm-3',
    game: 'CS2',
    status: 'OVERTIME • MAP 3',
    team1: 'Anna Knights',
    college1: 'Anna University',
    score1: '14',
    team2: 'VIT Apex',
    college2: 'VIT Vellore',
    score2: '14',
    details: 'Semi Finals • Mirage',
    slug: 'cs2-campus-clash',
    accent: '#3b82f6',
  },
];

export default function LiveMatchTicker() {
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto rotate active match every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % liveMatches.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const activeMatch = liveMatches[activeIdx];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 z-20 relative">
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#09090b]/90 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-500/5 group hover:border-emerald-500/40 transition-all duration-500">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 relative z-10">
          
          {/* Live Broadcast Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-widest shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              LIVE TELEMETRY
            </div>
            <span className="hidden lg:block h-6 w-px bg-zinc-800" />
          </div>

          {/* Matches Switcher / Current Match Display */}
          <div className="flex-1 w-full overflow-hidden">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {liveMatches.map((match, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={match.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`relative flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer text-left ${
                      isActive
                        ? 'bg-zinc-900 border border-white/20 text-white shadow-xl shadow-black/60 scale-[1.02]'
                        : 'bg-black/40 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 hidden md:flex'
                    }`}
                  >
                    {/* Game Badge */}
                    <span 
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border"
                      style={{
                        color: match.accent,
                        borderColor: `${match.accent}44`,
                        backgroundColor: `${match.accent}15`
                      }}
                    >
                      {match.game}
                    </span>

                    {/* Teams Scoreboard */}
                    <div className="flex items-center gap-2 text-xs font-black">
                      <span className="text-zinc-200 truncate max-w-[100px] sm:max-w-[130px]">{match.team1}</span>
                      <span className="font-mono text-emerald-400 font-black px-2 py-0.5 rounded bg-black border border-white/10 text-xs">
                        {match.score1} : {match.score2}
                      </span>
                      <span className="text-zinc-200 truncate max-w-[100px] sm:max-w-[130px]">{match.team2}</span>
                    </div>

                    {/* Active Match Pulsing Indicator */}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Match Status Subtitle */}
            <div className="text-center mt-2 flex items-center justify-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{activeMatch.status}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[10px] font-semibold text-zinc-400">{activeMatch.details}</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            <Link
              href={`/tournaments/${activeMatch.slug}`}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:scale-105 cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 fill-zinc-950 text-zinc-950" /> Watch Live Match <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
