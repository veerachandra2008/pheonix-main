'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown, Play, Users, Trophy, Zap, Gamepad2, Swords, Target, Flame } from 'lucide-react';
import Link from 'next/link';

// CSS-only particles — no Framer Motion per particle, just keyframe animations
const CSS_PARTICLES = [
  { x: 8, y: 15, size: 2.5, dur: 18, delay: 0 },
  { x: 22, y: 60, size: 1.5, dur: 24, delay: 2 },
  { x: 35, y: 30, size: 2, dur: 20, delay: 5 },
  { x: 50, y: 75, size: 1, dur: 16, delay: 1 },
  { x: 63, y: 20, size: 3, dur: 22, delay: 3 },
  { x: 75, y: 55, size: 1.5, dur: 28, delay: 7 },
  { x: 88, y: 10, size: 2, dur: 19, delay: 4 },
  { x: 15, y: 85, size: 1, dur: 21, delay: 6 },
  { x: 42, y: 50, size: 2.5, dur: 17, delay: 0.5 },
  { x: 58, y: 40, size: 1, dur: 25, delay: 8 },
  { x: 80, y: 80, size: 2, dur: 23, delay: 2.5 },
  { x: 5, y: 45, size: 1.5, dur: 26, delay: 9 },
  { x: 92, y: 65, size: 2, dur: 18, delay: 3.5 },
  { x: 28, y: 90, size: 1, dur: 30, delay: 11 },
  { x: 70, y: 5, size: 2.5, dur: 20, delay: 1.5 },
];

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <style>{`
      @keyframes particle-float {
        0%   { transform: translateY(0)   translateX(0)   scale(0); opacity: 0; }
        20%  { opacity: 1; }
        50%  { transform: translateY(-80px) translateX(15px)  scale(1); opacity: 0.7; }
        80%  { opacity: 0.3; }
        100% { transform: translateY(-140px) translateX(-10px) scale(0); opacity: 0; }
      }
    `}</style>
    {CSS_PARTICLES.map((p, i) => (
      <div
        key={i}
        className="absolute rounded-full will-change-transform"
        style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          background: 'rgba(255,59,48,0.5)',
          animation: `particle-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }}
      />
    ))}
  </div>
);

// Animated gradient orbs
const GradientOrbs = () => (
  <>
    {/* Primary red orb */}
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: -300 }}
      animate={{ opacity: 0.6, scale: 1, x: 0 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="absolute left-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,59,48,0.4) 0%, rgba(255,59,48,0.1) 40%, transparent 70%)',
        filter: 'blur(60px)',
      }}
    />
    {/* Secondary blue orb */}
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: 300 }}
      animate={{ opacity: 0.5, scale: 1, x: 0 }}
      transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
      className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(37,99,235,0.1) 40%, transparent 70%)',
        filter: 'blur(60px)',
      }}
    />
    {/* Purple accent orb */}
    <motion.div
      initial={{ opacity: 0, y: 200 }}
      animate={{ opacity: 0.3, y: 0 }}
      transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }}
      className="absolute left-1/2 top-[20%] -translate-x-1/2 w-[400px] h-[400px] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 60%)',
        filter: 'blur(80px)',
      }}
    />
  </>
);

// Animated fighter silhouette with glow
const FighterSilhouette = ({ side, color, delay }: { side: 'left' | 'right'; color: string; delay: number }) => {
  const gradientId = `fighter-${side}`;
  const isLeft = side === 'left';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -150 : 150, rotateY: isLeft ? -15 : 15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 1.8, ease: "easeOut", delay }}
      className={`absolute ${isLeft ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 w-[450px] h-[750px] hidden lg:block`}
    >
      <motion.div
        animate={{
          y: [0, -20, 0],
          filter: ['drop-shadow(0 0 30px rgba(255,59,48,0.5))', 'drop-shadow(0 0 60px rgba(255,59,48,0.8))', 'drop-shadow(0 0 30px rgba(255,59,48,0.5))'],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        {/* Glow effect */}
        <div
          className={`absolute inset-0 ${isLeft ? '-left-10' : '-right-10'} w-32 h-full`}
          style={{
            background: `linear-gradient(${isLeft ? 'to right' : 'to left'}, ${color}40, transparent)`,
            filter: 'blur(20px)',
          }}
        />
        
        {/* Fighter SVG */}
        <svg viewBox="0 0 200 400" className={`w-full h-auto ${isLeft ? '' : 'scale-x-[-1]'}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0F172A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="1" />
            </linearGradient>
            <filter id={`${gradientId}-glow`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Main body */}
          <motion.path
            d="M100 30 L135 65 L150 110 L145 170 L160 220 L150 290 L140 360 L125 400 L75 400 L60 360 L50 290 L40 220 L55 170 L50 110 L65 65 Z"
            fill={`url(#${gradientId})`}
            filter={`url(#${gradientId}-glow)`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: delay + 0.5 }}
          />
          
          {/* Headset */}
          <motion.ellipse
            cx="100"
            cy="45"
            rx="30"
            ry="22"
            fill="#0F172A"
            stroke={color}
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 1.5 }}
          />
          
          {/* Visor glow */}
          <motion.path
            d="M75 38 L125 38 L118 55 L82 55 Z"
            fill={color}
            opacity="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: delay + 2 }}
          />
          
          {/* Arm details */}
          <motion.path
            d="M50 110 L25 150 L30 200 L55 170"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: delay + 1 }}
          />
          <motion.path
            d="M150 110 L175 150 L170 200 L145 170"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.6"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: delay + 1.2 }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

