'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, Trophy, Crown, Zap, Medal, ExternalLink, Flame } from 'lucide-react';

interface Player {
  id: number;
  name: string;
  tag: string;
  avatar: string;
  game: string;
  college: string;
  rank: number;
  rating: number;
  wins: number;
  earnings: string;
  role: string;
  trend: 'up' | 'down' | 'stable';
  streak: number;
}

const players: Player[] = [
  { id: 1, name: 'Alex Chen', tag: 'PhantomX', avatar: '', game: 'VALORANT', college: 'Stanford', rank: 1, rating: 2847, wins: 156, earnings: '$45,200', role: 'Duelist', trend: 'up', streak: 12 },
  { id: 2, name: 'Sarah Kim', tag: 'NightShadow', avatar: '', game: 'VALORANT', college: 'MIT', rank: 2, rating: 2792, wins: 142, earnings: '$38,500', role: 'Controller', trend: 'stable', streak: 8 },
  { id: 3, name: 'Marcus Johnson', tag: 'Blitz', avatar: '', game: 'CS2', college: 'UCLA', rank: 3, rating: 2756, wins: 138, earnings: '$42,100', role: 'AWPer', trend: 'up', streak: 15 },
  { id: 4, name: 'Emily Zhang', tag: 'Seraph', avatar: '', game: 'League of Legends', college: 'Berkeley', rank: 4, rating: 2701, wins: 125, earnings: '$35,800', role: 'Mid Laner', trend: 'down', streak: 5 },
  { id: 5, name: 'James Wilson', tag: 'Vortex', avatar: '', game: 'Apex Legends', college: 'Harvard', rank: 5, rating: 2689, wins: 118, earnings: '$28,400', role: 'IGL', trend: 'up', streak: 9 },
  { id: 6, name: 'Olivia Martinez', tag: 'Nova', avatar: '', game: 'VALORANT', college: 'UT Austin', rank: 6, rating: 2654, wins: 112, earnings: '$24,200', role: 'Sentinel', trend: 'stable', streak: 6 },
];

