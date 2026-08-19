'use client';

import Link from 'next/link';
import { useRouter, useParams, notFound } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  MapPin,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Crown,
  Medal,
  Award,
  FileText,
  Clock,
  Sparkles,
  Share2,
  Check
} from 'lucide-react';
import { tournaments } from '../data';
import FinalCTA from '@/components/xenova/FinalCTA';

interface TournamentPageParams {
  params?: Promise<{
    slug: string;
  }>;
}

interface RegistrationRecord {
  tournamentSlug: string;
  teamName: string;
  captainName: string;
  email: string;
  college: string;
  note?: string;
  registeredAt: string;
}

export default function TournamentDetailPage({ params: paramsPromise }: TournamentPageParams) {
  const urlParams = useParams();
  const rawSlug = (urlParams?.slug as string) || '';
  const [slug, setSlug] = useState(rawSlug);
  const router = useRouter();

  useEffect(() => {
    if (paramsPromise) {
      paramsPromise.then((p) => {
        if (p?.slug) setSlug(p.slug);
      }).catch(() => {});
    }
  }, [paramsPromise]);

  const [customTournaments, setCustomTournaments] = useState<any[]>([]);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [registered, setRegistered] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'prizes' | 'schedule' | 'teams' | 'rules'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);

  const [formValues, setFormValues] = useState({
    teamName: '',
    captainName: '',
    email: '',
    college: '',
    players: '',
    note: '',
  });

  useEffect(() => {
    try {
      // 1. Check logged-in user session
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        const user = JSON.parse(rawSession);
        setSessionUser(user);
        setFormValues((prev) => ({
          ...prev,
          captainName: user.name || user.tag || '',
          email: user.email || '',
          teamName: user.team || '',
          college: user.college || '',
        }));
      }

      // 2. Load custom tournaments
      const rawCustom = localStorage.getItem('xenova_tournaments');
      const loadedCustom = rawCustom ? JSON.parse(rawCustom) : [];
      setCustomTournaments(loadedCustom);

      // 3. Check existing registrations
      const rawRegs = localStorage.getItem('xenova_registrations');
      const regs: RegistrationRecord[] = rawRegs ? JSON.parse(rawRegs) : [];
      const userEmail = rawSession ? JSON.parse(rawSession).email?.toLowerCase() : '';
      if (userEmail && regs.some((r) => r.tournamentSlug === slug && r.email?.toLowerCase() === userEmail)) {
        setAlreadyRegistered(true);
      }
    } catch (e) {
      console.error(e);
    }
  }, [slug]);

  const tournament =
    customTournaments.find((item) => item.slug === slug) ||
    tournaments.find((item) => item.slug === slug) ||
    tournaments.find((item) => item.slug === rawSlug);

  if (!tournament && typeof window !== 'undefined' && slug) {
    notFound();
  }

  if (!tournament) {
    return null;
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');

    if (!sessionUser) {
      router.push('/login');
      return;
    }

    if (!formValues.teamName.trim() || !formValues.captainName.trim() || !formValues.email.trim()) {
      setErrorMsg('Team name, captain name, and email are required.');
      return;
    }

    try {
      const rawRegs = localStorage.getItem('xenova_registrations');
      const regs: RegistrationRecord[] = rawRegs ? JSON.parse(rawRegs) : [];

      const isDuplicate = regs.some(
        (r) =>
          r.tournamentSlug === slug &&
          (r.email.toLowerCase() === formValues.email.toLowerCase() ||
            r.teamName.toLowerCase() === formValues.teamName.toLowerCase())
      );

      if (isDuplicate) {
        setErrorMsg('Your team or email is already registered for this tournament.');
        return;
      }

      const newRecord: RegistrationRecord = {
        tournamentSlug: slug,
        teamName: formValues.teamName.trim(),
        captainName: formValues.captainName.trim(),
        email: formValues.email.trim(),
        college: formValues.college.trim(),
        note: formValues.note.trim(),
        registeredAt: new Date().toISOString(),
      };

      localStorage.setItem('xenova_registrations', JSON.stringify([...regs, newRecord]));

      const rawCustom = localStorage.getItem('xenova_tournaments');
      const loadedCustom = rawCustom ? JSON.parse(rawCustom) : [];
      const updatedCustom = loadedCustom.map((t: any) => {
        if (t.slug === slug) {
          const currentCount = parseInt(t.teams || '0') || 0;
          return { ...t, teams: `${currentCount + 1}/64` };
        }
        return t;
      });
      localStorage.setItem('xenova_tournaments', JSON.stringify(updatedCustom));

      setRegistered(true);
      setAlreadyRegistered(true);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to process registration. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. JAW-DROPPING CINEMATIC HERO BANNER ═══════════════ */}
      <section className="relative min-h-[480px] sm:min-h-[540px] w-full overflow-hidden border-b border-zinc-900 bg-black flex items-end">
        
        {/* Background Image Layer with Parallax Vignette */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={tournament.image}
            alt={tournament.title}
            className="h-full w-full object-cover filter brightness-75 saturate-125 scale-105"
          />
          {/* Multi-Layer Deep Vignette Shadows */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.85)_100%)]" />
        </div>

        {/* Back Link & Quick Actions */}
        <div className="absolute top-8 left-0 right-0 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tournaments
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Event'}
          </button>
        </div>

        {/* Hero Title & Meta Strip */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-28">
          <div className="space-y-4 max-w-4xl">
            
            {/* Badges Strip */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 backdrop-blur-md shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {tournament.status || 'REGISTRATION OPEN'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/80 border border-white/15 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-200 backdrop-blur-md">
                {tournament.game}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-amber-400 backdrop-blur-md">
                <Trophy className="h-3.5 w-3.5" /> Prize Pool {tournament.prize}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-2xl">
              {tournament.title || tournament.name}
            </h1>

            {/* Subtext info */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-zinc-300 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Hosted by {tournament.host}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CalendarDays className="h-4 w-4 text-emerald-400" /> {tournament.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <MapPin className="h-4 w-4 text-emerald-400" /> {tournament.region}
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ 2. NAVIGATION TAB SWITCHER ═══════════════ */}
      <section className="sticky top-0 z-30 border-b border-zinc-900 bg-black/90 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-4 overflow-x-auto py-3 no-scrollbar">
            {[
              { id: 'overview', label: 'Overview & Format', icon: Trophy },
              { id: 'prizes', label: 'Prize Pool', icon: Crown },
              { id: 'schedule', label: 'Schedule', icon: Clock },
              { id: 'teams', label: 'Varsity Teams', icon: Users },
              { id: 'rules', label: 'Rules & Anti-Cheat', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. MAIN DYNAMIC CONTENT & STICKY REGISTRATION ═══════════════ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN - DYNAMIC TABBED CONTENT (8 COLS) */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* TAB 1: OVERVIEW & FORMAT */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                {/* Description Box */}
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-4 shadow-2xl">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-emerald-400" /> Tournament Synopsis
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                    {tournament.description || "Compete in India's official collegiate esports league. Assemble your university squad, submit verified student credentials, and play through bracketed elimination rounds for varsity glory and direct cash rewards."}
                  </p>
                </div>

                {/* Bento Grid Specifications */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Match Mode</span>
                    <p className="text-sm font-black text-white">{tournament.format || '5v5 Tactical'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Slots Cap</span>
                    <p className="text-sm font-black text-white">{tournament.teams || '64 Squads'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Platform</span>
                    <p className="text-sm font-black text-white">PC / Verified</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#09090b] p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Anti-Cheat</span>
                    <p className="text-sm font-black text-emerald-400">Enforced</p>
                  </div>
                </div>

                {/* Visual Prize Breakdown Summary Card */}
                <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#09090b] to-black p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" /> Prize Distribution Breakdown
                    </h3>
                    <span className="text-xs font-black text-amber-400">{tournament.prize} Total</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs">
                    <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40">
                      <span className="block text-[9px] font-black text-amber-300 uppercase">1st Place (60%)</span>
                      <span className="text-sm font-black text-white">Gold Champions</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-700">
                      <span className="block text-[9px] font-black text-zinc-400 uppercase">2nd Place (25%)</span>
                      <span className="text-sm font-black text-white">Silver Trophy</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-900/20 border border-amber-800/50">
                      <span className="block text-[9px] font-black text-amber-600 uppercase">3rd Place (15%)</span>
                      <span className="text-sm font-black text-white">Bronze Squad</span>
                    </div>
                  </div>
                </div>

                {/* Tournament Highlights */}
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Key League Features</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-white/5 bg-zinc-950 flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold uppercase text-white">Verified Campus Rosters</h4>
                        <p className="text-xs text-zinc-400 mt-1">All participants must hold active university student credentials.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-white/5 bg-zinc-950 flex items-start gap-3">
                      <Zap className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold uppercase text-white">Automated Match Dispatch</h4>
                        <p className="text-xs text-zinc-400 mt-1">Server details and room codes are dispatched directly to team captains.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: PRIZE POOL PODIUM */}
            {activeTab === 'prizes' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Guaranteed Rewards</span>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Prize Distribution</h2>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-wider">
                      Total: {tournament.prize}
                    </span>
                  </div>

                  {/* Podium Display Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
                    
                    {/* 2nd Place */}
                    <div className="rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-800/40 via-zinc-900/60 to-black p-6 text-center space-y-4 shadow-xl order-2 md:order-1">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-700/30 border border-zinc-600 flex items-center justify-center text-zinc-300">
                        <Medal className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">RUNNERS UP</span>
                        <h3 className="text-xl font-black text-white mt-1">₹45,000</h3>
                        <p className="text-xs text-zinc-400 mt-1">+ Silver Trophy & Verified Badge</p>
                      </div>
                    </div>

                    {/* 1st Place - Gold Champion */}
                    <div className="rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/20 via-zinc-950 to-black p-8 text-center space-y-4 shadow-2xl shadow-amber-500/10 order-1 md:order-2 md:-translate-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300 shadow-lg">
                        <Crown className="w-9 h-9" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">NATIONAL CHAMPIONS</span>
                        <h3 className="text-3xl font-black text-white mt-1">₹75,000</h3>
                        <p className="text-xs text-amber-300/80 mt-1">+ Gold Trophy & Varsity Ring</p>
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="rounded-3xl border border-amber-800/50 bg-gradient-to-b from-amber-950/30 via-zinc-900/60 to-black p-6 text-center space-y-4 shadow-xl order-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-amber-600">
                        <Award className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">3RD PLACE</span>
                        <h3 className="text-xl font-black text-white mt-1">₹30,000</h3>
                        <p className="text-xs text-zinc-400 mt-1">+ Bronze Medal & Points</p>
                      </div>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 3: SCHEDULE */}
            {activeTab === 'schedule' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">Tournament Timeline & Phases</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-zinc-950">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm shrink-0 border border-emerald-500/30">
                        01
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">PHASE ONE</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Registration & Student Credentials Verification</h3>
                        <p className="text-xs text-zinc-400">Campus squad entries lock. All captain Discord tags and university student IDs are verified by match admins.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-zinc-950">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-black text-sm shrink-0 border border-blue-500/30">
                        02
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">PHASE TWO</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Swiss Bracket Qualifiers</h3>
                        <p className="text-xs text-zinc-400">Best-of-1 Swiss qualifying rounds across regional server hubs to determine the top 8 finalists.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-zinc-950">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm shrink-0 border border-amber-500/30">
                        03
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">PHASE THREE</span>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Grand Finals & Live Stream Telecast</h3>
                        <p className="text-xs text-zinc-400">Best-of-3 Grand Finals broadcasted live on Xenova Telecaster with professional casters and trophies.</p>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB 4: REGISTERED VARSITY SQUADS */}
            {activeTab === 'teams' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Verified Contenders</span>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0.5">Participating Campus Squads</h2>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                      48 / 64 Confirmed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {[
                      { name: 'IIT BOMBAY TITANS', college: 'IIT Bombay', captain: 'Shadow#IND', verified: true },
                      { name: 'BITS PILANI VIPERS', college: 'BITS Pilani', captain: 'ViperX#444', verified: true },
                      { name: 'DU ESPORTS HUB', college: 'Delhi University', captain: 'ApexLegend#999', verified: true },
                      { name: 'ANNA UNIV STRIKERS', college: 'Anna University', captain: 'Kaizen#777', verified: true },
                    ].map((squad) => (
                      <div key={squad.name} className="p-5 rounded-2xl border border-white/10 bg-zinc-950 flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">{squad.name}</h4>
                          <p className="text-xs text-zinc-400">{squad.college} • Capt: <span className="text-emerald-400">{squad.captain}</span></p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB 5: RULES & ANTI-CHEAT */}
            {activeTab === 'rules' && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-6 shadow-2xl">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white">Rulebook & Fair Play Enforcement</h2>
                  
                  <div className="space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                    <div className="p-4 rounded-2xl border border-white/5 bg-zinc-950">
                      <h4 className="font-bold text-white uppercase tracking-wider mb-1">1. Student ID & Campus Eligibility</h4>
                      <p className="text-zinc-400">All 5 active players on the roster must be currently enrolled full-time students at a recognized university.</p>
                    </div>

                    <div className="p-4 rounded-2xl border border-white/5 bg-zinc-950">
                      <h4 className="font-bold text-white uppercase tracking-wider mb-1">2. Anti-Cheat & Client Integrity</h4>
                      <p className="text-zinc-400">Xenova Anti-Cheat client monitoring is mandatory during all match sessions. Third-party software or exploits result in immediate team disqualification.</p>
                    </div>

                    <div className="p-4 rounded-2xl border border-white/5 bg-zinc-950">
                      <h4 className="font-bold text-white uppercase tracking-wider mb-1">3. Check-In & Punctuality</h4>
                      <p className="text-zinc-400">Teams must check in 20 minutes prior to scheduled match time on the official Xenova Discord server.</p>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </div>

          {/* RIGHT COLUMN - STICKY TICKET & REGISTRATION PASS CARD (4 COLS) */}
          <div className="lg:col-span-4 sticky top-24 z-20">
            <div className="rounded-3xl border border-white/15 bg-[#09090b] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
              
              {/* Header */}
              <div className="border-b border-white/10 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                    <CheckCircle2 className="h-3 w-3" /> OFFICIAL ENTRY PASS
                  </span>
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">{tournament.prize}</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{tournament.title || tournament.name}</h3>
                <p className="text-xs text-zinc-400">Free registration pass for verified university players.</p>
              </div>

              {/* Progress & Slots Fill */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-400 uppercase tracking-wider">Slot Reservations</span>
                  <span className="text-emerald-400">48 / 64 Teams Filled</span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-[75%] rounded-full" />
                </div>
              </div>

              {/* Form or Ticket Confirmation */}
              <div>
                {alreadyRegistered ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-3 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Pass Issued & Locked</h4>
                    <p className="text-xs text-zinc-300">Your varsity squad is officially registered. Check your Xenova dashboard for match lobby codes.</p>
                  </div>
                ) : registered ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 space-y-3 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Registration Confirmed!</h4>
                    <p className="text-xs text-zinc-300">Entry pass generated for squad <strong className="text-white">{formValues.teamName}</strong>.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Team Name
                        <input
                          value={formValues.teamName}
                          onChange={(e) => setFormValues({ ...formValues, teamName: e.target.value })}
                          placeholder="e.g. TITANS ESPORTS"
                          required
                          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                        />
                      </label>

                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Captain Handle / Name
                        <input
                          value={formValues.captainName}
                          onChange={(e) => setFormValues({ ...formValues, captainName: e.target.value })}
                          placeholder="Captain name"
                          required
                          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                        />
                      </label>

                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        University Email
                        <input
                          type="email"
                          value={formValues.email}
                          onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                          placeholder="captain@university.edu"
                          required
                          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
                        />
                      </label>
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-rose-400 font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{errorMsg}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 text-xs font-black uppercase tracking-wider shadow-xl shadow-emerald-500/30 hover:scale-[1.02] transition cursor-pointer"
                    >
                      Book Free Entry Pass
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-2 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">🔒 Anti-Cheat & Student Verification System Active</span>
              </div>

            </div>
          </div>

        </div>
      </div>

      <FinalCTA />
    </main>
  );
}
