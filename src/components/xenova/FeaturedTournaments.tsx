'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Users, Trophy, Flame, Clock, ArrowRight, Play } from 'lucide-react';

interface Tournament {
  id: number;
  name: string;
  game: string;
  prize: string;
  date: string;
  status: 'live' | 'upcoming' | 'completed';
  teams: number;
  maxTeams: number;
  image: string;
  featured?: boolean;
  color: string;
}

const tournaments: Tournament[] = [
  { 
    id: 1, 
    name: 'XENOVA Championship 2024', 
    game: 'VALORANT', 
    prize: '$100,000', 
    date: 'Jan 15-20', 
    status: 'live', 
    teams: 32, 
    maxTeams: 32, 
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0b?w=400&h=300&fit=crop',
    featured: true, 
    color: '#FF4655' 
  },
  { 
    id: 2, 
    name: 'Collegiate League Finals', 
    game: 'League of Legends', 
    prize: '$50,000', 
    date: 'Jan 22-25', 
    status: 'upcoming', 
    teams: 28, 
    maxTeams: 32, 
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
    color: '#C89B3C' 
  },
  { 
    id: 3, 
    name: 'Apex Predator Cup', 
    game: 'Apex Legends', 
    prize: '$25,000', 
    date: 'Jan 28', 
    status: 'upcoming', 
    teams: 45, 
    maxTeams: 64, 
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
    color: '#DA292A' 
  },
  { 
    id: 4, 
    name: 'Counter-Strike Masters', 
    game: 'CS2', 
    prize: '$75,000', 
    date: 'Feb 1-5', 
    status: 'upcoming', 
    teams: 24, 
    maxTeams: 32, 
    image: 'https://images.unsplash.com/photo-1493711662062-fa541f7f2f19?w=400&h=300&fit=crop',
    color: '#DE9B35' 
  },
  { 
    id: 5, 
    name: 'Rocket League Rumble', 
    game: 'Rocket League', 
    prize: '$15,000', 
    date: 'Feb 8', 
    status: 'upcoming', 
    teams: 40, 
    maxTeams: 48, 
    image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=300&fit=crop',
    color: '#0078F2' 
  },
  { 
    id: 6, 
    name: 'Overwatch Collegiate', 
    game: 'Overwatch 2', 
    prize: '$30,000', 
    date: 'Feb 12-15', 
    status: 'upcoming', 
    teams: 20, 
    maxTeams: 24, 
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
    color: '#FA9C1E' 
  },
];

