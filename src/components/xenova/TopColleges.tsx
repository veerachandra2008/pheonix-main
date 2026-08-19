'use client';

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Star, ChevronRight, TrendingUp, Flame, Zap, Target, Crown } from 'lucide-react';

interface College {
  id: number;
  name: string;
  shortName: string;
  rank: number;
  points: number;
  wins: number;
  tournaments: number;
  badges: string[];
  trend: 'up' | 'down' | 'stable';
  color: string;
}

const colleges: College[] = [
  { id: 1, name: 'Stanford University', shortName: 'Stanford', rank: 1, points: 2450, wins: 42, tournaments: 8, badges: ['Champion', 'Rising Star'], trend: 'up', color: '#FFD700' },
  { id: 2, name: 'Massachusetts Institute of Technology', shortName: 'MIT', rank: 2, points: 2320, wins: 38, tournaments: 7, badges: ['Tech Elite'], trend: 'stable', color: '#C0C0C0' },
  { id: 3, name: 'University of California, Los Angeles', shortName: 'UCLA', rank: 3, points: 2180, wins: 35, tournaments: 6, badges: ['Dominant'], trend: 'up', color: '#CD7F32' },
  { id: 4, name: 'University of California, Berkeley', shortName: 'Berkeley', rank: 4, points: 2050, wins: 32, tournaments: 6, badges: ['Consistent'], trend: 'up', color: '#475569' },
  { id: 5, name: 'Harvard University', shortName: 'Harvard', rank: 5, points: 1920, wins: 28, tournaments: 5, badges: ['Prestigious'], trend: 'down', color: '#475569' },
  { id: 6, name: 'University of Texas at Austin', shortName: 'UT Austin', rank: 6, points: 1850, wins: 25, tournaments: 5, badges: [], trend: 'up', color: '#475569' },
];

// Animated rank badge
const RankBadge = ({ rank, color }: { rank: number; color: string }) => {
  const getIcon = () => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6" />;
      case 2: return <Medal className="w-6 h-6" />;
      case 3: return <Trophy className="w-6 h-6" />;
      default: return <span className="text-xl font-bold">#{rank}</span>;
    }
  };

  return (
    <motion.div
      className="relative"
      initial={{ scale: 0, rotate: -180 }}
      whileInView={{ scale: 1, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          boxShadow: `0 0 30px ${color}40`,
        }}
      >
        {getIcon()}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent)`,
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
      </div>
    </motion.div>
  );
};

// Trend indicator
const TrendIndicator = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'stable') return null;
  
  return (
    <motion.div
      className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-[#22C55E]' : 'text-[#FF3B30]'}`}
      animate={trend === 'up' ? { y: [0, -3, 0] } : { y: [0, 3, 0] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
    </motion.div>
  );
};

export default function TopColleges() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return { gradient: 'from-[#FFD700] to-[#FFA500]', border: '#FFD700', glow: 'rgba(255,215,0,0.3)' };
      case 2: return { gradient: 'from-[#C0C0C0] to-[#A8A8A8]', border: '#C0C0C0', glow: 'rgba(192,192,192,0.3)' };
      case 3: return { gradient: 'from-[#CD7F32] to-[#8B4513]', border: '#CD7F32', glow: 'rgba(205,127,50,0.3)' };
      default: return { gradient: 'from-[#475569] to-[#334155]', border: '#475569', glow: 'rgba(71,85,105,0.2)' };
    }
  };

  return (
    <section ref={containerRef} className="relative py-24 bg-[#070B14] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Floating elements */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${10 + i * 20}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.05, 0.15, 0.05],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            <Trophy className="w-8 h-8 text-[#FFD700]" />
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-4"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring" }}
          >
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
              <Medal className="w-6 h-6 text-[#FFD700]" />
            </motion.div>
            <span className="text-slate-500 text-xs font-black tracking-[0.4em] uppercase">Collegiate Rankings</span>
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
              <Medal className="w-6 h-6 text-[#FFD700]" />
            </motion.div>
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-4">
            The <span className="text-[#FFD700]">Dominant</span> Force
          </h2>
          <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
            The most dominant collegiate esports programs across the nation
          </p>
        </motion.div>

        {/* Colleges List */}
        <div className="space-y-4">
          {colleges.map((college, index) => {
            const rankStyle = getRankColor(college.rank);
            
            return (
              <motion.div
                key={college.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100, rotateY: index % 2 === 0 ? -10 : 10 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ x: 10, scale: 1.01 }}
                className="group cursor-pointer"
              >
                <Card
                  className="relative overflow-hidden transition-all duration-500"
                  style={{
                    background: 'linear-gradient(135deg, #0F172A, #111827)',
                    borderColor: college.rank <= 3 ? `${rankStyle.border}30` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Animated background gradient */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, ${rankStyle.glow}, transparent, ${rankStyle.glow})`,
                    }}
                  />
                  
                  <div className="relative p-6">
                    <div className="flex items-center gap-6">
                      {/* Rank */}
                      <RankBadge rank={college.rank} color={rankStyle.border} />

                      {/* College Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-black uppercase italic text-white truncate group-hover:text-[#FF3B30] transition-colors tracking-tight">
                            {college.name}
                          </h3>
                          {college.rank <= 3 && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Trophy className="w-5 h-5 shrink-0" style={{ color: rankStyle.border }} />
                            </motion.div>
                          )}
                          <TrendIndicator trend={college.trend} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {college.badges.map((badge) => (
                            <Badge key={badge} variant="outline" className="border-[#FF3B30]/30 text-[#FF3B30] text-[10px] font-black uppercase italic">
                              <Zap className="w-3 h-3 mr-1" />
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden lg:flex items-center gap-10">
                        <motion.div
                          className="text-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <p className="text-3xl font-black italic text-white">{college.points}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Points</p>
                        </motion.div>
                        <motion.div
                          className="text-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <p className="text-3xl font-black italic text-[#22C55E]">{college.wins}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Wins</p>
                        </motion.div>
                        <motion.div
                          className="text-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <p className="text-3xl font-black italic text-white">{college.tournaments}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Tournaments</p>
                        </motion.div>
                      </div>

                      {/* Arrow */}
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronRight className="w-6 h-6 text-[#94A3B8] group-hover:text-white group-hover:translate-x-2 transition-all" />
                      </motion.div>
                    </div>

                    {/* Mobile Stats */}
                    <div className="flex lg:hidden items-center justify-around mt-6 pt-6 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{college.points}</p>
                        <p className="text-xs text-[#94A3B8]">Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#22C55E]">{college.wins}</p>
                        <p className="text-xs text-[#94A3B8]">Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{college.tournaments}</p>
                        <p className="text-xs text-[#94A3B8]">Tournaments</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 hover:border-[#FFD700]/30 px-8 py-6 text-lg group"
            >
              View Full Leaderboard
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ChevronRight className="w-5 h-5 ml-2" />
              </motion.span>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
