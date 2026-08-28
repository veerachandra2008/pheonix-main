'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Radio, Users, Sparkles, MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export default function LiveTelecaster() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    if (total > 0) {
      setProgress((current / total) * 100);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleRecovery = () => {
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    };
    video.addEventListener('stalled', handleRecovery);
    video.addEventListener('waiting', handleRecovery);
    return () => {
      video.removeEventListener('stalled', handleRecovery);
      video.removeEventListener('waiting', handleRecovery);
    };
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTime;
    setProgress(parseFloat(e.target.value));
  };

  return (
    <section className="py-24 md:py-32 bg-[#09090b] border-y border-zinc-900 overflow-hidden relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column - Live Event Content & Details */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>LIVE TELECAST • GRAND FINALS</span>
              <div className="flex items-end gap-1 h-4 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40">
                <motion.span animate={{ height: ['40%', '100%', '30%', '80%', '40%'] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-0.5 bg-rose-400 rounded-full" />
                <motion.span animate={{ height: ['80%', '30%', '100%', '40%', '90%'] }} transition={{ duration: 0.7, repeat: Infinity, delay: 0.1 }} className="w-0.5 bg-rose-400 rounded-full" />
                <motion.span animate={{ height: ['30%', '90%', '40%', '100%', '20%'] }} transition={{ duration: 0.9, repeat: Infinity, delay: 0.2 }} className="w-0.5 bg-rose-400 rounded-full" />
                <motion.span animate={{ height: ['100%', '40%', '70%', '20%', '80%'] }} transition={{ duration: 0.75, repeat: Infinity, delay: 0.15 }} className="w-0.5 bg-rose-400 rounded-full" />
              </div>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
              VALORANT Inter-College Championship
            </h2>

            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              Watch live as IIT Bombay Titans battle BITS Pilani Vipers in the Map 3 decider for the ₹1,50,000 prize pool and national bragging rights.
            </p>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="p-4 rounded-2xl bg-black border border-white/10">
                <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current Match</span>
                <span className="text-sm font-extrabold text-white">IIT Bombay vs BITS Pilani</span>
              </div>
              <div className="p-4 rounded-2xl bg-black border border-white/10">
                <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live Viewers</span>
                <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> 14,280 Watching
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={togglePlay}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-7 py-3.5 text-xs uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/25 inline-flex items-center gap-2 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950" />}
                {isPlaying ? 'Pause Broadcast' : 'Play Broadcast'}
              </button>

              <button
                type="button"
                className="border border-white/15 bg-white/5 hover:bg-white/10 text-white font-extrabold px-6 py-3.5 text-xs uppercase tracking-wider rounded-2xl transition inline-flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" /> Join Live Chat
              </button>
            </div>
          </div>

          {/* Right Column - YouTube-Style Custom Video Player */}
          <div className="lg:col-span-7">
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video rounded-3xl border border-white/15 bg-black overflow-hidden shadow-2xl group"
            >
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                poster="/image.png"
                className="w-full h-full object-cover cursor-pointer transform-gpu will-change-transform"
              >
                <source src="/video.mp4" type="video/mp4" />
              </video>

              {/* Big Center Play/Pause Indicator on Hover */}
              <div 
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition duration-300 cursor-pointer pointer-events-auto"
              >
                <div className="p-5 rounded-full bg-black/80 border border-white/20 text-white backdrop-blur-md hover:scale-110 transition shadow-2xl">
                  {isPlaying ? <Pause className="w-8 h-8 fill-white" /> : <Play className="w-8 h-8 fill-white ml-1" />}
                </div>
              </div>

              {/* Top Overlay Badge */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-rose-500/40 text-rose-400 text-[11px] font-black uppercase tracking-widest backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> 1080p60 • LIVE
                </div>
                <div className="px-3 py-1 rounded-full bg-black/80 border border-white/10 text-zinc-300 text-[11px] font-bold uppercase backdrop-blur-md">
                  XENOVA Broadcast #1
                </div>
              </div>

              {/* Custom YouTube-style Control Bar */}
              <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent p-4 flex flex-col gap-2 transition duration-300">
                {/* Progress Scrubber */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />

                {/* Player Controls Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    {/* Play / Pause Button */}
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-emerald-400 transition cursor-pointer"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    {/* Mute / Unmute Button */}
                    <button
                      onClick={toggleMute}
                      className="text-white hover:text-emerald-400 transition cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <span className="text-xs font-mono font-bold text-zinc-400">
                      LIVE • VALORANT GRAND FINALS
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Fullscreen Toggle */}
                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-emerald-400 transition cursor-pointer"
                      title="Fullscreen"
                    >
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
