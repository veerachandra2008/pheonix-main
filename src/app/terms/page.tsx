'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  ShieldCheck,
  Trophy,
  AlertTriangle,
  Zap,
  Scale,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function TermsOfServicePage() {
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
            alt="Terms of Service"
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
            <Scale className="h-4 w-4" /> Official Competitive Rulebook
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-2xl"
          >
            Terms of <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Service & Rules</span>
          </motion.h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Last Updated: January 2026 · Governing all collegiate tournament registrations, digital ticket passes, prize allocations, and anti-cheat policies on XENOVA.
          </p>
        </div>
      </section>

      {/* ═══════════════ 2. TERMS CONTENT ═══════════════ */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section 1 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">1</span>
            Eligibility & Student Verification
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              By accessing XENOVA or registering for any tournament, you affirm that you are at least 16 years of age and comply with all game publisher Terms of Service.
            </p>
            <p>
              For sanctioned varsity championships, participants must hold a valid, active college/university student identification or institutional email. XENOVA reserves the right to request proof of enrollment at any stage of a tournament.
            </p>
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">2</span>
            Tournament Passes & Ticket Booking
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              Tournament ticket passes issued through XENOVA are unique, non-transferable digital assets assigned to the registering squad. Each pass contains a secure cryptographic Pass ID and QR code.
            </p>
            <p>
              Team rosters become frozen 2 hours prior to the scheduled bracket start. Any unauthorized roster substitutions or sharing of account credentials without prior marshal approval will result in match forfeiture.
            </p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">3</span>
            Anti-Cheat & Competitive Fair Play
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              XENOVA maintains zero tolerance for cheating, memory manipulation, automated scripting, stream sniping, smurfing, match fixing, or exploitation of in-game bugs.
            </p>
            <p>
              Players detected using prohibited software will receive an immediate lifetime ban from all collegiate circuits, and their university esports society will be formally notified.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">4</span>
            Prize Pool Distribution & Payouts
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              All published prize pools are held in escrow. Payouts are distributed to winning team captains within 48 to 72 hours following the completion and anti-cheat audit of the tournament.
            </p>
            <p>
              Captains are responsible for submitting valid payout details (UPI / NEFT) and complying with applicable Indian tax regulations (TDS where applicable under statutory norms).
            </p>
          </div>
        </div>

        {/* Section 5 */}
        <div className="p-8 rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs text-emerald-400">5</span>
            Legal & Support Contact
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-3 font-normal">
            <p>
              For inquiries regarding tournament arbitration, rules clarification, or legal notices, contact our tournament operations desk:
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <a
                href="tel:+917993728522"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold"
              >
                <Phone className="w-3.5 h-3.5" /> +91 79937 28522
              </a>
              <a
                href="mailto:xenovaesports1@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-bold"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> xenovaesports1@gmail.com
              </a>
            </div>
          </div>
        </div>

      </section>

      <FinalCTA />
    </main>
  );
}
