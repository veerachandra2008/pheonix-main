'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, ArrowRight, Play, Gamepad2 } from 'lucide-react';

interface Game {
  id: number;
  name: string;
  fullName: string;
  image: string;
  color: string;
  players: string;
  tournaments: number;
  prizePool: string;
  genre: string;
}

const games: Game[] = [
  {
    id: 1,
    name: 'Free Fire',
    fullName: 'Garena Free Fire',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
    color: '#FF6B00',
    players: '150M+',
    tournaments: 45,
    prizePool: '$2M+',
    genre: 'Battle Royale'
  },
  {
    id: 2,
    name: 'PUBG',
    fullName: 'PUBG: Battlegrounds',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
    color: '#F2A900',
    players: '400M+',
    tournaments: 120,
    prizePool: '$10M+',
    genre: 'Battle Royale'
  },
  {
    id: 3,
    name: 'VALORANT',
    fullName: 'Valorant',
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0b?w=400&h=300&fit=crop',
    color: '#FF4655',
    players: '20M+',
    tournaments: 85,
    prizePool: '$15M+',
    genre: 'Tactical Shooter'
  },
  {
    id: 4,
    name: 'Call of Duty',
    fullName: 'Call of Duty: Mobile',
    image: 'https://images.unsplash.com/photo-1493711662062-fa541f7f2f19?w=400&h=300&fit=crop',
    color: '#20B2AA',
    players: '500M+',
    tournaments: 200,
    prizePool: '$25M+',
    genre: 'FPS'
  }
];

const GameCard = ({ game, index }: { game: Game; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      whileHover={{ y: -10 }}
      className="group relative"
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#111827] border border-white/5 hover:border-white/20 transition-all duration-500 h-full">
        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${game.color}20 0%, transparent 50%)`
          }}
        />
        
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
          style={{ background: game.color }}
        />
        
        {/* Game Image */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-b from-[#1e293b] to-[#0F172A]">
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${game.color} 0%, transparent 70%)`
            }}
          />
          <motion.img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-cover relative z-10"
            style={{ filter: `brightness(0.7) saturate(1.2)` }}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.4 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent z-10" />
          
          {/* Genre Badge */}
          <div className="absolute top-4 right-4 z-20">
            <Badge 
              className="bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs"
            >
              {game.genre}
            </Badge>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Game Name */}
          <h3 className="text-2xl font-black uppercase italic text-white mb-1 group-hover:text-[#FF3B30] transition-colors tracking-tight">
            {game.name}
          </h3>
          <p className="text-sm text-[#64748B] mb-4">{game.fullName}</p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <motion.div 
              className="text-center p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <p className="text-lg font-bold text-white">{game.players}</p>
              <p className="text-xs text-[#94A3B8]">Players</p>
            </motion.div>
            <motion.div 
              className="text-center p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <p className="text-lg font-bold" style={{ color: game.color }}>{game.tournaments}</p>
              <p className="text-xs text-[#94A3B8]">Tournaments</p>
            </motion.div>
            <motion.div 
              className="text-center p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <p className="text-lg font-bold text-[#22C55E]">{game.prizePool}</p>
              <p className="text-xs text-[#94A3B8]">Prize Pool</p>
            </motion.div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 text-white font-semibold"
              style={{ background: `linear-gradient(135deg, ${game.color}, ${game.color}CC)` }}
            >
              <Play className="w-4 h-4 mr-2" />
              Play Now
            </Button>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Trophy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function FeaturedGames() {
  return (
    <section className="relative py-24 bg-[#070B14] overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/30 via-transparent to-[#0F172A]/30" />
        
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute left-1/4 top-1/4 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,70,85,0.1) 0%, transparent 60%)',
            filter: 'blur(60px)'
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-1/4 bottom-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 60%)',
            filter: 'blur(60px)'
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
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
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Gamepad2 className="w-6 h-6 text-[#FF3B30]" />
            </motion.div>
            <span className="text-[#CBD5E1] text-sm font-medium tracking-widest uppercase">Choose Your Battlefield</span>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#FF3B30]" />
          </motion.div>
          
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic text-white mb-4 tracking-tighter"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Featured <span className="text-[#FF3B30] not-italic">Games</span>
          </motion.h2>
          
          <motion.p
            className="text-[#94A3B8] text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Compete in the most popular esports titles and prove your dominance across multiple battlegrounds
          </motion.p>
        </motion.div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game, index) => (
            <GameCard key={game.id} game={game} index={index} />
          ))}
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { label: 'Active Games', value: '50+' },
            { label: 'Daily Tournaments', value: '200+' },
            { label: 'Total Prize Pool', value: '$50M+' },
            { label: 'Active Players', value: '1M+' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              className="text-center p-6 rounded-xl bg-white/5 border border-white/5"
            >
              <motion.p
                className="text-3xl font-bold text-[#FF3B30] mb-2"
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-[#94A3B8] text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Games Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 hover:border-[#FF3B30]/30 px-8 py-6 text-lg group"
            >
              Explore All Games
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
