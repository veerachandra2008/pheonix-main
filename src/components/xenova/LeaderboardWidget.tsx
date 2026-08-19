'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Trophy, Maximize2, X, Gamepad2, Flame, Shield, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  image: string;
  aspectRatio: string;
  gridSpan: string;
  colSpan?: string;
  rowSpan?: string;
}

const galleryItems: GalleryItem[] = [
  // COLUMN 1
  {
    id: '1',
    title: 'NATIONAL CHAMPIONS',
    subtitle: 'Collegiate Varsity League • Grand Finals',
    category: 'VARSITY TROPHY',
    image: '/gallery-trophy.png',
    aspectRatio: 'h-[520px]',
    gridSpan: 'lg:col-span-4 lg:row-span-2',
  },
  {
    id: '2',
    title: 'THE CLUTCH MOMENT',
    subtitle: '5v5 Valorant Tactical • Bind Map',
    category: 'LIVE PLAY',
    image: '/hero-arena.jpg',
    aspectRatio: 'h-[300px]',
    gridSpan: 'lg:col-span-4',
  },
  {
    id: '3',
    title: 'CAMPUS RIVALRY',
    subtitle: 'IIT Bombay vs BITS Pilani',
    category: 'VARSITY LEAGUE',
    image: '/apex.jpg',
    aspectRatio: 'h-[260px]',
    gridSpan: 'lg:col-span-4',
  },

  // COLUMN 2
  {
    id: '4',
    title: 'CS2 DEFUSE ARENA',
    subtitle: 'Anna University Stadium LAN',
    category: 'CS2 CHAMPIONSHIP',
    image: '/cs2.jpg',
    aspectRatio: 'h-[280px]',
    gridSpan: 'lg:col-span-4',
  },
  {
    id: '5',
    title: 'PRO GAMER FOCUS',
    subtitle: 'Verified Athlete Telemetry • 240Hz Arena',
    category: 'PLAYER PORTRAIT',
    image: '/gallery-gamer.png',
    aspectRatio: 'h-[380px]',
    gridSpan: 'lg:col-span-4 lg:row-span-2',
  },
  {
    id: '6',
    title: 'COLLEGIATE STADIUM',
    subtitle: 'Packed Audience • 5,000 Varsity Fans',
    category: 'ARENA STAGE',
    image: '/gallery-arena.png',
    aspectRatio: 'h-[280px]',
    gridSpan: 'lg:col-span-4',
  },

  // COLUMN 3
  {
    id: '7',
    title: 'TACTICAL DISCIPLINE',
    subtitle: 'VALORANT Champions League',
    category: 'LIVE STREAM',
    image: '/valorant.jpg',
    aspectRatio: 'h-[260px]',
    gridSpan: 'lg:col-span-4',
  },
  {
    id: '8',
    title: 'BGMI SQUAD WARFARE',
    subtitle: 'Delhi University Esports Hub',
    category: 'BATTLE ROYALE',
    image: '/bgmi.jpg',
    aspectRatio: 'h-[300px]',
    gridSpan: 'lg:col-span-4',
  },
  {
    id: '9',
    title: 'VICTORY CELEBRATION',
    subtitle: 'Team Titans • 7-Match Win Streak',
    category: 'VARSITY TEAM',
    image: '/gallery-team.png',
    aspectRatio: 'h-[520px]',
    gridSpan: 'lg:col-span-4 lg:row-span-2',
  },
];

