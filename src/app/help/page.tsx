'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Phone,
  Mail,
  Search,
  ChevronDown,
  ShieldCheck,
  Trophy,
  Ticket,
  Users,
  Gamepad2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Zap,
  ArrowRight,
  Headphones
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

interface FAQItem {
  id: string;
  category: 'tickets' | 'tournaments' | 'teams' | 'rules' | 'payouts';
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: 't-1',
    category: 'tickets',
    question: 'How do I register and claim my Tournament Ticket Pass?',
    answer:
      'Browse to the Tournaments page, select your desired collegiate event, and click "Register Squad" or "Claim Pass". Fill in your team details and university affiliation. Once registered, a unique digital QR pass ID (e.g., XEN-PASS-XXXX) is issued and permanently saved to your Dashboard and registered email.',
  },
  {
    id: 't-2',
    category: 'tickets',
    question: 'How does digital Ticket Pass scanning and gate check-in work?',
    answer:
      'On tournament matchdays or on-ground LAN events, event marshals verify your entry using our real-time Ticket Scanner at /verify. Present your QR code or 8-character Pass ID. The scanner verifies your squad roster and marks your match attendance in real time.',
  },
  {
    id: 't-3',
    category: 'tickets',
    question: 'Can I transfer my Tournament Pass to another teammate?',
    answer:
      'Team captains can modify roster substitutes up to 2 hours before the tournament bracket freeze. Go to your Dashboard, navigate to your active registrations, and update player handles or contact support at veerachandra2008@gmail.com.',
  },
  {
    id: 'r-1',
    category: 'rules',
    question: 'What anti-cheat systems and fair play regulations are enforced?',
    answer:
      'XENOVA strictly mandates official client anti-cheat (e.g. Riot Vanguard for VALORANT, VAC/Faceit for CS2, Battlegrounds anti-cheat for BGMI). Any detection of third-party memory injection, script automation, or smurfing leads to permanent hardware-level ban and university varsity disqualification.',
  },
  {
    id: 'r-2',
    category: 'rules',
    question: 'What happens in case of a match dispute or disconnect?',
    answer:
      'In online qualifiers, each team gets up to 10 minutes of technical timeout for disconnections. For match disputes (e.g. incorrect score reporting or unsportsmanlike conduct), captains must provide match replay screenshots to tournament marshals or call the emergency support desk (+91 79937 28522).',
  },
  {
    id: 'p-1',
    category: 'payouts',
    question: 'When and how are tournament prize pools distributed?',
    answer:
      'Prize pools are disbursed directly via UPI or verified Bank NEFT within 48 to 72 hours following the Grand Finals. Winning captains receive an automated payout claim form to verify PAN/Govt ID and bank coordinates.',
  },
  {
    id: 'm-1',
    category: 'teams',
    question: 'Can players from different colleges form a mixed team?',
    answer:
      'Open Circuit and Invitational tournaments allow mixed rosters. However, official "Varsity Championship" tournaments require at least 4 out of 5 squad members to be currently enrolled students of the representing college/university.',
  },
  {
    id: 'm-2',
    category: 'tournaments',
    question: 'How do I host an official tournament for my college fest?',
    answer:
      'Student organizers and esports societies can apply via our "Host Event" portal (/host). XENOVA provides automated bracket generation, registration portals, live stream overlays, and prize escrow support.',
  },
];

