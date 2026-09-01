'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileCheck,
  Zap,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. HERO SECTION ═══════════════ */}
      <section 
        className="relative overflow-hidden bg-black py-16 sm:py-24 border-b border-emerald-500/20"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
        }}
      >
        <div className="absolute inset-0 z-0">
          <img
            src="/valorant.jpg"
            alt="Privacy Policy"
            className="w-full h-full object-cover filter brightness-[0.2] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest"
          >
            <Lock className="h-4 w-4" /> Data Integrity & Privacy Standards
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-2xl"
          >
            Privacy <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Policy</span>
          </motion.h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Last Updated: January 2026 · Committed to protecting student gamer privacy, roster verification records, and tournament statistics across India.
          </p>
        </div>
      </section>

      {/* ═══════════════ 2. PRIVACY CONTENT ═══════════════ */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section 1 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">1</span>
            Information We Collect
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              When you create an account, join a squad, or book a tournament pass on XENOVA, we collect:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>Profile data: In-game nickname, gamer tag (e.g. Riot ID, Steam ID, BGMI UID), and avatar.</li>
              <li>University affiliation: College name, institutional email, and optional student ID proof for varsity brackets.</li>
              <li>Contact details: Registered email address and mobile phone number for tournament dispatch.</li>
              <li>Performance data: Match statistics, win/loss rates, K/D ratios, and tournament placement records.</li>
            </ul>
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">2</span>
            How We Use Your Data
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              Your data is utilized strictly for tournament bracket generation, matchday check-in scanner authentication, anti-cheat validation, prize payouts, and inter-collegiate leaderboards. We never sell your personal information to third-party data brokers.
            </p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">3</span>
            Security & Digital Pass Cryptography
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              Digital ticket passes generated on XENOVA contain cryptographically hashed identifiers to prevent fraudulent badge replication during on-ground university fest check-ins. All communication is encrypted via TLS 1.3.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">4</span>
            Your Rights & Privacy Contact
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              You have the right to request access to your stored personal data, request corrections, or request complete account and data deletion at any time by contacting our Data Protection Officer:
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <a
                href="mailto:xenovaesports1@gmail.com?subject=Privacy%20Data%20Request"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> xenovaesports1@gmail.com
              </a>
              <a
                href="tel:+917993728522"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold"
              >
                <Phone className="w-3.5 h-3.5" /> +91 79937 28522
              </a>
            </div>
          </div>
        </div>

      </section>

      <FinalCTA />
    </main>
  );
}
