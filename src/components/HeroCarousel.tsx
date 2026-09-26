'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Swords,
  Radio,
  Volume2,
  VolumeX,
  Flame,
  ArrowUpRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { getAllTournaments, cleanDescriptionText } from '@/lib/tournaments-db';
import { supabase } from '@/lib/supabase';

interface Slide {
  id: string;
  type: 'video' | 'image';
  src: string;
  tag: string;
  tagColor: 'emerald' | 'amber' | 'cyan' | 'rose';
  icon: React.ComponentType<{ className?: string }>;
  titlePrefix: string;
  highlightText: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  isTournament?: boolean;
  tournamentSlug?: string;
  redirectUrl: string;
  badgeExtra?: string;
}

const BASE_STATIC_SLIDES: Slide[] = [
  {
    id: 'live-video-reel',
    type: 'video',
    src: '/video.mp4',
    tag: 'Official Arena Highlight Reel',
    tagColor: 'emerald',
    icon: Radio,
    titlePrefix: 'Experience Collegiate',
    highlightText: 'Esports Championship',
    subtitle: 'Watch top varsity squads clash in pulse-pounding double-elimination brackets and LAN showdowns.',
    primaryCtaText: 'Explore Tournaments',
    primaryCtaHref: '/tournaments',
    secondaryCtaText: 'Join a Team',
    secondaryCtaHref: '/teams',
    redirectUrl: '/tournaments',
  },
  {
    id: 'winners-spotlight',
    type: 'image',
    src: '/winners.jpeg',
    tag: 'Hall of Champions',
    tagColor: 'amber',
    icon: Trophy,
    titlePrefix: 'Honoring the Season',
    highlightText: 'Grand Champions',
    subtitle: 'Celebrating triumphant collegiate athletes who dominated the arena and etched their names in varsity history.',
    primaryCtaText: 'View Leaderboards',
    primaryCtaHref: '/leaderboards',
    secondaryCtaText: 'College Rankings',
    secondaryCtaHref: '/colleges',
    redirectUrl: '/leaderboards',
  },
  {
    id: 'lan-action',
    type: 'image',
    src: '/playing.jpeg',
    tag: 'Intense Arena Action',
    tagColor: 'cyan',
    icon: Swords,
    titlePrefix: 'Where University Legends',
    highlightText: 'Are Forged',
    subtitle: 'High-voltage collegiate rivalries across 120+ campuses. Prove your skill and rise through official varsity ranks.',
    primaryCtaText: 'Enter Arena Now',
    primaryCtaHref: '/tournaments',
    secondaryCtaText: 'Browse Athletes',
    secondaryCtaHref: '/players',
    redirectUrl: '/tournaments',
  },
];

const AUTO_PLAY_INTERVAL = 6000; // 6 seconds per slide

