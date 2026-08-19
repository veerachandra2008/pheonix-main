'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, Medal, Star, Award, Target, Zap, Users, Calendar, ChevronRight, TrendingUp, Flame } from 'lucide-react';

interface Achievement {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  gradient: string;
}

const achievements: Achievement[] = [
  { icon: Trophy, title: 'Championships', value: '150+', subtitle: 'Tournaments Completed', color: 'text-[#FFD700]', gradient: 'from-[#FFD700]/20 to-[#FFD700]/5' },
  { icon: Users, title: 'Players', value: '50,000+', subtitle: 'Active Competitors', color: 'text-[#FF3B30]', gradient: 'from-[#FF3B30]/20 to-[#FF3B30]/5' },
  { icon: Award, title: 'Prizes Awarded', value: '$2.5M+', subtitle: 'Total Distributed', color: 'text-[#22C55E]', gradient: 'from-[#22C55E]/20 to-[#22C55E]/5' },
  { icon: Target, title: 'Universities', value: '200+', subtitle: 'Participating Schools', color: 'text-[#2563EB]', gradient: 'from-[#2563EB]/20 to-[#2563EB]/5' },
];

const trophies = [
  { rank: 1, name: 'XENOVA Championship 2024', game: 'VALORANT', team: 'Stanford Eagles', prize: '$100,000', wins: 42, color: '#FFD700' },
  { rank: 2, name: 'Collegiate League Finals', game: 'League of Legends', team: 'MIT Phoenix', prize: '$50,000', wins: 38, color: '#C0C0C0' },
  { rank: 3, name: 'Apex Predator Cup', game: 'Apex Legends', team: 'UCLA Titans', prize: '$25,000', wins: 35, color: '#CD7F32' },
];

// Counter animation
const CountUp = ({ value, duration = 2 }: { value: string; duration?: number }) => (
  <motion.span
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="tabular-nums"
  >
    {value}
  </motion.span>
);

export function TrophyShowcase() {
  return (
    <section className="relative py-24 bg-[#070B14] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/30 via-transparent to-[#0F172A]/30" />
        
        {/* Static concentric rings — no animation to reduce GPU compositing layers */}
        {[400, 600, 800].map((size) => (
          <div
            key={size}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]"
            style={{ width: size, height: size }}
          />
        ))}
        
        {/* Floating trophy particles — CSS-only animation */}
        <style>{`
          @keyframes trophy-float {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.1; }
            50%       { transform: translateY(-30px) rotate(180deg); opacity: 0.3; }
          }
        `}</style>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animation: `trophy-float ${8 + i * 2}s ease-in-out ${i}s infinite`,
            }}
          >
            <Trophy className="w-4 h-4 text-[#FFD700]/20" />
          </div>
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
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#F97316] mb-8 relative"
          >
            <Trophy className="w-12 h-12 text-white" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: '0 0 40px rgba(255,215,0,0.4)' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-4">
          Hall of <span className="text-[#FFD700]">Champions</span>
          </h2>
          <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
            Celebrating excellence in collegiate esports
          </p>
        </motion.div>

        {/* Achievement Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${achievement.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative text-center p-8">
                  {/* Static icon — removed infinite scale pulse */}
                  <Icon className={`w-10 h-10 ${achievement.color} mx-auto mb-4`} />
                  <p className="text-4xl font-bold text-white mb-2">
                    <CountUp value={achievement.value} />
                  </p>
                  <p className="text-[#CBD5E1] font-semibold mb-1">{achievement.title}</p>
                  <p className="text-[#94A3B8] text-sm">{achievement.subtitle}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Champions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Crown className="w-6 h-6 text-[#FFD700]" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white">Recent Champions</h3>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Crown className="w-6 h-6 text-[#FFD700]" />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trophies.map((trophy, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, rotateX: 15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -15, scale: 1.03 }}
                className="group cursor-pointer"
              >
                <div
                  className="relative p-8 rounded-2xl border overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${trophy.color}15 0%, #0F172A 100%)`,
                    borderColor: `${trophy.color}40`,
                  }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(45deg, transparent, ${trophy.color}10, transparent)`,
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                  
                  {/* Rank Badge */}
                  <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.2, type: "spring" }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${trophy.color}, ${trophy.color}CC)`,
                        boxShadow: `0 0 20px ${trophy.color}40`,
                      }}
                    >
                      <span className="text-sm font-black text-black">{trophy.rank}</span>
                    </div>
                  </motion.div>

                  <div className="text-center pt-4">
                    {/* CSS spin trophy icon — no Framer Motion rotateY which forces GPU layer per element */}
                    <style>{`.trophy-spin { animation: trophy-spin-y 20s linear infinite; } @keyframes trophy-spin-y { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }`}</style>
                    <div className="trophy-spin inline-block mb-4">
                      <Trophy className="w-14 h-14 mx-auto" style={{ color: trophy.color }} />
                    </div>
                    
                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-[#FF3B30] transition-colors">
                      {trophy.name}
                    </h4>
                    <p className="text-[#94A3B8] mb-4">{trophy.game}</p>
                    
                    <div className="pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[#CBD5E1] font-semibold">{trophy.team}</p>
                        <div className="flex items-center gap-1 text-[#22C55E] text-sm">
                          <TrendingUp className="w-3 h-3" />
                          {trophy.wins}W
                        </div>
                      </div>
                      {/* Static prize text — removed infinite scale pulse */}
                      <p
                        className="text-2xl font-black"
                        style={{ color: trophy.color }}
                      >
                        {trophy.prize}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default TrophyShowcase;