export default function LeaderboardWidget() {
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  return (
    <section className="py-24 md:py-32 bg-black text-white relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest mb-3 backdrop-blur-md">
              <Camera className="w-4 h-4 text-emerald-400" /> Real Play Esports Gallery
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase">
              Collegiate Action Archive
            </h2>
            <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-xl">
              Authentic tournament moments, high-stakes LAN arena stages, and verified athlete portraits from collegiate leagues across India.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              9 FULL 4K TILES
            </span>
          </div>
        </div>

        {/* 📸 GALLERY GRID (EXACT REFERENCE LAYOUT COMPOSITION) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 auto-rows-[220px] sm:auto-rows-[260px]">
          
          {/* TILE 1: Left Tall Hero Tile (Spans 4 Cols, 2 Rows) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            onClick={() => setActiveItem(galleryItems[0])}
            className="lg:col-span-4 lg:row-span-2 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[0].image}
              alt={galleryItems[0].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 text-center space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[0].title}
              </h3>
              <p className="text-xs text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[0].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 4: Center Top Wide Tile (Spans 4 Cols, 1 Row) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            onClick={() => setActiveItem(galleryItems[3])}
            className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[3].image}
              alt={galleryItems[3].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute bottom-5 left-5 right-5 text-center space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[3].title}
              </h3>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[3].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 7: Right Top Square Tile (Spans 4 Cols, 1 Row) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onClick={() => setActiveItem(galleryItems[6])}
            className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[6].image}
              alt={galleryItems[6].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute bottom-5 left-5 right-5 text-center space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[6].title}
              </h3>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[6].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 5: Center Middle Tall Tile (Spans 4 Cols, 2 Rows) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            onClick={() => setActiveItem(galleryItems[4])}
            className="lg:col-span-4 lg:row-span-2 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[4].image}
              alt={galleryItems[4].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 text-center space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[4].title}
              </h3>
              <p className="text-xs text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[4].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 8: Right Middle Square Tile (Spans 4 Cols, 1 Row) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => setActiveItem(galleryItems[7])}
            className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[7].image}
              alt={galleryItems[7].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute bottom-5 left-5 right-5 text-center space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[7].title}
              </h3>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[7].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 2: Left Middle Square Tile (Spans 4 Cols, 1 Row) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            onClick={() => setActiveItem(galleryItems[1])}
            className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[1].image}
              alt={galleryItems[1].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute bottom-5 left-5 right-5 text-center space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[1].title}
              </h3>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[1].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 3: Left Bottom Tile (Spans 4 Cols, 1 Row) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => setActiveItem(galleryItems[2])}
            className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[2].image}
              alt={galleryItems[2].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute bottom-5 left-5 right-5 text-center space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[2].title}
              </h3>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[2].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 6: Center Bottom Tile (Spans 4 Cols, 1 Row) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 }}
            onClick={() => setActiveItem(galleryItems[5])}
            className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[5].image}
              alt={galleryItems[5].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute bottom-5 left-5 right-5 text-center space-y-1">
              <h3 className="text-xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[5].title}
              </h3>
              <p className="text-[11px] text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[5].subtitle}
              </p>
            </div>
          </motion.div>

          {/* TILE 9: Right Bottom Tall Hero Tile (Spans 4 Cols, 2 Rows) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            onClick={() => setActiveItem(galleryItems[8])}
            className="lg:col-span-4 lg:row-span-2 relative group overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] cursor-pointer"
          >
            <img
              src={galleryItems[8].image}
              alt={galleryItems[8].title}
              className="w-full h-full object-cover filter saturate-125 brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300" />
            <div className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 text-center space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                {galleryItems[8].title}
              </h3>
              <p className="text-xs text-zinc-300 font-bold uppercase tracking-widest">
                {galleryItems[8].subtitle}
              </p>
            </div>
          </motion.div>

        </div>

      </div>

      {/* 🔍 LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveItem(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl p-4 sm:p-8 flex items-center justify-center cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full max-h-[90vh] rounded-3xl overflow-hidden border border-white/20 bg-black shadow-2xl flex flex-col cursor-default"
            >
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/80 text-white hover:bg-emerald-500 hover:text-zinc-950 transition border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative w-full h-[60vh] sm:h-[70vh] bg-black">
                <img
                  src={activeItem.image}
                  alt={activeItem.title}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="p-6 sm:p-8 bg-[#09090b] border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">
                    {activeItem.category}
                  </span>
                  <h3 className="text-2xl font-black uppercase text-white tracking-wide mt-0.5">
                    {activeItem.title}
                  </h3>
                  <p className="text-xs text-zinc-400">{activeItem.subtitle}</p>
                </div>

                <Link
                  href="/tournaments"
                  onClick={() => setActiveItem(null)}
                  className="blob-btn px-6 py-3 rounded-2xl bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider transition shadow-lg inline-flex items-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4 fill-zinc-950" /> Explore Tournaments
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
