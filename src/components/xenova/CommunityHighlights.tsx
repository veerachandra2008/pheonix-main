'use client';

import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Heart, MessageCircle, Share2, TrendingUp, Users, Zap, ChevronRight, ExternalLink, Eye } from 'lucide-react';

interface Highlight {
  id: number;
  type: 'clip' | 'moment' | 'achievement';
  title: string;
  player: string;
  game: string;
  likes: number;
  comments: number;
  thumbnail: string;
  views: number;
  duration?: string;
}

const highlights: Highlight[] = [
  { id: 1, type: 'clip', title: 'Insane 1v5 Ace Clutch', player: 'PhantomX', game: 'VALORANT', likes: 2453, comments: 128, thumbnail: '', views: 15420, duration: '0:23' },
  { id: 2, type: 'moment', title: 'Championship Winning Play', player: 'NightShadow', game: 'CS2', likes: 1892, comments: 87, thumbnail: '', views: 12350, duration: '0:45' },
  { id: 3, type: 'achievement', title: 'First to Diamond Rank', player: 'Blitz', game: 'Apex Legends', likes: 1456, comments: 62, thumbnail: '', views: 8920, duration: '0:12' },
  { id: 4, type: 'clip', title: 'Perfect Team Fight', player: 'Seraph', game: 'League of Legends', likes: 2134, comments: 95, thumbnail: '', views: 18500, duration: '0:38' },
];

const communityStats = [
  { label: 'Clips Shared', value: '125K+', icon: Play, color: '#FF3B30', bg: 'from-[#FF3B30]/20 to-[#FF3B30]/5' },
  { label: 'Active Members', value: '50K+', icon: Users, color: '#7C3AED', bg: 'from-[#7C3AED]/20 to-[#7C3AED]/5' },
  { label: 'Views This Month', value: '2M+', icon: Eye, color: '#F97316', bg: 'from-[#F97316]/20 to-[#F97316]/5' },
];

// Highlight card with 3D effect
const HighlightCard = ({ highlight, index }: { highlight: Highlight; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  
  const getTypeStyle = (type: Highlight['type']) => {
    switch (type) {
      case 'clip': return { bg: 'bg-[#FF3B30]/20', text: 'text-[#FF3B30]', border: 'border-[#FF3B30]/30', label: 'Clip' };
      case 'moment': return { bg: 'bg-[#7C3AED]/20', text: 'text-[#7C3AED]', border: 'border-[#7C3AED]/30', label: 'Moment' };
      case 'achievement': return { bg: 'bg-[#F97316]/20', text: 'text-[#F97316]', border: 'border-[#F97316]/30', label: 'Achievement' };
    }
  };
  
  const typeStyle = getTypeStyle(highlight.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -10 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group cursor-pointer"
    >
      <Card className="relative overflow-hidden bg-[#0F172A]/50 border border-white/5 hover:border-white/20 transition-all duration-500 h-full">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-[#1e293b] to-[#0f172a] overflow-hidden">
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, ${typeStyle.text === 'text-[#FF3B30]' ? '#FF3B30' : typeStyle.text === 'text-[#7C3AED]' ? '#7C3AED' : '#F97316'} 0%, transparent 50%)`,
            }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          
          {/* Play button */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                backgroundColor: isHovered ? '#FF3B30' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Play className="w-6 h-6 text-white ml-1" />
            </motion.div>
          </motion.div>
          
          {/* Type badge */}
          <div className="absolute top-3 left-3">
            <Badge className={`${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
              {typeStyle.label}
            </Badge>
          </div>
          
          {/* Game badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="border-white/10 text-[#94A3B8] text-xs bg-black/30 backdrop-blur-sm">
              {highlight.game}
            </Badge>
          </div>
          
          {/* Duration */}
          {highlight.duration && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-1 text-xs bg-black/60 backdrop-blur-sm rounded text-white">
                {highlight.duration}
              </span>
            </div>
          )}
          
          {/* Views */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-white/70">
            <Eye className="w-3 h-3" />
            {(highlight.views / 1000).toFixed(1)}K
          </div>
          
          {/* Hover overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          />
        </div>

        {/* Content */}
        <div className="p-5">
          <motion.h4
            className="text-white font-semibold mb-2 transition-colors line-clamp-1"
            animate={{ color: isHovered ? '#FF3B30' : '#ffffff' }}
          >
            {highlight.title}
          </motion.h4>
          <p className="text-[#94A3B8] text-sm mb-4">by @{highlight.player}</p>
          
          {/* Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-[#94A3B8] text-sm">
              <motion.button
                className={`flex items-center gap-1 transition-colors ${liked ? 'text-[#FF3B30]' : 'hover:text-[#FF3B30]'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLiked(!liked);
                }}
                whileTap={{ scale: 0.8 }}
              >
                <motion.div
                  animate={{ scale: liked ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-[#FF3B30]' : ''}`} />
                </motion.div>
                {(highlight.likes + (liked ? 1 : 0)).toLocaleString()}
              </motion.button>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {highlight.comments}
              </span>
            </div>
            <motion.button
              className="text-[#94A3B8] hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function CommunityHighlights() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section ref={containerRef} className="relative py-24 bg-[#070B14] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute left-0 top-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-0 bottom-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,59,48,0.08) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
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
            transition={{ type: "spring" }}
          >
            <Zap className="w-6 h-6 text-[#F97316]" />
            <span className="text-[#CBD5E1] text-sm font-medium tracking-widest uppercase">Community</span>
            <Zap className="w-6 h-6 text-[#F97316]" />
          </motion.div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Trending <span className="text-[#F97316]">Highlights</span>
          </h2>
          <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
            The most epic moments from our community
          </p>
        </motion.div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {highlights.map((highlight, index) => (
            <HighlightCard key={highlight.id} highlight={highlight} index={index} />
          ))}
        </div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {communityStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative p-8 rounded-2xl bg-gradient-to-br border overflow-hidden group cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${stat.color}15, transparent)`,
                borderColor: `${stat.color}20`,
              }}
            >
              {/* Animated glow */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${stat.color}10 0%, transparent 60%)`,
                }}
              />
              
              <div className="relative text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: index * 0.5 }}
                >
                  <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
                </motion.div>
                <motion.p
                  className="text-4xl font-bold text-white mb-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-[#94A3B8]">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
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
              View All Highlights
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
