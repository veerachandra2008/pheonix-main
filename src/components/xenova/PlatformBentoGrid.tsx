'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Trophy, Swords, Zap, CheckCircle2, Award, Users, Cpu, ArrowUpRight } from 'lucide-react';
import SpotlightCard from './SpotlightCard';

export default function PlatformBentoGrid() {
  return (
    <section className="py-20 md:py-28 bg-[#09090b] border-y border-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
            <Cpu className="w-4 h-4 text-emerald-400" /> Platform Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            Engineered for High-Stakes Varsity Esports
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Automated brackets, anti-cheat identity resolution, and instant prize payouts designed for university gamers.
          </p>
        </div>

        {/* Asymmetric Bento Grid Layout with Uneven Corner Cut Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Card 1: Automated Bracket Engine (Col Span 7) */}
          <SpotlightCard
            glowColor="rgba(16, 185, 129, 0.25)"
            className="md:col-span-7 flex flex-col justify-between p-8 rounded-[44px_16px_36px_20px] border border-white/15 bg-[#0b0c10]/95 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-emerald-500/40"
          >
            {/* Background Artwork */}
            <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-500">
              <img src="/hero-arena.jpg" alt="Arena Graphic" className="w-full h-full object-cover filter saturate-150 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Swords className="h-6 w-6" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                  AUTOMATED ENGINE
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
                Live Dynamic Bracket Engine
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg mb-6">
                Single and double-elimination brackets update instantly after match results are verified via automated anti-cheat API logs.
              </p>
            </div>

            {/* Bracket Animation Graphic */}
            <div className="relative z-10 rounded-2xl bg-black/80 border border-white/10 p-4 space-y-3 font-mono text-xs backdrop-blur-md">
              <div className="flex items-center justify-between bg-zinc-950/80 p-2.5 rounded-xl border border-white/5">
                <span className="text-zinc-300 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Quarterfinals
                </span>
                <span className="text-emerald-400 font-bold">IIT Bombay 2 - 0 BITS Pilani</span>
              </div>
              <div className="flex items-center justify-between bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
                <span className="text-emerald-300 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Semifinals
                </span>
                <span className="text-emerald-400 font-bold">IIT Bombay vs DU Esports</span>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 2: Verified Campus Identity (Col Span 5) */}
          <SpotlightCard
            glowColor="rgba(59, 130, 246, 0.25)"
            className="md:col-span-5 flex flex-col justify-between p-8 rounded-[20px_52px_18px_40px] border border-white/15 bg-[#0b0c10]/95 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-blue-500/40"
          >
            {/* Background Artwork */}
            <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-500">
              <img src="/cs2.jpg" alt="Identity Artwork" className="w-full h-full object-cover filter saturate-150 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 backdrop-blur-md">
                  SECURITY
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors">
                Verified Roster Identity
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                Every competitor is authenticated with institutional university domain validation (.ac.in / .edu) to prevent smurfing.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 p-4 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">100% Student Verified</span>
                <span className="text-zinc-500">120+ Accredited Colleges Connected</span>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 3: Instant Prize Escrow (Col Span 5) */}
          <SpotlightCard
            glowColor="rgba(245, 158, 11, 0.25)"
            className="md:col-span-5 flex flex-col justify-between p-8 rounded-[36px_18px_48px_16px] border border-white/15 bg-[#0b0c10]/95 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-amber-500/40"
          >
            {/* Background Artwork */}
            <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-500">
              <img src="/apex.jpg" alt="Escrow Graphic" className="w-full h-full object-cover filter saturate-150 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Trophy className="h-6 w-6" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 backdrop-blur-md">
                  TRANSPARENCY
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2 tracking-tight group-hover:text-amber-400 transition-colors">
                Automated Prize Escrow
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                Prize money is deposited into escrow before tournament kickoff and disbursed directly to team captains upon bracket completion.
              </p>
            </div>

            <div className="relative z-10 p-4 rounded-2xl bg-black/80 border border-white/10 flex items-center justify-between text-xs font-bold backdrop-blur-md">
              <span className="text-zinc-400">Total Payouts Logged</span>
              <span className="text-amber-400 font-mono text-base font-black">₹15,00,000+</span>
            </div>
          </SpotlightCard>

          {/* Card 4: Varsity Leaderboards (Col Span 7) */}
          <SpotlightCard
            glowColor="rgba(168, 85, 247, 0.25)"
            className="md:col-span-7 flex flex-col justify-between p-8 rounded-[16px_40px_20px_50px] border border-white/15 bg-[#0b0c10]/95 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-purple-500/40"
          >
            {/* Background Artwork */}
            <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-500">
              <img src="/valorant.jpg" alt="Leaderboard Artwork" className="w-full h-full object-cover filter saturate-150 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Award className="h-6 w-6" />
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/30 backdrop-blur-md">
                  RIVALRY MATRIX
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2 tracking-tight group-hover:text-purple-400 transition-colors">
                National Collegiate Leaderboards
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg mb-6">
                Earn varsity leaderboard points for every match victory. Compete to rank your college #1 in the all-India university standings.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
                <span className="block text-[10px] font-black text-zinc-500 uppercase">RANK #1</span>
                <span className="text-sm font-extrabold text-white">IIT Bombay</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
                <span className="block text-[10px] font-black text-zinc-500 uppercase">RANK #2</span>
                <span className="text-sm font-extrabold text-white">BITS Pilani</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
                <span className="block text-[10px] font-black text-zinc-500 uppercase">RANK #3</span>
                <span className="text-sm font-extrabold text-white">DU Hub</span>
              </div>
            </div>
          </SpotlightCard>

        </div>

      </div>
    </section>
  );
}