const categories = [
  { id: 'all', label: 'All Questions', icon: HelpCircle },
  { id: 'tickets', label: 'Tickets & Passes', icon: Ticket },
  { id: 'tournaments', label: 'Tournaments & Brackets', icon: Trophy },
  { id: 'rules', label: 'Anti-Cheat & Rules', icon: ShieldCheck },
  { id: 'teams', label: 'Colleges & Teams', icon: Users },
  { id: 'payouts', label: 'Prize Payouts', icon: Zap },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openAccordion, setOpenAccordion] = useState<string | null>('t-1');

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. HERO SECTION ═══════════════ */}
      <section 
        className="relative overflow-hidden bg-black py-20 sm:py-28 border-b border-emerald-500/20"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
        }}
      >
        <div className="absolute inset-0 z-0">
          <img
            src="/valorant.jpg"
            alt="Xenova Help Center"
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest"
          >
            <Headphones className="h-4 w-4" /> 24/7 Matchday Support Hub
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl"
          >
            How Can We <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Help You?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Get instant solutions for tournament registrations, verified digital ticket passes, match dispute resolution, and collegiate esports support.
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-2xl mx-auto mt-8"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-5 h-5 w-5 text-emerald-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues, passes, tournament rules, payouts, anti-cheat..."
                className="w-full pl-13 pr-6 py-4 rounded-2xl bg-zinc-950/90 border border-white/20 text-white placeholder-zinc-500 text-sm font-medium focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-2xl shadow-2xl transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-white bg-white/10 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ 2. DIRECT CONTACT HOTLINE CARDS ═══════════════ */}
      <section className="relative z-20 -mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Phone Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-6 backdrop-blur-2xl shadow-2xl hover:border-emerald-500/60 transition group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-wide text-white">Direct Phone Support</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct hotline for urgent match disputes, tournament marshal escalations, and technical lobby issues.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <a
                href="tel:+917993728522"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-mono text-sm font-extrabold group-hover:translate-x-1 transition-transform"
              >
                <span>+91 79937 28522</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <span className="block text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">Available 24/7 Matchday Support</span>
            </div>
          </div>

          {/* Email Card */}
          <div className="rounded-2xl border border-white/15 bg-zinc-950/90 p-6 backdrop-blur-2xl shadow-2xl hover:border-emerald-500/40 transition group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-wide text-white">Official Support Email</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Send official inquiries regarding partnership, university fest tie-ups, team roster transfers, and payouts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <a
                href="mailto:veerachandra2008@gmail.com"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-mono text-xs sm:text-sm font-extrabold group-hover:translate-x-1 transition-transform truncate max-w-full"
              >
                <span>veerachandra2008@gmail.com</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>
              <span className="block text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">&lt; 15 mins average response time</span>
            </div>
          </div>

          {/* Ticket Verification Card */}
          <div className="rounded-2xl border border-white/15 bg-zinc-950/90 p-6 backdrop-blur-2xl shadow-2xl hover:border-emerald-500/40 transition group flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-wide text-white">Ticket Pass Scanner</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Verify any tournament ticket pass ID or scan QR codes instantly with our cryptographically verified gate checker.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <Link
                href="/verify"
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-xs sm:text-sm font-extrabold uppercase tracking-wider group-hover:translate-x-1 transition-transform"
              >
                <span>Launch Gate Scanner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="block text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">Real-time attendance authentication</span>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════ 3. FAQ ACCORDION SECTION ═══════════════ */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20 font-black'
                    : 'bg-zinc-900/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Accordions */}
        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openAccordion === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isOpen
                      ? 'border-emerald-500/40 bg-zinc-950 shadow-xl'
                      : 'border-white/10 bg-zinc-950/60 hover:border-white/20'
                  }`}
                >
                  <button
                    onClick={() => setOpenAccordion(isOpen ? null : faq.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                      {faq.question}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 bg-emerald-500/20 border-emerald-500/30' : 'bg-white/5'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6 pt-1 border-t border-white/5 text-xs sm:text-sm text-zinc-300 font-normal leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 p-8 rounded-3xl border border-white/10 bg-zinc-950/40">
              <AlertCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="text-base font-bold text-white">No questions matched your search query</p>
              <p className="text-xs text-zinc-400 mt-1">Try clearing filters or search terms, or reach out to our team directly.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-4 px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>

      </section>

      {/* ═══════════════ 4. STILL NEED HELP PROMO ═══════════════ */}
      <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-950 to-emerald-950/40 p-8 sm:p-12 text-center overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-3">
            Still Have Questions or Facing a Matchday Issue?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            Our collegiate esports support marshals are available 24/7 during matchdays to assist captains, collegiate coordinators, and athletes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="blob-btn bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-7 py-3.5 text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/20 hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Contact Support Desk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="tel:+917993728522"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition hover:scale-105"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call +91 79937 28522</span>
            </a>
          </div>
        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
