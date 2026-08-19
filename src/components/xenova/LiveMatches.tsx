'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Eye, Users, Clock, ChevronRight, Zap, Radio, Activity, TrendingUp } from 'lucide-react';

interface LiveMatch {
  id: number;
  team1: { name: string; logo: string; score: number; winRate: string };
  team2: { name: string; logo: string; score: number; winRate: string };
  game: string;
  tournament: string;
  viewers: number;
  status: 'live' | 'starting';
  map?: string;
  round?: string;
}

const liveMatches: LiveMatch[] = [
  { id: 1, team1: { name: 'Stanford Eagles', logo: '', score: 12, winRate: '78%' }, team2: { name: 'MIT Phoenix', logo: '', score: 10, winRate: '72%' }, game: 'VALORANT', tournament: 'XENOVA Championship', viewers: 8420, status: 'live', map: 'Haven', round: 'Round 22' },
  { id: 2, team1: { name: 'UCLA Titans', logo: '', score: 0, winRate: '65%' }, team2: { name: 'Berkeley Wolves', logo: '', score: 0, winRate: '68%' }, game: 'CS2', tournament: 'Counter-Strike Masters', viewers: 3200, status: 'starting' },
  { id: 3, team1: { name: 'Harvard Knights', logo: '', score: 2, winRate: '82%' }, team2: { name: 'Yale Dragons', logo: '', score: 1, winRate: '75%' }, game: 'League of Legends', tournament: 'Collegiate League Finals', viewers: 5600, status: 'live', round: 'Game 4' },
];

// Animated viewer counter — updates count without remounting the element
const AnimatedViewers = ({ count }: { count: number }) => {
  const [displayCount, setDisplayCount] = useState(count);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayCount(prev => prev + Math.floor(Math.random() * 20) - 10);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // Simple number display — no key-based remount which caused cascade re-renders
  return <span className="tabular-nums">{displayCount.toLocaleString()}</span>;
};

// Pulsing live indicator
const LiveIndicator = () => (
  <div className="flex items-center gap-2">
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B30] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF3B30]"></span>
    </span>
    <span className="text-[#FF3B30] font-bold text-sm tracking-wider">LIVE</span>
  </div>
);

