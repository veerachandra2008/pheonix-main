'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trophy,
  Zap,
  Calendar,
  MapPin,
  Mail,
  User,
  Hash,
  Phone,
  Sparkles,
  ChevronRight,
  School
} from 'lucide-react';
import { tournaments } from '../../tournaments/data';

interface PlayerSlot {
  slot: number;
  name: string;
  inGameTag: string;
  email: string;
  phone?: string;
  isCaptain: boolean;
}

export default function RegistrationStepOne() {
  const router = useRouter();
  const params = useParams();
  const rawSlug = (params?.slug as string) || '';
  const slug = rawSlug;

  const [tournament, setTournament] = useState<any>(() => tournaments.find((t) => t.slug === rawSlug) || null);
  const [session, setSession] = useState<any>(null);

  // 4-Player Squad Details
  const [teamName, setTeamName] = useState('');
  const [college, setCollege] = useState('');
  
  // Exactly 4 Players (Counting Captain as Slot 1)
  const [players, setPlayers] = useState<PlayerSlot[]>([
    { slot: 1, name: '', inGameTag: '', email: '', phone: '', isCaptain: true },
    { slot: 2, name: '', inGameTag: '', email: '', isCaptain: false },
    { slot: 3, name: '', inGameTag: '', email: '', isCaptain: false },
    { slot: 4, name: '', inGameTag: '', email: '', isCaptain: false },
  ]);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (!rawSession) {
      router.replace('/login');
      return;
    }
    const user = JSON.parse(rawSession);
    setSession(user);

    // Prefill Captain (Player 1) & Team from session if available
    setTeamName(user.team || '');
    setCollege(user.college || '');
    setPlayers((prev) => [
      {
        ...prev[0],
        name: user.name || '',
        email: user.email || '',
        inGameTag: user.tag || '',
        phone: user.phone || '',
      },
      prev[1],
      prev[2],
      prev[3],
    ]);

    async function loadTournamentData() {
      const apiBase = process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';
      try {
        const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const found = data.data.find((t: any) => t.slug === slug || String(t.id) === slug);
          if (found) setTournament(found);
        }
      } catch (e) {
        console.error('Failed to load tournament:', e);
      }
    }

    loadTournamentData();
  }, [slug, router]);

  const handlePlayerChange = (slotIndex: number, field: keyof PlayerSlot, value: string) => {
    setPlayers((prev) => {
      const updated = [...prev];
      updated[slotIndex] = { ...updated[slotIndex], [field]: value };
      return updated;
    });
    setErrorMsg('');
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!teamName.trim()) {
      setErrorMsg('Please enter your Squad / Team Name.');
      return;
    }

    if (!college.trim()) {
      setErrorMsg('Please enter your University / College Campus.');
      return;
    }

    // Validate ALL 4 Players
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsUsed = new Set<string>();

    for (let i = 0; i < 4; i++) {
      const p = players[i];
      const slotNum = i + 1;
      const roleLabel = i === 0 ? 'Captain (Player 1)' : `Player ${slotNum}`;

      if (!p.name.trim()) {
        setErrorMsg(`Please enter Full Name for ${roleLabel}.`);
        return;
      }
      if (!p.inGameTag.trim()) {
        setErrorMsg(`Please enter In-Game Tag / IGN for ${roleLabel}.`);
        return;
      }
      if (!p.email.trim()) {
        setErrorMsg(`Please enter Email Address for ${roleLabel}. All 4 players require unique emails.`);
        return;
      }
      if (!emailRegex.test(p.email.trim())) {
        setErrorMsg(`Invalid email format for ${roleLabel}: "${p.email.trim()}".`);
        return;
      }

      const lowerEmail = p.email.trim().toLowerCase();
      if (emailsUsed.has(lowerEmail)) {
        setErrorMsg(`Duplicate email found: "${p.email.trim()}". Each of the 4 players must have their own unique email address.`);
        return;
      }
      emailsUsed.add(lowerEmail);
    }

    // Persist full 4-player squad to sessionStorage
    const selectionPayload = {
      tournamentSlug: tournament?.slug || slug,
      tournamentTitle: tournament?.title || tournament?.name || 'Esports Championship',
      tournamentGame: tournament?.game || 'Valorant',
      tournamentPrize: tournament?.prize || 'Verified Prize Pool',
      tournamentDate: tournament?.date || 'Upcoming',
      tournamentFormat: tournament?.format || '4v4 Squad Match',
      tournamentRegion: tournament?.region || 'Pan India',
      tournamentFee: tournament?.fee || 'Free',
      tournamentImage: tournament?.image || '/hero-arena.jpg',
      teamName: teamName.trim(),
      college: college.trim(),
      captainName: players[0].name.trim(),
      captainEmail: players[0].email.trim(),
      email: players[0].email.trim(),
      captainPhone: players[0].phone?.trim() || '',
      players: players.map((p) => ({
        slot: p.slot,
        name: p.name.trim(),
        inGameTag: p.inGameTag.trim(),
        email: p.email.trim(),
        phone: p.phone?.trim() || '',
        isCaptain: p.isCaptain,
      })),
      playerEmails: Array.from(emailsUsed),
    };

    sessionStorage.setItem('reg_selection', JSON.stringify(selectionPayload));
    router.push(`/registration/${slug}/confirm`);
  };

  if (!tournament) {
    return (
      <main className="min-h-screen bg-[#070B14] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Loading Tournament Details...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white font-sans selection:bg-emerald-500 selection:text-zinc-950 pb-20">
      
      {/* ─── STICKY TOP NAV ─── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0C111D]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href={`/tournaments/${tournament.slug}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lobby
          </Link>

          {/* Step Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {[
              { num: 1, label: '4-Player Roster', active: true },
              { num: 2, label: 'Review & Verify', active: false },
              { num: 3, label: 'Entry Pass Pass', active: false },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    step.active
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'text-slate-500 border border-white/5'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                      step.active ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {step.num}
                  </span>
                  {step.label}
                </div>
                {idx < 2 && <div className="w-4 h-px bg-white/10" />}
              </React.Fragment>
            ))}
          </div>

          <span className="text-xs font-mono text-emerald-400 font-bold">Step 1 of 3</span>
        </div>
      </nav>

      {/* ─── MAIN CONTAINER ─── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10">
        <form onSubmit={handleContinue} className="space-y-10">
          
          {/* Header Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="h-4 w-4" />
              <span>Official Squad Registration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              {tournament.title || tournament.name}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Register exactly <strong className="text-emerald-400">4 players (Captain + 3 Teammates)</strong>. All 4 members must provide their full names, in-game tags, and valid student emails.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ═══════════════ SQUAD INFO CARD ═══════════════ */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0C111D] border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" /> 1. Squad Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Squad / Team Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => { setTeamName(e.target.value); setErrorMsg(''); }}
                  placeholder="e.g. TEAM TITANS"
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm font-bold uppercase outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <School className="h-3.5 w-3.5 text-emerald-400" /> University / College <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => { setCollege(e.target.value); setErrorMsg(''); }}
                  placeholder="e.g. Nexus Institute of Technology"
                  required
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* ═══════════════ EXACTLY 4 SQUAD PLAYERS ═══════════════ */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> 2. Four Squad Members (All 4 Required)
              </h3>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase rounded-full">
                4 / 4 Roster Slots
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {players.map((player, idx) => {
                const isCap = idx === 0;
                return (
                  <motion.div
                    key={player.slot}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-6 rounded-3xl border shadow-xl relative space-y-4 ${
                      isCap
                        ? 'bg-gradient-to-b from-emerald-500/10 via-[#0C111D] to-[#0C111D] border-emerald-500/40'
                        : 'bg-[#0C111D] border-white/10'
                    }`}
                  >
                    {/* Header badge */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        isCap
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {isCap ? '👑 Player 1 (Captain)' : `Player ${player.slot}`}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">Slot {player.slot}</span>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" /> Full Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)}
                        placeholder={isCap ? "e.g. Rahul Sharma" : `e.g. Teammate ${player.slot} Name`}
                        required
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* In-Game Tag / IGN */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Hash className="h-3 w-3 text-emerald-400" /> In-Game Tag / IGN <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={player.inGameTag}
                        onChange={(e) => handlePlayerChange(idx, 'inGameTag', e.target.value)}
                        placeholder="e.g. TITAN#9999 or VIPER_OP"
                        required
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono font-bold outline-none focus:border-emerald-500 uppercase"
                      />
                    </div>

                    {/* Player Email (MANDATORY FOR ALL 4 PLAYERS) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-amber-400" /> Student Email Address <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={player.email}
                        onChange={(e) => handlePlayerChange(idx, 'email', e.target.value)}
                        placeholder={`player${player.slot}@university.edu`}
                        required
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Phone for Captain */}
                    {isCap && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-emerald-400" /> Captain Phone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={player.phone || ''}
                          onChange={(e) => handlePlayerChange(idx, 'phone', e.target.value)}
                          placeholder="+91 9876543210"
                          className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════ BOTTOM ACTION ═══════════════ */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              Registration Fee: <strong className="text-white">{tournament.fee || 'Free'}</strong> · Prize Pool: <strong className="text-amber-400">{tournament.prize}</strong>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              Verify 4-Player Squad
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        </form>
      </div>

    </main>
  );
}