// Animated counter
const AnimatedCounter = ({ value, suffix = '' }: { value: string; suffix?: string }) => {
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
  const prefix = value.match(/^[^0-9]*/)?.[0] || '';
  
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="tabular-nums"
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {numericValue.toLocaleString()}
      </motion.span>
      {suffix}
    </motion.span>
  );
};

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.95]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-5, 5]), springConfig);

  useEffect(() => {
    setMounted(true);
    
    let rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return; // skip if a frame is already queued
      rafId = requestAnimationFrame(() => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
        rafId = null;
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  if (!mounted) return null;

  return (
    <section ref={heroRef} className="relative min-h-screen overflow-hidden bg-[#070B14]">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14] via-[#0a0f1a] to-[#0F172A]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/80" />
        </div>
        
        {/* Animated grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,59,48,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,59,48,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        
        {/* Scanline effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      {/* Floating particles */}
      <FloatingParticles />
      
      {/* Gradient orbs */}
      <GradientOrbs />

      {/* Fighter silhouettes */}
      <FighterSilhouette side="left" color="#FF3B30" delay={0.5} />
      <FighterSilhouette side="right" color="#2563EB" delay={0.7} />

      {/* Main Content */}
      <motion.div 
        style={{ opacity, scale }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8"
      >
        {/* Pre-title badge */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="relative mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 -m-4"
          >
            <div className="w-full h-full border border-[#FF3B30]/20 rounded-full" />
          </motion.div>
          
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gamepad2 className="w-4 h-4 text-[#FF3B30]" />
            </motion.div>
            <span className="text-[#CBD5E1] text-sm font-medium tracking-[0.2em] uppercase">
              Collegiate Esports Platform
            </span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <Swords className="w-4 h-4 text-[#2563EB]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Main Logo */}
        <div
          className="relative z-20 mb-12 flex flex-col items-center text-center w-full py-8"
        >
          <motion.div
            className="relative"
            animate={{ scale: [0.99, 1, 0.99] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <h1
              className="w-full px-4 font-black uppercase tracking-wider leading-[0.95] select-none relative z-10"
              style={{
                fontSize: 'clamp(5rem, 18vw, 15rem)',
                background: 'linear-gradient(180deg, #FFFFFF 20%, #F1F5F9 55%, #FF3B30 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'block',
              }}
            >
              XENOVA
            </h1>
            <div className="absolute inset-0 -z-10 blur-[120px] bg-red-600/30 rounded-full" />
          </motion.div>
          <p
            className="mt-8 text-2xl sm:text-3xl text-[#FF3B30] uppercase tracking-[0.3em] font-bold"
          >
            Next Generation College Esports
          </p>
          
          {/* Static glow background */}
          <div
            className="absolute inset-0 -z-10 blur-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,59,48,0.5) 0%, transparent 70%)',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Tagline with letter animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mb-8"
        >
          <p className="text-2xl sm:text-3xl md:text-4xl font-black tracking-widest italic">
            {['COMPETE.', 'DOMINATE.', 'RISE.'].map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 + i * 0.15 }}
                className={i === 1 ? 'text-[#FF3B30] mx-3' : 'text-white mx-3'}
              >
                {word}
              </motion.span>
            ))}
          </p>
        </motion.div>

        {/* Sub-description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-[#94A3B8] text-center max-w-xl mb-12 text-lg sm:text-xl"
        >
          The ultimate battleground for college esports. Join thousands of gamers 
          competing for glory, scholarships, and championships.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <Link href="/tournaments" prefetch={true}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className="group relative bg-gradient-to-r from-[#FF3B30] to-[#F97316] hover:from-[#FF3B30]/90 hover:to-[#F97316]/90 text-white font-semibold px-10 py-7 text-lg rounded-xl overflow-hidden shadow-lg shadow-[#FF3B30]/25 cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                  >
                    <Trophy className="w-5 h-5" />
                  </motion.div>
                  Explore Tournaments
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
              </Button>
            </motion.div>
          </Link>
          
          <Link href="/teams" prefetch={true}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="group relative border-2 border-white/20 hover:border-[#FF3B30]/50 text-white font-semibold px-10 py-7 text-lg rounded-xl bg-white/5 backdrop-blur-sm transition-all duration-300 cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Users className="w-5 h-5" />
                  </motion.div>
                  Create Team
                </span>
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16"
        >
          {[
            { value: '50K+', label: 'Active Players', icon: Users, color: '#FF3B30' },
            { value: '200+', label: 'Universities', icon: Target, color: '#2563EB' },
            { value: '$2M+', label: 'Prize Pool', icon: Flame, color: '#F97316' },
            { value: '15', label: 'Game Titles', icon: Gamepad2, color: '#7C3AED' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2 + index * 0.1 }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="text-center cursor-pointer group"
            >
              <motion.div
                className="w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </motion.div>
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1 group-hover:text-[#FF3B30] transition-colors">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-[#94A3B8] uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs uppercase tracking-widest text-[#94A3B8]">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1"
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-3 bg-[#FF3B30] rounded-full"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Animated bullet tracers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 8, ease: "linear" }}
          className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FF3B30] to-transparent opacity-60"
        />
        <motion.div
          animate={{ x: ['200%', '-100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 12, ease: "linear", delay: 5 }}
          className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#2563EB] to-transparent opacity-50"
        />
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 15, ease: "linear", delay: 8 }}
          className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-40"
        />
      </div>
    </section>
  );
}