// 3D Player Card Component
const PlayerCard3D = ({ player, index, isActive }: { player: Player; index: number; isActive: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-150, 150], [15, -15]);
  const rotateY = useTransform(x, [-150, 150], [-15, 15]);
  
  const springConfig = { damping: 20, stiffness: 300 };
  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);
  
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return { gradient: 'from-[#FFD700] via-[#FFA500] to-[#FFD700]', color: '#FFD700', icon: Crown };
      case 2: return { gradient: 'from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0]', color: '#C0C0C0', icon: Trophy };
      case 3: return { gradient: 'from-[#CD7F32] via-[#B8860B] to-[#CD7F32]', color: '#CD7F32', icon: Medal };
      default: return { gradient: 'from-[#475569] via-[#64748B] to-[#475569]', color: '#64748B', icon: Star };
    }
  };

  const rankStyle = getRankStyle(player.rank);
  const RankIcon = rankStyle.icon;

  return (
    <motion.div
      ref={cardRef}
      className="relative w-[340px] h-[480px] shrink-0 cursor-grab active:cursor-grabbing"
      style={{
        // Only apply 3D spring when hovered — not on all 6 cards all the time
        rotateX: isHovered ? rotateXSpring : 0,
        rotateY: isHovered ? rotateYSpring : 0,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#111827] border border-white/5 hover:border-[#FF3B30]/30 transition-all duration-500">
        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-xl opacity-0 pointer-events-none"
          style={{
            background: `linear-gradient(45deg, ${rankStyle.color}20, transparent, ${rankStyle.color}20)`,
          }}
          animate={{ opacity: isHovered ? 0.4 : 0 }}
        />
        
        {/* Rank banner */}
        <div className={`absolute top-0 left-0 right-0 h-20 bg-gradient-to-b ${rankStyle.gradient} opacity-10`} />
        
        {/* Rank Badge */}
        <motion.div
          className="absolute top-4 right-4 z-20"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${rankStyle.gradient} flex items-center justify-center shadow-lg`}
            style={{ boxShadow: `0 0 30px ${rankStyle.color}40` }}
          >
            <RankIcon className="w-7 h-7 text-white" />
          </div>
        </motion.div>

        <div className="relative p-6 h-full flex flex-col">
          {/* Trend indicator */}
          <div className="absolute top-4 left-4">
            <motion.div
              animate={{ scale: player.trend === 'up' ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 1, repeat: player.trend === 'up' ? Infinity : 0 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                player.trend === 'up' ? 'bg-[#22C55E]/20 text-[#22C55E]' :
                player.trend === 'down' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' :
                'bg-white/10 text-[#94A3B8]'
              }`}
            >
              {player.trend === 'up' && <Zap className="w-3 h-3" />}
              {player.streak} streak
            </motion.div>
          </div>

          {/* Avatar */}
          <div className="relative mt-8 mb-6">
            <motion.div
              className="relative w-32 h-32 mx-auto"
              whileHover={{ scale: 1.1 }}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: rankStyle.color }}
                animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              {/* Avatar circle */}
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-4 flex items-center justify-center overflow-hidden"
                style={{ borderColor: `${rankStyle.color}60` }}
              >
                <motion.span
                  className="text-5xl font-black text-white italic"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                >
                  {player.name[0]}
                </motion.span>
              </div>
              
              {/* Online indicator */}
              <motion.div
                className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#22C55E] border-2 border-[#0F172A]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Player Info */}
          <div className="text-center mb-4">
            <motion.h3
              className="text-2xl font-black uppercase italic text-white mb-0 tracking-tighter"
              whileHover={{ color: '#FF3B30' }}
            >
              {player.name}
            </motion.h3>
            <p className="text-[#FF3B30] font-black uppercase text-sm tracking-widest">@{player.tag}</p>
          </div>

          {/* Game & Role */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="border-[#FF3B30]/30 text-[#FF3B30] px-3 py-1 font-black italic uppercase text-[10px]"
            >
              {player.game}
            </Badge>
            <Badge
              variant="outline"
              className="border-[#7C3AED]/30 text-[#7C3AED] px-3 py-1 font-black italic uppercase text-[10px]"
            >
              {player.role}
            </Badge>
          </div>

          {/* College */}
          <p className="text-center text-[#94A3B8] text-xs font-bold uppercase tracking-widest mb-4">{player.college}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-white/5">
            <motion.div
              className="text-center p-2 rounded-lg bg-white/5"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-xl font-black text-white">{player.rating}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Rating</p>
            </motion.div>
            <motion.div
              className="text-center p-2 rounded-lg bg-white/5"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-xl font-black text-[#22C55E]">{player.wins}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Wins</p>
            </motion.div>
            <motion.div
              className="text-center p-2 rounded-lg bg-white/5"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-xl font-black text-[#F97316]">{player.earnings}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Earned</p>
            </motion.div>
          </div>

          {/* View Profile Button */}
          <motion.div
            className="mt-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              className="w-full border-white/10 text-white hover:bg-white/5 hover:border-[#FF3B30]/30 group uppercase font-black tracking-widest italic"
            >
              View Profile
              <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function FeaturedPlayers() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 360;
      const newScrollLeft = containerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      containerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-24 bg-[#0a0f1a] overflow-hidden">
      {/* Static ambient background — removed heavy animated orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-0 top-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 50%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute right-0 bottom-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(255,59,48,0.12) 0%, transparent 50%)',
            filter: 'blur(80px)',
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
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Flame className="w-6 h-6 text-[#F97316]" />
              </motion.div>
              <span className="text-slate-500 text-xs font-black tracking-[0.4em] uppercase">Elite Competitors</span>
            </motion.div>
            <motion.h2
              className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              PRO <span className="text-[#FF3B30]">LEADERBOARD</span>
            </motion.h2>
          </div>
          
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                canScrollLeft
                  ? 'border-white/10 text-white hover:bg-white/5 hover:border-[#FF3B30]/30'
                  : 'border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                canScrollRight
                  ? 'border-white/10 text-white hover:bg-white/5 hover:border-[#FF3B30]/30'
                  : 'border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Players Carousel */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0f1a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0f1a] to-transparent z-10 pointer-events-none" />
          
          <div
            ref={containerRef}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {players.map((player, index) => (
              <PlayerCard3D
                key={player.id}
                player={player}
                index={index}
                isActive={false}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 hover:border-[#FF3B30]/30 px-8 py-6 text-lg"
            >
              View All Players
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
