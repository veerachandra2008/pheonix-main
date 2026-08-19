'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const sponsors = [
  { name: 'NVIDIA', category: 'Technology', color: '#76B900' },
  { name: 'Razer', category: 'Peripherals', color: '#00FF00' },
  { name: 'HyperX', category: 'Audio', color: '#FF0000' },
  { name: 'ASUS ROG', category: 'Hardware', color: '#FF00FF' },
  { name: 'Logitech G', category: 'Peripherals', color: '#00B8FC' },
  { name: 'SteelSeries', category: 'Gaming Gear', color: '#FF6600' },
  { name: 'Corsair', category: 'Components', color: '#FFC107' },
  { name: 'Secretlab', category: 'Furniture', color: '#00D4AA' },
];

const games = [
  { name: 'VALORANT', color: '#FF4655' },
  { name: 'CS2', color: '#DE9B35' },
  { name: 'League of Legends', color: '#C89B3C' },
  { name: 'Apex Legends', color: '#DA292A' },
  { name: 'Overwatch 2', color: '#FA9C1E' },
  { name: 'Rocket League', color: '#0078F2' },
  { name: 'Fortnite', color: '#9D4DFF' },
  { name: 'Rainbow Six', color: '#3792D4' },
];

// Animated sponsor card
const SponsorCard = ({ sponsor, index }: { sponsor: typeof sponsors[0]; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -10, scale: 1.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group cursor-pointer"
    >
      <div className="relative p-8 rounded-2xl bg-[#0F172A]/50 border border-white/5 hover:border-white/20 transition-all duration-500 text-center overflow-hidden">
        {/* Color accent on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${sponsor.color}15 0%, transparent 70%)`,
          }}
        />
        
        {/* Top accent line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: sponsor.color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Sponsor icon placeholder */}
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center relative"
          style={{
            background: `${sponsor.color}15`,
            border: `1px solid ${sponsor.color}30`,
          }}
          animate={{ rotate: isHovered ? 360 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-2xl font-black" style={{ color: sponsor.color }}>
            {sponsor.name[0]}
          </span>
          
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ boxShadow: `0 0 20px ${sponsor.color}20` }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          />
        </motion.div>
        
        <p className="text-xl font-bold text-white group-hover:transition-colors mb-1" style={{ color: isHovered ? sponsor.color : 'white' }}>
          {sponsor.name}
        </p>
        <p className="text-xs text-[#94A3B8] uppercase tracking-wider">{sponsor.category}</p>
      </div>
    </motion.div>
  );
};

// Marquee component
const GameMarquee = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isPaused) return;
    
    const animation = setInterval(() => {
      setPosition(prev => prev - 1);
    }, 30);
    
    return () => clearInterval(animation);
  }, [isPaused]);
  
  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0f1a] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0f1a] to-transparent z-10" />
      
      <motion.div
        ref={containerRef}
        className="flex gap-4"
        animate={{ x: [0, -1200] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 25,
            ease: "linear",
          },
        }}
      >
        {[...games, ...games, ...games].map((game, index) => (
          <motion.div
            key={`${game.name}-${index}`}
            className="shrink-0 px-6 py-3 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            whileHover={{
              scale: 1.1,
              borderColor: game.color,
              boxShadow: `0 0 20px ${game.color}20`,
            }}
          >
            <span className="font-medium whitespace-nowrap text-[#CBD5E1]">{game.name}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default function SponsorsShowcase() {
  return (
    <section className="relative py-24 bg-[#0a0f1a] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14] via-transparent to-[#070B14]" />
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,59,48,0.3), transparent)',
          }}
          animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sponsors Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-4"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring" }}
          >
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#FF3B30]" />
            <span className="text-[#94A3B8] text-sm font-medium tracking-widest uppercase">Powered By Industry Leaders</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#FF3B30]" />
          </motion.div>
        </motion.div>

        {/* Sponsors Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {sponsors.map((sponsor, index) => (
            <SponsorCard key={index} sponsor={sponsor} index={index} />
          ))}
        </div>

        {/* Supported Games Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <span className="text-[#94A3B8] text-sm font-medium tracking-widest uppercase">
            Supported Games
          </span>
        </motion.div>

        {/* Games Marquee */}
        <GameMarquee />
      </div>
    </section>
  );
}
