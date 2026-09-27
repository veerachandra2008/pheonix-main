'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ShieldCheck, ExternalLink, Flame, Users, Building2 } from 'lucide-react';
import Link from 'next/link';

interface Player {
  id: number;
  name: string;
  tag: string;
  avatar: string;
  game: string;
  college: string;
  role: string;
  status: string;
}

const verifiedAthletes: Player[] = [
  { id: 1, name: 'Aarav Sharma', tag: 'Vortex', avatar: '', game: 'VALORANT', college: 'IIT Bombay', role: 'Duelist', status: 'Active' },
  { id: 2, name: 'Rohan Verma', tag: 'Shadow', avatar: '', game: 'VALORANT', college: 'BITS Pilani', role: 'Controller', status: 'Active' },
  { id: 3, name: 'Kavya Nair', tag: 'Blitz', avatar: '', game: 'CS2', college: 'VIT Vellore', role: 'Entry Fragger', status: 'Active' },
  { id: 4, name: 'Aditya Patel', tag: 'Spectre', avatar: '', game: 'BGMI', college: 'DTU Delhi', role: 'Assaulter', status: 'Active' },
  { id: 5, name: 'Ananya Roy', tag: 'Nova', avatar: '', game: 'VALORANT', college: 'MIT Manipal', role: 'Initiator', status: 'Active' },
  { id: 6, name: 'Vikram Rao', tag: 'Phantom', avatar: '', game: 'CS2', college: 'IIT Delhi', role: 'AWPer', status: 'Active' },
];

// 3D Player Card Component
const PlayerCard3D = ({ player, index }: { player: Player; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-150, 150], [12, -12]);
  const rotateY = useTransform(x, [-150, 150], [-12, 12]);
  
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

  return (
    <motion.div
      ref={cardRef}
      className="relative w-[340px] h-[480px] shrink-0 cursor-grab active:cursor-grabbing"
      style={{
        rotateX: isHovered ? rotateXSpring : 0,
        rotateY: isHovered ? rotateYSpring : 0,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card className="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#111827] border border-white/10 hover:border-emerald-500/40 transition-all duration-500">
        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-xl opacity-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, rgba(16,185,129,0.15), transparent, rgba(16,185,129,0.15))',
          }}
          animate={{ opacity: isHovered ? 0.5 : 0 }}
        />
        
        {/* Verified Badge */}
        <div className="absolute top-4 right-4 z-20">
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Verified</span>
          </div>
        </div>

        <div className="relative p-6 h-full flex flex-col">
          {/* Athlete Circuit Tag */}
          <div className="absolute top-4 left-4">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-zinc-400 uppercase">
              Collegiate Circuit
            </span>
          </div>

          {/* Avatar */}
          <div className="relative mt-8 mb-6">
            <motion.div
              className="relative w-32 h-32 mx-auto"
              whileHover={{ scale: 1.08 }}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl bg-emerald-500/20"
                animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              {/* Avatar circle */}
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-emerald-500/40 flex items-center justify-center overflow-hidden">
                <span className="text-4xl font-black text-white italic">
                  {player.name[0]}
                </span>
              </div>
              
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0F172A]" />
            </motion.div>
          </div>

          {/* Player Info */}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-black uppercase text-white mb-0 tracking-tight">
              {player.name}
            </h3>
            <p className="text-emerald-400 font-bold uppercase text-xs tracking-widest mt-0.5">@{player.tag}</p>
          </div>

          {/* Game & Role */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 px-3 py-1 font-black uppercase text-[10px]"
            >
              {player.game}
            </Badge>
            <Badge
              variant="outline"
              className="border-white/15 text-zinc-300 px-3 py-1 font-bold uppercase text-[10px]"
            >
              {player.role}
            </Badge>
          </div>

          {/* College */}
          <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>{player.college}</span>
          </div>

          {/* Authentic Info Grid */}
          <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/10">
            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs font-black text-white">{player.college}</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Campus</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs font-black text-emerald-400">{player.status}</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Status</p>
            </div>
          </div>

          {/* View Profile Button */}
          <div className="mt-4">
            <Link href="/players" className="w-full block">
              <Button
                variant="outline"
                className="w-full border-white/15 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition group uppercase font-black tracking-widest text-xs py-2.5"
              >
                View Profile
                <ExternalLink className="w-3.5 h-3.5 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
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
    <section className="relative py-24 bg-black overflow-hidden border-t border-zinc-900">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-emerald-400" />
              <span className="text-zinc-500 text-xs font-black tracking-[0.3em] uppercase">Collegiate Athletes</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              VARSITY <span className="text-emerald-400">ATHLETES</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                canScrollLeft
                  ? 'border-white/20 text-white hover:bg-white/10 hover:border-emerald-400'
                  : 'border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                canScrollRight
                  ? 'border-white/20 text-white hover:bg-white/10 hover:border-emerald-400'
                  : 'border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Players Carousel */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          
          <div
            ref={containerRef}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {verifiedAthletes.map((player, index) => (
              <PlayerCard3D
                key={player.id}
                player={player}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link href="/players">
            <Button
              variant="outline"
              className="border-white/15 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-500 px-8 py-6 text-sm font-black uppercase tracking-wider transition"
            >
              <Users className="w-4 h-4 mr-2" />
              View All Athletes
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
