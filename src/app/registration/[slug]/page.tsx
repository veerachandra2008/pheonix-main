'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Trophy,
  Users,
  CalendarDays,
  MapPin,
  Zap,
  ShieldCheck,
  ChevronRight,
  CircleDot,
  Clock,
} from 'lucide-react';
import { tournaments } from '@/app/tournaments/data';
import { getAllTeams, saveCustomTeams, getCustomTeams, slugify } from '@/lib/xenova-data';
import { Plus, X, ShieldAlert } from 'lucide-react';

interface PageProps {
  params?: Promise<{ slug: string }>;
}

const GAME_IMAGES: Record<string, string> = {
  Valorant: '/valorant.jpg',
  VALORANT: '/valorant.jpg',
  BGMI: '/bgmi.jpg',
  'Free Fire': '/freefire.jpg',
  CS2: '/cs2.jpg',
  'Apex Legends': '/apex.jpg',
  'FC / FIFA': '/fc.jpg',
  default: '/hero-arena.jpg',
};

export default function RegistrationStep1({ params: paramsPromise }: PageProps) {
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

  const [tournament, setTournament] = useState<any>(() => tournaments.find((t) => t.slug === rawSlug) || null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  // Custom team modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCollege, setNewTeamCollege] = useState('');
  const [newTeamGame, setNewTeamGame] = useState('');
  const [rosterInputs, setRosterInputs] = useState<string[]>(['', '', '', '']);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (!rawSession) { router.replace('/login'); return; }
    const user = JSON.parse(rawSession);
    setSession(user);

    async function loadData() {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      // 1. Fetch tournament
      try {
        const tournRes = await fetch(`${apiBase}/tournaments/`);
        const tournData = await tournRes.json();
        if (tournData.success && Array.isArray(tournData.data)) {
          const found = tournData.data.find((t: any) => t.slug === slug);
          if (found) {
            setTournament(found);
            if (found.game) setNewTeamGame(found.game);
          }
        }
      } catch (e) {
        console.error('Failed to load tournament from database:', e);
      }

      // 2. Fetch teams
      try {
        const teamsRes = await fetch(`${apiBase}/teams/`);
        const teamsData = await teamsRes.json();
        if (teamsData.success && Array.isArray(teamsData.data)) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const userTeams = teamsData.data.filter((t: any) => {
            const created = (t.created_by || t.createdBy || '').toLowerCase().trim();
            const cap = (t.captain_email || t.captainEmail || '').toLowerCase().trim();
            return created === userEmail || cap === userEmail || t.captain === user.name;
          });
          const list = userTeams.length > 0 ? userTeams : teamsData.data;
          setMyTeams(list);
          if (list.length > 0) setSelectedTeam(list[0]);
        }
      } catch (e) {
        console.error('Failed to load teams from database:', e);
      }
    }

    loadData();
  }, [slug, router]);

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) { setCreateError('Team name is required.'); return; }
    setCreatingTeam(true);
    setCreateError('');

    const collegeName = newTeamCollege.trim() || session?.college || 'Independent';
    const teamSlug = slugify(newTeamName);
    const validRoster = rosterInputs.filter((r) => r.trim() !== '');

    const newTeamObj = {
      slug: teamSlug,
      name: newTeamName.trim(),
      college: collegeName,
      game: newTeamGame || tournament?.game || 'Valorant',
      rank: 10,
      win_rate: 100,
      streak: 'W1',
      captain: session?.name || 'Captain',
      captain_email: session?.email || '',
      created_by: session?.email || '',
      trophies: 0,
      members: 1 + validRoster.length,
      recent_wins: 0,
      form: ['W'],
      active_score: 100,
      joined: 2026,
      accent: '#22c55e',
      roster: validRoster,
      verified: true,
      verification_status: 'approved',
    };

    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      await fetch(`${apiBase}/teams/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamObj),
      });

      // Update state & auto select
      const updatedList = [newTeamObj, ...myTeams];
      setMyTeams(updatedList);
      setSelectedTeam(newTeamObj);
      setShowCreateModal(false);
      setNewTeamName('');
      setRosterInputs(['', '', '', '']);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create team.');
    } finally {
      setCreatingTeam(false);
    }
  };


  const handleContinue = () => {
    if (!selectedTeam || !tournament) return;
    // Persist selection to sessionStorage for next step
    sessionStorage.setItem('reg_selection', JSON.stringify({
      tournamentSlug: tournament.slug,
      tournamentTitle: tournament.title || tournament.name,
      tournamentGame: tournament.game,
      tournamentPrize: tournament.prize,
      tournamentDate: tournament.date,
      tournamentFormat: tournament.format,
      tournamentRegion: tournament.region,
      tournamentFee: tournament.fee,
      tournamentImage: tournament.image,
      teamId: selectedTeam.id || selectedTeam.name,
      teamName: selectedTeam.name,
      college: selectedTeam.college || session?.college || '',
      captainName: session?.name || '',
      email: session?.email || '',
    }));
    router.push(`/registration/${slug}/confirm`);
  };

  if (!tournament) {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Loading tournament...</p>
        </div>
      </main>
    );
  }

  const gameImage = tournament.image || GAME_IMAGES[tournament.game] || GAME_IMAGES.default;
  const slotsLeft = tournament.teams
    ? (() => { const parts = tournament.teams.split('/'); return parseInt(parts[1]) - parseInt(parts[0]); })()
    : null;

  return (
    <main className="min-h-screen bg-[#09090b] text-white font-sans">

      {/* ─── STICKY TOP NAV ─── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>

          {/* Step Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {['Select Team', 'Verify Squad', 'Entry Pass'].map((label, i) => (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  i === 0
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'text-zinc-600 border border-white/[0.06]'
                }`}>
                  <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                    i === 0 ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-600'
                  }`}>{i + 1}</span>
                  {label}
                </div>
                {i < 2 && <div className="w-4 h-px bg-white/[0.08]" />}
              </React.Fragment>
            ))}
          </div>

          <div className="text-xs text-zinc-600 font-medium">Step 1 of 3</div>
        </div>
      </nav>

      {/* ─── SPLIT LAYOUT ─── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* ── LEFT: Tournament Showcase (7 cols) ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Hero Image Card */}
            <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden">
              <img
                src={gameImage}
                alt={tournament.game}
                className="w-full h-full object-cover brightness-[0.55] saturate-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-black/30 to-transparent" />

              {/* Status chip */}
              <div className="absolute top-5 left-5 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-md border ${
                  tournament.status === 'Live'
                    ? 'bg-black/70 border-red-500/40 text-red-400'
                    : tournament.status === 'Registering'
                    ? 'bg-black/70 border-emerald-500/40 text-emerald-400'
                    : 'bg-black/70 border-sky-500/40 text-sky-400'
                }`}>
                  <CircleDot className="h-3 w-3" />
                  {tournament.status}
                </span>
                <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-black/70 border border-white/15 text-zinc-300 backdrop-blur-md">
                  {tournament.game}
                </span>
              </div>

              {/* Prize Pool overlay */}
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Prize Pool</p>
                  <p className="text-3xl font-black text-white">{tournament.prize}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Entry</p>
                  <p className="text-lg font-black text-emerald-400">{tournament.fee}</p>
                </div>
              </div>
            </div>

            {/* Tournament Title + Host */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {tournament.title || tournament.name}
              </h1>
              <p className="text-sm text-zinc-400">
                Hosted by <span className="text-white font-semibold">{tournament.host || 'Xenova'}</span>
              </p>
            </div>

            {/* Stat chips grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: 'Date', value: tournament.date },
                { icon: MapPin, label: 'Region', value: tournament.region },
                { icon: Trophy, label: 'Format', value: tournament.format },
                { icon: Users, label: 'Teams', value: tournament.teams },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm"
                >
                  <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.07]">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Slots progress */}
            {tournament.filled !== undefined && (
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Slots Filling Fast</span>
                  </div>
                  {slotsLeft !== null && (
                    <span className="text-xs font-bold text-amber-400">{slotsLeft} slots left</span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${tournament.filled}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">{tournament.filled}% capacity reserved</p>
              </div>
            )}

            {/* What you get strip */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">What's Included</p>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                {[
                  'Verified bracket placement',
                  'Anti-cheat integration',
                  'Live match updates',
                  'Digital trophy on win',
                  'Official leaderboard ELO',
                  'Direct prize payout',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-zinc-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Team Selector (5 cols) ── */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-5">

              {/* Glass panel header */}
              <div className="p-6 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                      <Zap className="h-3 w-3" />
                      Register Your Squad
                    </div>
                    <h2 className="text-lg font-black text-white">Select your team</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Choose or create a team for this tournament.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold transition shrink-0 mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Team
                  </button>
                </div>

                {/* Captain info strip */}
                {session && (
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm shrink-0">
                      {session.name?.slice(0, 2).toUpperCase() || 'XP'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{session.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{session.email}</p>
                    </div>
                    <div className="ml-auto shrink-0">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>
                )}

                {/* Team cards */}
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {myTeams.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
                      <Users className="h-8 w-8 text-zinc-600 mx-auto" />
                      <div>
                        <p className="text-sm font-semibold text-white">No teams found</p>
                        <p className="text-xs text-zinc-500 mt-1">Create your custom squad to register.</p>
                      </div>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Create Custom Team
                      </button>
                    </div>
                  ) : (
                    myTeams.map((team) => {
                      const isSelected = selectedTeam?.name === team.name;
                      return (
                        <button
                          key={team.name}
                          onClick={() => setSelectedTeam(team)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                              : 'bg-white/[0.02] border-white/[0.07] hover:border-white/15 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400'
                            }`}>
                              {team.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                  {team.name}
                                </p>
                                {team.isCustom && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 uppercase">Custom</span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate">{team.college}</p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Continue CTA */}
                <button
                  onClick={handleContinue}
                  disabled={!selectedTeam}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-black font-black text-sm uppercase tracking-wider hover:bg-emerald-400 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  Continue to Squad Verification
                  <ChevronRight className="h-4 w-4" />
                </button>

                <p className="text-center text-[11px] text-zinc-600">
                  All registrations are verified against student ID records.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ─── CREATE CUSTOM TEAM MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#111115] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Create Custom Team</h3>
                  <p className="text-xs text-zinc-400">Register a new squad for {tournament?.title || 'this tournament'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error banner */}
            {createError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phoenix Knights"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">College / Institution</label>
                  <input
                    type="text"
                    placeholder={session?.college || 'Your College'}
                    value={newTeamCollege}
                    onChange={(e) => setNewTeamCollege(e.target.value)}
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Game</label>
                  <input
                    type="text"
                    value={newTeamGame || tournament?.game || 'Valorant'}
                    onChange={(e) => setNewTeamGame(e.target.value)}
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Roster Teammates */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Roster Players (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {rosterInputs.map((val, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Player ${idx + 2} IGN`}
                      value={val}
                      onChange={(e) => {
                        const updated = [...rosterInputs];
                        updated[idx] = e.target.value;
                        setRosterInputs(updated);
                      }}
                      className="rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition"
                    />
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl border border-white/10 text-zinc-400 hover:text-white text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTeam}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition disabled:opacity-50"
                >
                  {creatingTeam ? 'Creating...' : 'Create & Select Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

