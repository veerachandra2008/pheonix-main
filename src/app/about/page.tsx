'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Trophy,
  ShieldCheck,
  Zap,
  Users,
  Building2,
  Flame,
  Award,
  Sparkles,
  Gamepad2,
  ArrowRight,
  Phone,
  Mail,
  CheckCircle2
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. HERO SECTION ═══════════════ */}
      <section 
        className="relative overflow-hidden bg-black py-20 sm:py-32 border-b border-emerald-500/20"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
        }}
      >
        <div className="absolute inset-0 z-0">
          <img
            src="/valorant.jpg"
            alt="About Xenova Esports"
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest backdrop-blur-md"
          >
            <Zap className="h-4 w-4 fill-emerald-400" /> India&apos;s Premier Collegiate Battleground
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white drop-shadow-2xl"
          >
            Empowering the Next Generation of <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Esports Champions</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-300 max-w-3xl mx-auto font-normal leading-relaxed"
          >
            XENOVA is the unified competitive esports infrastructure built for universities, student athletes, and campus gaming clubs across India. We bridge grassroots college talent with professional esports circuits.
          </motion.p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/tournaments"
              className="blob-btn bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-8 py-4 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/25 hover:scale-105 inline-flex items-center gap-2"
            >
              <span>Explore Tournaments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/colleges"
              className="blob-btn-secondary border border-white/20 bg-white/5 hover:bg-white/10 text-white font-extrabold px-8 py-4 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition hover:scale-105 inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Colleges & Universities</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ 2. METRICS STATS BAR ═══════════════ */}
      <section className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Colleges & Universities', val: '200+', sub: 'Active Campus Hubs' },
            { label: 'Registered Competitors', val: '50,000+', sub: 'Verified Student Gamers' },
            { label: 'Total Prize Money', val: '₹2.5 Cr+', sub: 'Distributed Transparently' },
            { label: 'Official Tournaments', val: '1,200+', sub: 'Completed Brackets' },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl border border-white/15 bg-zinc-950/90 backdrop-blur-2xl shadow-2xl text-center space-y-1 hover:border-emerald-500/40 transition group"
            >
              <p className="text-2xl sm:text-4xl font-black font-mono text-emerald-400 group-hover:scale-105 transition-transform">
                {stat.val}
              </p>
              <h3 className="text-xs font-black uppercase tracking-wider text-white pt-1">{stat.label}</h3>
              <p className="text-[11px] text-zinc-400">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ 3. OUR FOUR CORE PILLARS ═══════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Our Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Built from the Ground Up for Collegiate Gaming
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Every match on XENOVA is backed by industry-standard anti-cheat verification, automated bracket routing, and official university credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: ShieldCheck,
              title: 'Anti-Cheat Integrity',
              desc: 'Hardened hardware verification, tournament referee replays, and strict zero-tolerance smurfing enforcement.',
            },
            {
              icon: Trophy,
              title: 'Automated Brackets',
              desc: 'Double-elimination, single-knockout, and Swiss group formats managed via instant real-time websocket updates.',
            },
            {
              icon: Award,
              title: 'Student QR Passports',
              desc: 'Cryptographically signed digital ticket passes with on-ground LAN scanner validation for offline fest check-ins.',
            },
            {
              icon: Building2,
              title: 'University Leaderboards',
              desc: 'Represent your college in national standings. Win varsity points and claim bragging rights for your campus.',
            },
          ].map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-xl hover:border-emerald-500/40 transition space-y-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold uppercase tracking-wide text-white">{pillar.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ 4. LEADERSHIP & CONTACT BANNER ═══════════════ */}
      <section className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-zinc-950 via-emerald-950/20 to-zinc-950 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Direct Inquiries & Collaboration</span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Want to Host a Tournament or Partner with Us?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              We collaborate with colleges, university athletic associations, student gaming clubs, and leading esports sponsors across India.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="tel:+917993728522"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider transition"
            >
              <Phone className="w-4 h-4" />
              <span>+91 79937 28522</span>
            </a>

            <a
              href="mailto:xenovaesports1@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider transition shadow-xl shadow-emerald-500/20"
            >
              <Mail className="w-4 h-4" />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