// Team Logo with animation
const TeamLogo = ({ name, color, side }: { name: string; color: string; side: 'left' | 'right' }) => (
  <motion.div
    className="relative"
    initial={{ scale: 0, rotate: side === 'left' ? -180 : 180 }}
    whileInView={{ scale: 1, rotate: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, type: "spring" }}
  >
    <motion.div
      className="w-20 h-20 rounded-2xl flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}20, transparent)`,
        border: `1px solid ${color}40`,
      }}
      whileHover={{ scale: 1.1 }}
    >
      <span className="text-3xl font-bold" style={{ color }}>{name[0]}</span>
      
      {/* Animated corner accent */}
      <motion.div
        className="absolute top-0 right-0 w-4 h-4"
        style={{ background: color, opacity: 0.5 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  </motion.div>
);

// Score display — winning score has a CSS pulse glow, no infinite Framer Motion animation
const AnimatedScore = ({ score, isWinning }: { score: number; isWinning: boolean }) => (
  <div className="relative">
    <span
      className={`text-6xl md:text-7xl font-black ${
        isWinning ? 'text-white' : 'text-white/60'
      }`}
    >
      {score}
    </span>
    {isWinning && (
      <div className="absolute -inset-2 rounded-lg bg-[#FF3B30]/20 blur-xl -z-10 animate-pulse" />
    )}
  </div>
);

export default function LiveMatches() {
  const [countdown, setCountdown] = useState({ m: 5, s: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.s === 0 && prev.m === 0) return { m: 5, s: 0 };
        if (prev.s === 0) return { m: prev.m - 1, s: 59 };
        return { m: prev.m, s: prev.s - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section ref={containerRef} className="relative py-24 bg-[#0a0f1a] overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14] via-transparent to-[#070B14]" />
        
        {/* Animated lines */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,59,48,0.5), transparent)',
          }}
          animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Static floating orbs — removed infinite x/y/scale animations */}
        <div
          className="absolute left-1/4 top-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,59,48,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute right-1/4 bottom-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
        >
          <div>
            <motion.div
              className="flex items-center gap-3 mb-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Radio className="w-5 h-5 text-[#FF3B30]" />
              </motion.div>
              <LiveIndicator />
            </motion.div>
            <motion.h2
              className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Live <span className="text-[#FF3B30]">Matches</span>
            </motion.h2>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
          >
            <Button variant="ghost" className="text-[#CBD5E1] hover:text-white hover:bg-white/5 group">
              View All Matches
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ChevronRight className="w-4 h-4 ml-2" />
              </motion.span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Main Featured Match */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Card className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#111827] border border-[#FF3B30]/30 hover:border-[#FF3B30]/50 transition-all duration-500 group">
            {/* Animated top bar */}
            <div className="h-1 bg-gradient-to-r from-[#FF3B30] via-[#F97316] to-[#FF3B30]">
              <motion.div
                className="h-full w-1/3 bg-white/30"
                animate={{ x: ['0%', '300%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </div>
            
            {/* Background glow */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(255,59,48,0.1) 0%, transparent 50%)',
              }}
            />
            
            <div className="relative p-8">
              {/* Match Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <LiveIndicator />
                  <Badge variant="outline" className="border-white/10 text-[#CBD5E1]">
                    {liveMatches[0].game}
                  </Badge>
                  <Badge variant="outline" className="border-[#FF3B30]/20 text-[#FF3B30] text-xs">
                    {liveMatches[0].map}
                  </Badge>
                  {liveMatches[0].round && (
                    <Badge variant="outline" className="border-white/5 text-[#94A3B8] text-xs">
                      {liveMatches[0].round}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    <Eye className="w-4 h-4 text-[#FF3B30]" />
                  </motion.div>
                  <span className="text-sm">
                    <AnimatedViewers count={liveMatches[0].viewers} /> watching
                  </span>
                </div>
              </div>

              {/* Teams VS */}
              <div className="flex items-center justify-between">
                {/* Team 1 */}
                <div className="flex-1 flex flex-col items-center">
                  <TeamLogo name={liveMatches[0].team1.name} color="#FF3B30" side="left" />
                  <motion.h4
                    className="text-xl font-black uppercase italic text-white mt-4 mb-1 tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    {liveMatches[0].team1.name}
                  </motion.h4>
                  <p className="text-sm text-[#94A3B8] mb-2">Stanford University</p>
                  <div className="flex items-center gap-1 text-xs text-[#22C55E]">
                    <TrendingUp className="w-3 h-3" />
                    {liveMatches[0].team1.winRate} win rate
                  </div>
                </div>

                {/* Score */}
                <div className="flex items-center gap-8 px-12">
                  <AnimatedScore
                    score={liveMatches[0].team1.score}
                    isWinning={liveMatches[0].team1.score > liveMatches[0].team2.score}
                  />
                  
                  <motion.div
                    className="flex flex-col items-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span className="text-4xl text-white/20 font-black italic">VS</span>
                    <Activity className="w-6 h-6 text-[#FF3B30] mt-2" />
                  </motion.div>
                  
                  <AnimatedScore
                    score={liveMatches[0].team2.score}
                    isWinning={liveMatches[0].team2.score > liveMatches[0].team1.score}
                  />
                </div>

                {/* Team 2 */}
                <div className="flex-1 flex flex-col items-center">
                  <TeamLogo name={liveMatches[0].team2.name} color="#2563EB" side="right" />
                  <motion.h4
                    className="text-xl font-black uppercase italic text-white mt-4 mb-1 tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    {liveMatches[0].team2.name}
                  </motion.h4>
                  <p className="text-sm text-[#94A3B8] mb-2">MIT</p>
                  <div className="flex items-center gap-1 text-xs text-[#22C55E]">
                    <TrendingUp className="w-3 h-3" />
                    {liveMatches[0].team2.winRate} win rate
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[#94A3B8]">{liveMatches[0].tournament}</span>
                  <motion.div
                    className="flex items-center gap-1 text-xs text-[#FF3B30]"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Zap className="w-3 h-3" />
                    Intense match!
                  </motion.div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-gradient-to-r from-[#FF3B30] to-[#F97316] hover:from-[#FF3B30]/90 hover:to-[#F97316]/90 text-white px-8">
                    <Play className="w-4 h-4 mr-2" />
                    Watch Stream
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Secondary Matches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {liveMatches.slice(1).map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="relative overflow-hidden bg-[#0F172A]/50 border border-white/5 hover:border-white/20 transition-all duration-300 group cursor-pointer h-full">
                {/* Status indicator bar */}
                <div className={`h-0.5 ${match.status === 'live' ? 'bg-[#FF3B30]' : 'bg-[#2563EB]'}`} />
                
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      {match.status === 'live' ? (
                        <LiveIndicator />
                      ) : (
                        <div className="flex items-center gap-2 text-[#2563EB]">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold text-sm">
                            {countdown.m}:{countdown.s.toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className="border-white/10 text-[#94A3B8] text-xs">
                        {match.game}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[#94A3B8] text-xs">
                      <Eye className="w-3 h-3" />
                      {match.viewers.toLocaleString()}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-12 h-12 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center border border-[#FF3B30]/20"
                        whileHover={{ scale: 1.1 }}
                      >
                        <span className="text-lg font-bold text-[#FF3B30]">{match.team1.name[0]}</span>
                      </motion.div>
                      <div>
                        <p className="text-white font-semibold">{match.team1.name}</p>
                        <p className="text-xs text-[#94A3B8]">{match.team1.winRate} WR</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 px-6">
                      <motion.span
                        className="text-3xl font-bold text-white"
                        animate={match.team1.score > match.team2.score ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        {match.team1.score}
                      </motion.span>
                      <span className="text-xl text-white/20">:</span>
                      <motion.span
                        className="text-3xl font-bold text-white"
                        animate={match.team2.score > match.team1.score ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        {match.team2.score}
                      </motion.span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-white font-semibold">{match.team2.name}</p>
                        <p className="text-xs text-[#94A3B8]">{match.team2.winRate} WR</p>
                      </div>
                      <motion.div
                        className="w-12 h-12 rounded-xl bg-[#2563EB]/10 flex items-center justify-center border border-[#2563EB]/20"
                        whileHover={{ scale: 1.1 }}
                      >
                        <span className="text-lg font-bold text-[#2563EB]">{match.team2.name[0]}</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-[#94A3B8]">{match.tournament}</span>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="sm" variant="ghost" className="text-[#CBD5E1] hover:text-white">
                        <Play className="w-3 h-3 mr-1" />
                        Watch
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