export default function HeroCarousel() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [slideKey, setSlideKey] = useState(0);
  const [latestTournament, setLatestTournament] = useState<any | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const hasSwipedRef = useRef(false);

  // ─── 1. FETCH & SYNC LATEST TOURNAMENT LAUNCH ───
  const loadLatestTournament = useCallback(async () => {
    try {
      const list = await getAllTournaments();
      if (list && list.length > 0) {
        // Sort descending by ID or created_at to locate the newest launched tournament
        const sorted = [...list].sort((a: any, b: any) => {
          const aId = Number(a.id) || 0;
          const bId = Number(b.id) || 0;
          return bId - aId;
        });

        const newest = sorted[0];
        if (newest && newest.slug) {
          setLatestTournament(newest);

          // Preload tournament image for instant zero-delay rendering
          if (newest.image && typeof window !== 'undefined') {
            const img = new Image();
            img.src = newest.image;
          }
        }
      }
    } catch (err) {
      console.warn('HeroCarousel tournament load notice:', err);
    }
  }, []);

  useEffect(() => {
    loadLatestTournament();

    // Listen for local tournament updates (e.g. organizer launches a new tournament)
    const handleUpdate = () => {
      loadLatestTournament();
    };
    window.addEventListener('xenova-tournaments-updated', handleUpdate);

    // Realtime Supabase subscription for live tournament launches
    const channel = supabase
      .channel('realtime:carousel_tournaments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => {
          loadLatestTournament();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('xenova-tournaments-updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [loadLatestTournament]);

  // Preload static background assets
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const imagesToPreload = ['/winners.jpeg', '/playing.jpeg'];
      imagesToPreload.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, []);

  // ─── 2. COMPOSE DYNAMIC SLIDES (NEW TOURNAMENT IS ALWAYS SLIDE 0) ───
  const slides: Slide[] = useMemo(() => {
    if (!latestTournament) {
      return BASE_STATIC_SLIDES;
    }

    const rawDesc = latestTournament.description || '';
    const cleanDesc = cleanDescriptionText(rawDesc);
    const subtitle = cleanDesc
      ? cleanDesc.length > 150
        ? cleanDesc.slice(0, 150) + '...'
        : cleanDesc
      : `${latestTournament.format || 'Double Elimination'} • ${latestTournament.region || 'Pan India'} • ${latestTournament.teams || 'Open Brackets'}. Click anywhere to view rules, schedule, and join.`;

    const isLive = (latestTournament.status || '').toLowerCase() === 'live';
    const tag = isLive
      ? 'LIVE TOURNAMENT IN PROGRESS'
      : 'NEW TOURNAMENT LAUNCH • REGISTRATIONS OPEN';

    const tournamentSlide: Slide = {
      id: `tournament-${latestTournament.slug}`,
      type: 'image',
      src: latestTournament.image || '/hero-arena.jpg',
      tag,
      tagColor: isLive ? 'rose' : 'emerald',
      icon: Flame,
      titlePrefix: latestTournament.title || 'Official Championship',
      highlightText: `${latestTournament.game || 'Esports'} • Prize: ${latestTournament.prize || 'Official'}`,
      subtitle,
      primaryCtaText: 'Enter Tournament Page',
      primaryCtaHref: `/tournaments/${latestTournament.slug}`,
      secondaryCtaText: 'Register Squad',
      secondaryCtaHref: `/registration/${latestTournament.slug}`,
      isTournament: true,
      tournamentSlug: latestTournament.slug,
      redirectUrl: `/tournaments/${latestTournament.slug}`,
      badgeExtra: latestTournament.date ? `Starts ${latestTournament.date}` : undefined,
    };

    // New tournament is positioned as the FIRST SLIDE
    return [tournamentSlide, ...BASE_STATIC_SLIDES];
  }, [latestTournament]);

  // ─── 3. NAVIGATION CONTROLS ───
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setSlideKey((prev) => prev + 1);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setSlideKey((prev) => prev + 1);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setSlideKey((prev) => prev + 1);
  }, [slides.length]);

  // Automatic Rotation Timer
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isPaused, nextSlide, slideKey]);

  // Video playback management: only play video when video slide is active
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoSlideIndex = slides.findIndex((s) => s.type === 'video');
    if (currentIndex === videoSlideIndex) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [currentIndex, slides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide]);

  // Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    hasSwipedRef.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 45) {
      hasSwipedRef.current = true;
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
  };

  // Whole slide click redirection: clicking the slide navigates directly to the tournament page
  const handleSlideCardClick = (e: React.MouseEvent) => {
    if (hasSwipedRef.current) return;
    const target = e.target as HTMLElement;
    // Don't intercept if clicking arrow buttons, audio mute, or bottom dot indicators
    if (target.closest('button')) {
      return;
    }
    const current = slides[currentIndex];
    if (current?.redirectUrl) {
      router.push(current.redirectUrl);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const currentSlide = slides[currentIndex] || slides[0];
  const isCurrentTournament = !!currentSlide.isTournament;

  const getTagBadgeStyles = (color: 'emerald' | 'amber' | 'cyan' | 'rose') => {
    switch (color) {
      case 'rose':
        return 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]';
      case 'amber':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]';
      case 'cyan':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]';
      default:
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]';
    }
  };

  const getHighlightColor = (color: 'emerald' | 'amber' | 'cyan' | 'rose') => {
    switch (color) {
      case 'rose':
        return 'text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-rose-400 to-pink-500';
      case 'amber':
        return 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500';
      case 'cyan':
        return 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-400 to-emerald-400';
      default:
        return 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400';
    }
  };

  return (
    <div
      onClick={handleSlideCardClick}
      className={`relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#09090b] shadow-[0_10px_50px_rgba(0,0,0,0.85)] group select-none transition-all duration-300 ${
        isCurrentTournament ? 'cursor-pointer hover:border-emerald-500/40 hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]' : ''
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Collegiate Esports Highlights"
    >
      {/* ─── HARDWARE-ACCELERATED PERSISTENT MEDIA STACK ─── */}
      <div className="relative h-[320px] sm:h-[400px] md:h-[460px] lg:h-[500px] w-full overflow-hidden bg-zinc-950">
        
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-700 ease-out will-change-[opacity,transform] ${
                isActive
                  ? 'opacity-100 scale-100 z-10'
                  : 'opacity-0 scale-[1.03] z-0 pointer-events-none'
              }`}
            >
              {slide.type === 'video' ? (
                <video
                  ref={videoRef}
                  src={slide.src}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover filter brightness-[0.62] contrast-[1.06] saturate-125 transition-transform duration-1000 ease-out"
                />
              ) : (
                <img
                  src={slide.src}
                  alt={slide.titlePrefix}
                  decoding="async"
                  loading="eager"
                  className="w-full h-full object-cover filter brightness-[0.62] contrast-[1.06] saturate-125 transition-transform duration-1000 ease-out"
                />
              )}
            </div>
          );
        })}

        {/* ─── CINEMATIC GRADIENT OVERLAYS ─── */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black via-black/40 to-black/25" />
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-black/90 via-black/45 to-transparent max-w-3xl" />
        <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_70%)]" />

        {/* ─── ACTIVE SLIDE TEXT & CONTROLS OVERLAY ─── */}
        <div className="relative z-20 h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 pointer-events-none">
          
          {/* Top Bar inside carousel */}
          <div className="flex items-center justify-between gap-3 pointer-events-auto">
            
            {/* Tag Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                key={`badge-${currentSlide.id}`}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider backdrop-blur-xl transition-all duration-500 ${getTagBadgeStyles(
                  currentSlide.tagColor
                )}`}
              >
                {currentSlide.type === 'video' ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                ) : (
                  <currentSlide.icon className="h-3.5 w-3.5" />
                )}
                <span>{currentSlide.tag}</span>
              </div>

              {currentSlide.badgeExtra && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 text-[11px] font-mono font-bold backdrop-blur-md">
                  <Calendar className="h-3 w-3 text-emerald-400" />
                  {currentSlide.badgeExtra}
                </span>
              )}

              {isCurrentTournament && (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
                  Click Anywhere to View
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              )}
            </div>

            {/* Controls Right: Audio Toggle & Slide Count */}
            <div className="flex items-center gap-2">
              {currentSlide.type === 'video' && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white hover:text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-xl transition-all duration-200 shadow-md cursor-pointer"
                  title={isMuted ? 'Unmute video audio' : 'Mute video audio'}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5 text-zinc-400" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline text-[11px]">
                    {isMuted ? 'Muted' : 'Audio On'}
                  </span>
                </button>
              )}

              {/* Status & Counter */}
              <div className="px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-white/90 text-[11px] font-mono font-bold backdrop-blur-xl flex items-center gap-1.5">
                <span className="text-emerald-400 font-extrabold">0{currentIndex + 1}</span>
                <span className="text-white/25">/</span>
                <span className="text-white/60">0{slides.length}</span>
                {isPaused && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 uppercase font-sans font-bold">
                    PAUSED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Title, Subtitle, & CTAs */}
          <div className="max-w-2xl space-y-3 sm:space-y-4 pointer-events-auto">
            <div
              key={`text-block-${currentSlide.id}`}
              className="space-y-2.5 transition-all duration-500 ease-out transform"
            >
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-[1.08] drop-shadow-md">
                {currentSlide.titlePrefix}{' '}
                <span className={getHighlightColor(currentSlide.tagColor)}>
                  {currentSlide.highlightText}
                </span>
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-zinc-300 font-normal leading-relaxed line-clamp-2 sm:line-clamp-none max-w-xl drop-shadow">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={currentSlide.primaryCtaHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>{currentSlide.primaryCtaText}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <Link
                href={currentSlide.secondaryCtaHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-xl transition hover:border-white/30 cursor-pointer"
              >
                <span>{currentSlide.secondaryCtaText}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── NAVIGATION ARROWS ─── */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          prevSlide();
        }}
        aria-label="Previous Slide"
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-emerald-500/25 border border-white/20 hover:border-emerald-500/60 text-white hover:text-emerald-400 backdrop-blur-xl transition-all duration-300 shadow-xl hover:scale-110 active:scale-95 cursor-pointer group"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          nextSlide();
        }}
        aria-label="Next Slide"
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-emerald-500/25 border border-white/20 hover:border-emerald-500/60 text-white hover:text-emerald-400 backdrop-blur-xl transition-all duration-300 shadow-xl hover:scale-110 active:scale-95 cursor-pointer group"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
      </button>

      {/* ─── BOTTOM PILL INDICATORS ─── */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(idx);
            }}
            aria-label={`Go to slide ${idx + 1}: ${slide.tag}`}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex
                ? 'w-7 sm:w-8 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* ─── GPU-ACCELERATED ZERO-OVERHEAD PROGRESS BAR ─── */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30 overflow-hidden">
        <div
          key={`progress-${slideKey}`}
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] origin-left"
          style={{
            animation: `heroCarouselFill ${AUTO_PLAY_INTERVAL}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes heroCarouselFill {
          0% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
