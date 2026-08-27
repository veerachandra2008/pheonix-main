'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Handshake,
  Building2,
  Tv,
  Users,
  Trophy,
  Zap,
  Phone,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Award
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function PartnersPage() {
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
            alt="Partnerships with Xenova"
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest"
          >
            <Handshake className="h-4 w-4" /> Strategic Partnerships & Brand Sponsorships
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl"
          >
            Engage India&apos;s Most Active <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Collegiate Audience</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Partner with XENOVA to sponsor varsity leagues, co-brand premier collegiate esports cups, and connect directly with over 50,000 verified university gamers across 200+ campuses.
          </motion.p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="mailto:veerachandra2008@gmail.com?subject=Partnership%20Inquiry%20-%20XENOVA"
              className="blob-btn bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-8 py-4 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/25 hover:scale-105 inline-flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Partner With Us</span>
            </a>

            <a
              href="tel:+917993728522"
              className="blob-btn-secondary border border-white/20 bg-white/5 hover:bg-white/10 text-white font-extrabold px-8 py-4 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition hover:scale-105 inline-flex items-center gap-2"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call +91 79937 28522</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════ 2. PARTNERSHIP TIERS ═══════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Collaboration Models</span>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            How You Can Partner With XENOVA
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            From on-ground university LAN fests to national broadcast stream naming rights, we create custom experiences tailored to your goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl hover:border-emerald-500/40 transition space-y-5 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                University Fests & Tech Clubs
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Hosting an annual college fest? Use XENOVA as your official esports bracket engine. We provide prize pool escrow, verified digital QR ticketing passes, and match marshals.
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Automated LAN check-in scanners</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Co-branded varsity prize trophies</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Inter-college leaderboard integration</li>
              </ul>
            </div>
            <div className="pt-6 border-t border-white/10">
              <Link
                href="/host"
                className="inline-flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider hover:underline"
              >
                <span>Host College Event</span> &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl border border-emerald-500/40 bg-zinc-950/90 backdrop-blur-xl hover:border-emerald-500/60 transition space-y-5 flex flex-col justify-between group shadow-2xl relative">
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Featured
            </div>
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Tv className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                Brand & Hardware Sponsors
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Promote gaming laptops, peripherals, energy drinks, and software tools directly to Gen-Z student gamers through broadcast overlays, branded cups, and product booths.
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Title sponsorship of national cups</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Live stream sponsor segments & banners</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> On-ground product showcase & testing</li>
              </ul>
            </div>
            <div className="pt-6 border-t border-white/10">
              <a
                href="mailto:veerachandra2008@gmail.com?subject=Brand%20Sponsorship%20Inquiry"
                className="inline-flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-wider hover:underline"
              >
                <span>Inquire Title Sponsorship</span> &rarr;
              </a>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl hover:border-emerald-500/40 transition space-y-5 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                Publishers & Esports Teams
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Game publishers and tier-1 pro esports organizations can scout top emerging collegiate talent and run sanctioned community circuits with anti-cheat enforcement.
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Player scouting analytics & VODs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Official game publisher qualifier status</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Verified student ID matchmaking</li>
              </ul>
            </div>
            <div className="pt-6 border-t border-white/10">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider hover:underline"
              >
                <span>Contact Ops Team</span> &rarr;
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════ 3. DIRECT CONTACT BANNER ═══════════════ */}
      <section className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-emerald-950/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Ready to Discuss a Custom Partnership?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
              Get in touch with our partnerships lead. We create tailored proposals within 24 hours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="tel:+917993728522"
              className="px-5 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider transition"
            >
              +91 79937 28522
            </a>
            <a
              href="mailto:veerachandra2008@gmail.com"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
            >
              veerachandra2008@gmail.com
            </a>
          </div>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
