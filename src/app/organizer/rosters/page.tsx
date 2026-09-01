'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Search,
  ChevronRight,
  ShieldCheck,
  Trophy,
  Download,
  Mail,
  Gamepad2,
  Building2,
  RefreshCw,
  Crown,
  UserCheck,
  Filter
} from 'lucide-react';
import { tournaments as defaultTournaments } from '@/app/tournaments/data';
import { getApiBaseUrl } from '@/lib/api-config';

interface Player {
  slot: number;
  player_name: string;
  in_game_tag: string;
  email: string;
  phone?: string;
  college?: string;
  is_captain?: boolean;
}

interface TeamRoster {
  pass_id: string;
  tournament_slug: string;
  tournament_title?: string;
  team_name: string;
  college: string;
  captain_name?: string;
  email?: string;
  registered_at?: string;
  players: Player[];
}

export default function OrganizerRostersHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('all');
  const [rosters, setRosters] = useState<TeamRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (userEmail: string, userRole: string, userName?: string) => {
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      const cleanName = (userName || '').trim().toLowerCase();
      const isAdmin = userRole === 'admin' || cleanEmail === 'admin@xenova.gg';

      // 1. Fetch tournaments from Supabase + Backend API
      let tournsList: any[] = [];
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: sbTourns } = await supabase.from('tournaments').select('*');
        if (sbTourns && Array.isArray(sbTourns) && sbTourns.length > 0) {
          tournsList = sbTourns;
        }
      } catch (sbErr) {
        console.warn('Supabase tournaments notice in rosters:', sbErr);
      }

      try {
        const tRes = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
        if (tRes.ok) {
          const tData = await tRes.json();
          if (tData.success && Array.isArray(tData.data) && tData.data.length > 0) {
            const seenSlugs = new Set(tournsList.map((t: any) => (t.slug || '').toLowerCase().trim()));
            for (const t of tData.data) {
              const s = (t.slug || '').toLowerCase().trim();
              if (s && !seenSlugs.has(s)) {
                tournsList.push(t);
                seenSlugs.add(s);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Notice loading tournaments:', e);
      }

      if (isAdmin && tournsList.length === 0) {
        tournsList = defaultTournaments;
      }

      // Filter tournaments strictly for this organizer
      if (!isAdmin) {
        tournsList = tournsList.filter((t: any) => {
          const createdBy = (t.createdBy || t.organizer_email || t.organizerEmail || t.contact_email || '').trim().toLowerCase();
          const host = (t.host || t.hostName || '').trim().toLowerCase();
          const emailMatch = cleanEmail && (createdBy === cleanEmail || host.includes(cleanEmail) || createdBy.includes(cleanEmail));
          const nameMatch = cleanName && (host === cleanName || host.includes(cleanName));
          return emailMatch || nameMatch;
        });
      }
      setTournaments(tournsList);

      // Collect all slugs, titles, and IDs of this organizer's tournaments
      const orgSlugs = new Set<string>();
      const orgTitles = new Set<string>();
      tournsList.forEach((t: any) => {
        if (t.slug) orgSlugs.add(t.slug.toLowerCase().trim());
        if (t.id) orgSlugs.add(String(t.id).toLowerCase().trim());
        if (t.title) orgTitles.add(t.title.toLowerCase().trim());
        if (t.name) orgTitles.add(t.name.toLowerCase().trim());
      });

      // 2. Fetch 4-player rosters from backend & Supabase
      let fetchedRosters: TeamRoster[] = [];
      try {
        const queryParams = !isAdmin && cleanEmail ? `?organizer_email=${encodeURIComponent(cleanEmail)}` : '';
        const rRes = await fetch(`${apiBase}/rosters${queryParams}`, { cache: 'no-store' });
        if (rRes.ok) {
          const rData = await rRes.json();
          if (rData.success && Array.isArray(rData.teams)) {
            fetchedRosters = rData.teams;
          }
        }
      } catch (rErr) {
        console.warn('Notice loading rosters from API:', rErr);
      }

      // Supabase fallback if API returned empty
      if (fetchedRosters.length === 0) {
        try {
          const { supabase } = await import('@/lib/supabase');
          const [regRes, rostRes] = await Promise.all([
            supabase.from('registrations').select('*'),
            supabase.from('tournament_rosters').select('*'),
          ]);

          if (regRes.data && Array.isArray(regRes.data)) {
            const rosterMap = new Map<string, any[]>();
            if (rostRes.data && Array.isArray(rostRes.data)) {
              for (const r of rostRes.data) {
                const pid = r.pass_id;
                if (!rosterMap.has(pid)) rosterMap.set(pid, []);
                rosterMap.get(pid)?.push(r);
              }
            }

            for (const reg of regRes.data) {
              const pid = reg.pass_id || reg.id;
              const slots = rosterMap.get(pid) || [];
              const p1 = slots.find((s: any) => s.slot === 1) || {};
              const p2 = slots.find((s: any) => s.slot === 2) || {};
              const p3 = slots.find((s: any) => s.slot === 3) || {};
              const p4 = slots.find((s: any) => s.slot === 4) || {};

              const regPlayers = Array.isArray(reg.players) ? reg.players : [];
              const rp1 = regPlayers[0] || {};
              const rp2 = regPlayers[1] || {};
              const rp3 = regPlayers[2] || {};
              const rp4 = regPlayers[3] || {};

              const playersList: Player[] = [
                {
                  slot: 1,
                  player_name: p1.player_name || p1.name || rp1.name || reg.captain_name || reg.name || 'Captain',
                  in_game_tag: p1.in_game_tag || p1.game_id || p1.inGameTag || rp1.inGameTag || reg.in_game_id || 'IGN_1',
                  email: p1.email || rp1.email || reg.email || 'captain@squad.gg',
                  is_captain: true,
                },
                {
                  slot: 2,
                  player_name: p2.player_name || p2.name || rp2.name || 'Player 2',
                  in_game_tag: p2.in_game_tag || p2.game_id || p2.inGameTag || rp2.inGameTag || 'IGN_2',
                  email: p2.email || rp2.email || 'p2@squad.gg',
                  is_captain: false,
                },
                {
                  slot: 3,
                  player_name: p3.player_name || p3.name || rp3.name || 'Player 3',
                  in_game_tag: p3.in_game_tag || p3.game_id || p3.inGameTag || rp3.inGameTag || 'IGN_3',
                  email: p3.email || rp3.email || 'p3@squad.gg',
                  is_captain: false,
                },
                {
                  slot: 4,
                  player_name: p4.player_name || p4.name || rp4.name || 'Player 4',
                  in_game_tag: p4.in_game_tag || p4.game_id || p4.inGameTag || rp4.inGameTag || 'IGN_4',
                  email: p4.email || rp4.email || 'p4@squad.gg',
                  is_captain: false,
                },
              ];

              fetchedRosters.push({
                pass_id: pid,
                tournament_slug: reg.tournament_slug || '',
                tournament_title: reg.tournament_title || '',
                team_name: reg.team_name || 'Squad Entry',
                college: reg.college || 'Collegiate Campus',
                captain_name: reg.captain_name || p1.player_name || p1.name || 'Captain',
                email: reg.email,
                registered_at: reg.registered_at || new Date().toISOString(),
                players: playersList,
              });
            }
          }
        } catch (sbErr) {
          console.warn('Supabase rosters fallback notice:', sbErr);
        }
      }

      // Filter rosters so only teams registered for this organizer's tournaments are kept
      if (!isAdmin) {
        fetchedRosters = fetchedRosters.filter((team) => {
          const teamSlug = (team.tournament_slug || '').toLowerCase().trim();
          const teamTitle = (team.tournament_title || '').toLowerCase().trim();
          return (
            (teamSlug && orgSlugs.has(teamSlug)) ||
            (teamTitle && orgTitles.has(teamTitle)) ||
            Array.from(orgSlugs).some((s) => s && (teamSlug === s || teamSlug.includes(s) || s.includes(teamSlug)))
          );
        });
      }

      setRosters(fetchedRosters);
    } catch (e) {
      console.error('Failed to load roster hub data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      const rawSession = localStorage.getItem('xenova_session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }
      try {
        const user = JSON.parse(rawSession);
        const email = (user.email || '').trim().toLowerCase();
        const role = (user.role || '').toLowerCase();

        // 1. Root Platform Admin
        if (role === 'admin' || email === 'admin@xenova.gg') {
          setSession(user);
          setAuthLoading(false);
          loadData(user.email, 'admin', user.name || user.hostName);
          return;
        }

        // 2. Check organizer status
        let isApprovedOrganizer = role === 'organizer' || role === 'host';
        let hostName = user.hostName || user.name || 'Verified Host';

        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('organizer_applications')
            .select('*')
            .eq('email', email);

          if (data && data.length > 0) {
            const app = data[0];
            const status = (app.status || '').toUpperCase();
            if (status === 'APPROVED') {
              isApprovedOrganizer = true;
              hostName = app.host_name || user.name || 'Verified Host';
            }
          }
        } catch (sbErr) {
          console.warn('Rosters organizer verification notice:', sbErr);
        }

        if (!isApprovedOrganizer) {
          try {
            const apiBase = getApiBaseUrl();
            const res = await fetch(`${apiBase}/auth/organizers`, { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                const matched = json.data.find(
                  (a: any) => (a.email || '').toLowerCase().trim() === email
                );
                if (matched) {
                  isApprovedOrganizer = true;
                  hostName = matched.name || matched.host_name || user.name;
                }
              }
            }
          } catch (apiErr) {
            console.warn('API organizer lookup notice:', apiErr);
          }
        }

        if (!isApprovedOrganizer) {
          router.replace('/organizer/apply');
          return;
        }

        const validSession = { ...user, role: 'organizer', hostName };
        setSession(validSession);
        setAuthLoading(false);
        loadData(validSession.email, 'organizer', validSession.hostName || validSession.name);
      } catch {
        router.replace('/login');
      }
    }
    checkAuth();
  }, [router]);

  // Filter rosters by selected tournament & search query
  const filteredRosters = rosters.filter((team) => {
    const teamSlug = (team.tournament_slug || '').toLowerCase().trim();
    const matchesTourn =
      selectedTournament === 'all' ||
      teamSlug === selectedTournament.toLowerCase().trim();

    if (!matchesTourn) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();

    const teamMatch =
      (team.team_name || '').toLowerCase().includes(q) ||
      (team.college || '').toLowerCase().includes(q) ||
      (team.pass_id || '').toLowerCase().includes(q);

    const playerMatch = team.players?.some(
      (p) =>
        (p.player_name || '').toLowerCase().includes(q) ||
        (p.in_game_tag || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
    );

    return teamMatch || playerMatch;
  });

  // Calculate total players count
  const totalPlayers = filteredRosters.reduce((acc, t) => acc + (t.players?.length || 0), 0);

  // CSV Export for 4-player rosters
  const handleExportCSV = () => {
    if (filteredRosters.length === 0) {
      alert('No roster data to export.');
      return;
    }

    const headers = [
      'Tournament',
      'Team Name',
      'College',
      'Pass ID',
      'Slot',
      'Role',
      'Player Name',
      'In-Game Tag (IGN)',
      'Player Email'
    ];

    const rows: string[][] = [];
    filteredRosters.forEach((t) => {
      (t.players || []).forEach((p) => {
        rows.push([
          `"${t.tournament_slug}"`,
          `"${t.team_name}"`,
          `"${t.college}"`,
          `"${t.pass_id}"`,
          `"${p.slot}"`,
          `"${p.slot === 1 ? 'Captain' : 'Player'}"`,
          `"${p.player_name}"`,
          `"${p.in_game_tag}"`,
          `"${p.email}"`
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rosters-${selectedTournament}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white selection:bg-indigo-500 selection:text-zinc-950 font-sans pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6">
          <Link
            href="/organizer/dashboard"
            className="inline-flex items-center gap-1 hover:text-white transition px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="text-indigo-400 font-black">Tournament Squad Rosters</span>
        </div>

        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0C111D] p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-wider">
                  <Users className="h-3.5 w-3.5" />
                  4-Player Squad Registry
                </span>
                {session?.email && session.role !== 'admin' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <UserCheck className="h-3.5 w-3.5" />
                    Host: {session.hostName || session.name || session.email}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
                Tournament Rosters Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                View, verify, and export all 4 registered squad players (Captain + 3 Teammates) across your hosted tournaments.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportCSV}
                disabled={totalPlayers === 0}
                className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-emerald-600/20"
              >
                <Download className="h-4 w-4" />
                Export CSV ({totalPlayers} Players)
              </button>

              <button
                onClick={() => session && loadData(session.email, session.role, session.hostName || session.name)}
                className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 transition text-xs font-bold uppercase tracking-wider text-slate-200 rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Filters & Search Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Tournament Selector */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-[#0C111D] border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm outline-none font-bold uppercase tracking-wider appearance-none cursor-pointer"
            >
              <option value="all">All Hosted Tournaments ({rosters.length} Squads)</option>
              {tournaments.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title || t.name} ({t.game})
                </option>
              ))}
            </select>
          </div>

          {/* Player / Team Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Player Name, In-Game Tag (IGN), Email, Team Name, or Pass ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-[#0C111D] border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-sm outline-none font-medium placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Rosters List */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading 4-Player Rosters...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="border border-dashed border-white/10 bg-[#0C111D] p-16 rounded-3xl text-center space-y-4">
            <Trophy className="h-12 w-12 text-indigo-400 mx-auto" />
            <h3 className="text-lg font-black uppercase text-white">No Hosted Tournaments Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              You haven&apos;t launched any tournaments under this organizer account. Launch a tournament to start collecting team registrations, managing 4-player rosters, and verifying squad in-game tags.
            </p>
            <div className="pt-2">
              <Link
                href="/organizer/tournament/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-600/25"
              >
                <Trophy className="h-4 w-4" /> Launch Your First Tournament
              </Link>
            </div>
          </div>
        ) : filteredRosters.length === 0 ? (
          <div className="border border-dashed border-white/10 bg-[#0C111D] p-16 rounded-3xl text-center space-y-3">
            <Users className="h-12 w-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No squad rosters found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No registered 4-player teams match the selected tournament filter or search query for your hosted events.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRosters.map((team, idx) => (
              <motion.article
                key={team.pass_id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-white/10 bg-[#0C111D] rounded-3xl overflow-hidden shadow-xl p-6 space-y-5"
              >
                {/* Team Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-white font-black text-lg shrink-0">
                      {team.team_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                          {team.team_name}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                          {team.college || 'University'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-500">Pass: {team.pass_id}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold uppercase text-[11px]">{team.tournament_slug}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/organizer/tournament/${team.tournament_slug}/attendance`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition w-fit"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Check-in Desk
                  </Link>
                </div>

                {/* 4-Player Roster Table / Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(team.players && team.players.length > 0 ? team.players : [
                    { slot: 1, player_name: 'Captain', in_game_tag: 'IGN_1', email: 'captain@squad.gg', is_captain: true },
                    { slot: 2, player_name: 'Player 2', in_game_tag: 'IGN_2', email: 'p2@squad.gg', is_captain: false },
                    { slot: 3, player_name: 'Player 3', in_game_tag: 'IGN_3', email: 'p3@squad.gg', is_captain: false },
                    { slot: 4, player_name: 'Player 4', in_game_tag: 'IGN_4', email: 'p4@squad.gg', is_captain: false },
                  ]).map((p) => {
                    const isCap = p.slot === 1 || p.is_captain;
                    return (
                      <div
                        key={p.slot}
                        className={`p-4 rounded-2xl border transition ${
                          isCap
                            ? 'bg-gradient-to-br from-amber-500/10 via-black/40 to-black/40 border-amber-500/30'
                            : 'bg-black/30 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isCap
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-white/10 text-slate-300 border border-white/10'
                            }`}
                          >
                            {isCap ? <Crown className="h-2.5 w-2.5 text-amber-400" /> : null}
                            {isCap ? 'Captain' : `Player ${p.slot}`}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">Slot #{p.slot}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="font-black text-sm text-white truncate" title={p.player_name}>
                            {p.player_name}
                          </div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-indigo-300 font-bold truncate max-w-full">
                            <Gamepad2 className="h-3 w-3 shrink-0 text-indigo-400" />
                            {p.in_game_tag}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-1 truncate" title={p.email}>
                            <Mail className="h-3 w-3 shrink-0 text-slate-500" />
                            <span className="truncate">{p.email}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