// Tournament Card Component (simplified without parallax)
const TournamentCard = ({ tournament, isActive }: { tournament: Tournament; isActive: boolean }) => {
  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse">
            <span className="w-2 h-2 bg-[#FF3B30] rounded-full mr-1.5 animate-pulse" />
            LIVE
          </Badge>
        );
      case 'upcoming':
        return <Badge className="bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30">UPCOMING</Badge>;
      case 'completed':
        return <Badge className="bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">COMPLETED</Badge>;
    }
  };

  return (
    <motion.div
      className="relative w-full h-full"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#111827] border border-white/5 hover:border-[#FF3B30]/30 transition-all duration-500 h-full">
        {/* Game color accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: tournament.color }}
        />
        
        {/* Game Image Background */}
        <div className="relative h-48 overflow-hidden">
          <motion.img 
            src={tournament.image} 
            alt={tournament.game}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.7) saturate(1.2)' }}
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            {getStatusBadge(tournament.status)}
          </div>
          
          {/* Featured Badge */}
          {tournament.featured && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30">
                <Flame className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
        </div>
        
        <div className="relative p-6">
          {/* Game Badge */}
          <Badge
            variant="outline"
            className="border-white/10 text-[#CBD5E1] mb-3"
            style={{ borderColor: `${tournament.color}40` }}
          >
            {tournament.game}
          </Badge>
          
          {/* Name */}
          <h3 className="text-xl font-black uppercase italic text-white mb-4 group-hover:text-[#FF3B30] transition-colors tracking-tight">
            {tournament.name}
          </h3>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <motion.div
              className="text-center p-3 rounded-lg bg-white/5"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-lg font-bold" style={{ color: tournament.color }}>{tournament.prize}</p>
              <p className="text-xs text-[#94A3B8]">Prize</p>
            </motion.div>
            <motion.div
              className="text-center p-3 rounded-lg bg-white/5"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-lg font-bold text-white">{tournament.teams}/{tournament.maxTeams}</p>
              <p className="text-xs text-[#94A3B8]">Teams</p>
            </motion.div>
            <motion.div
              className="text-center p-3 rounded-lg bg-white/5"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <p className="text-lg font-bold text-white">{tournament.date.split('-')[0]}</p>
              <p className="text-xs text-[#94A3B8]">Date</p>
            </motion.div>
          </div>
          
          {/* Action Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full text-white font-semibold"
              style={{ background: `linear-gradient(135deg, ${tournament.color}, ${tournament.color}CC)` }}
            >
              {tournament.status === 'live' ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Watch Now
                </>
              ) : (
                <>
                  Register Team
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function FeaturedTournaments() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % tournaments.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % tournaments.length);
    setIsAutoPlay(false);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + tournaments.length) % tournaments.length);
    setIsAutoPlay(false);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <section className="relative py-24 bg-[#070B14] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/50 via-transparent to-[#0F172A]/50" />
        {/* Static ambient orb — removed infinite scale/opacity animation */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255,59,48,0.1) 0%, transparent 60%)',
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
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-4"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#FF3B30]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Trophy className="w-6 h-6 text-[#FF3B30]" />
            </motion.div>
            <span className="text-[#CBD5E1] text-sm font-medium tracking-widest uppercase">Compete For Glory</span>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#FF3B30]" />
          </motion.div>
          
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic text-white mb-4 tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Live <span className="text-[#FF3B30]">Arena</span>
          </motion.h2>
          
          <motion.p
            className="text-[#94A3B8] text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Battle against the best collegiate teams for massive prize pools and eternal glory
          </motion.p>
        </motion.div>

        {/* Main Carousel */}
        <div className="relative mb-12">
          {/* Navigation Arrows */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-[#FF3B30]/30 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-[#FF3B30]/30 transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>

          {/* Carousel Container */}
          <div className="overflow-hidden px-16 py-8">
            <div className="relative h-[520px]">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.3 },
                  }}
                  className="absolute inset-0"
                >
                  <TournamentCard
                    tournament={tournaments[currentIndex]}
                    isActive={true}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {tournaments.map((_, idx) => (
              <motion.button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                  setIsAutoPlay(false);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-8 bg-gradient-to-r from-[#FF3B30] to-[#F97316]'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        </div>

        {/* Tournament Grid Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {tournaments.slice(1, 4).map((tournament, index) => (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group cursor-pointer"
            >
              <Card className="relative overflow-hidden bg-[#0F172A]/50 border border-white/5 hover:border-white/20 transition-all duration-300 h-full">
                {/* Game Image */}
                <div className="relative h-32 overflow-hidden">
                  <img 
                    src={tournament.image} 
                    alt={tournament.game}
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(0.7)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] to-transparent" />
                </div>
                
                {/* Top color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: tournament.color }}
                />
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className="border-white/10 text-[#CBD5E1] text-xs">
                      {tournament.game}
                    </Badge>
                    <div className="flex items-center gap-2 text-[#94A3B8] text-xs">
                      <Users className="w-3 h-3" />
                      {tournament.teams} teams
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-3 group-hover:text-[#FF3B30] transition-colors">
                    {tournament.name}
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                      <Clock className="w-4 h-4" />
                      {tournament.date}
                    </div>
                    <span className="font-bold" style={{ color: tournament.color }}>
                      {tournament.prize}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 hover:border-[#FF3B30]/30 px-8 py-6 text-lg group"
            >
              View All Tournaments
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5 ml-2" />
              </motion.span>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
