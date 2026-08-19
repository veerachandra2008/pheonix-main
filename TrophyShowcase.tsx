"use client"
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from '@/components/icons';

export const TrophyShowcase = () => {
  const [particles, setParticles] = useState<{left: string, top: string, delay: number}[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Generate random positions only on the client
    const newParticles = [...Array(6)].map(() => ({
      left: `${Math.floor(Math.random() * 90)}%`,
      top: `${Math.floor(Math.random() * 80)}%`,
      delay: Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  return (
    <section className="relative p-20 bg-zinc-950 overflow-hidden min-h-[500px] border-t border-zinc-800">
      <div className="relative z-10 text-center">
        <h2 className="text-5xl font-black uppercase mb-4">The Trophy Room</h2>
        <p className="text-zinc-400">Where legends are immortalized.</p>
      </div>

      {/* Floating trophy particles - Only rendered after mount to prevent hydration error */}
      {isMounted && particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute text-blue-500/20"
          style={{ left: p.left, top: p.top }}
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            delay: p.delay 
          }}
        >
          <Trophy className="w-12 h-12" />
        </motion.div>
      ))}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-black/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-blue-500 transition-all group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏆</div>
            <h3 className="text-xl font-bold uppercase">Inter-College Finals</h3>
            <p className="text-sm text-zinc-500 mt-2">Stanford vs MIT • Dec 2023</p>
          </div>
        ))}
      </div>
    </section>
  );
};
