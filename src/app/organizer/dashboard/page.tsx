'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Trophy, 
  Users, 
  Trash2,
  Calendar,
  DollarSign,
  Eye,
  Gamepad2,
  MapPin,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function OrganizerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const loadData = async (userEmail: string, userRole: string, userName?: string) => {
    setLoading(true);
    try {
      let allTournaments: any[] = [];
      let allRegistrations: any[] = [];

      // 1. Direct Supabase Query
      try {
        const { supabase } = await import('@/lib/supabase');
        const [sbTournRes, sbRegRes] = await Promise.all([
          supabase.from('tournaments').select('*'),
          supabase.from('registrations').select('*'),
        ]);
        if (sbTournRes.data && Array.isArray(sbTournRes.data)) {
          allTournaments = sbTournRes.data;
        }
        if (sbRegRes.data && Array.isArray(sbRegRes.data)) {
          allRegistrations = sbRegRes.data;
        }
      } catch (sbErr) {
        console.warn('Dashboard Supabase fetch notice:', sbErr);
      }

      // 2. Fetch from API
      try {
        const apiBase =
          typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? '/api'
            : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

        const [tournRes, regRes] = await Promise.all([
          fetch(`${apiBase}/tournaments/`, { cache: 'no-store' }),
          fetch(`${apiBase}/registrations`, { cache: 'no-store' }),
        ]);

        if (tournRes.ok) {
          const tournData = await tournRes.json();
          if (tournData.success && Array.isArray(tournData.data) && tournData.data.length > 0) {
            // Merge unique
            const seenSlugs = new Set(allTournaments.map((t: any) => t.slug));
            for (const t of tournData.data) {
              if (!seenSlugs.has(t.slug)) {
                allTournaments.push(t);
                seenSlugs.add(t.slug);
              }
            }
          }
        }

        if (regRes.ok) {
          const regData = await regRes.json();
          if (regData.success && Array.isArray(regData.data)) {
            allRegistrations = regData.data;
          }
        }
      } catch (apiErr) {
        console.warn('Dashboard API fetch notice:', apiErr);
      }

      setRegistrations(allRegistrations);

      // Filter: Show only tournaments hosted / created by this organizer
      if (userRole !== 'admin') {
        const cleanEmail = (userEmail || '').trim().toLowerCase();
        const cleanName = (userName || '').trim().toLowerCase();
        allTournaments = allTournaments.filter((t: any) => {
          const createdBy = (t.createdBy || t.organizer_email || '').trim().toLowerCase();
          const host = (t.host || '').trim().toLowerCase();
          const emailMatch = cleanEmail && (createdBy === cleanEmail || host.includes(cleanEmail));
          const nameMatch = cleanName && (host === cleanName || host.includes(cleanName));
          return emailMatch || nameMatch;
        });
      }

      setTournaments(allTournaments);
    } catch (e) {
      console.error('Failed to load organizer data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function verifyAndLoad() {
      const rawSession = localStorage.getItem('xenova_session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }

      try {
        const user = JSON.parse(rawSession);
        const email = (user.email || '').trim().toLowerCase();
        const role = (user.role || '').toLowerCase();

        // 1. Root Platform Admin always has full access
        if (role === 'admin' || email === 'admin@xenova.gg') {
          setSession(user);
          loadData(user.email, 'admin', user.name);
          return;
        }

        let isApprovedOrganizer = role === 'organizer' || role === 'host';
        let hostName = user.hostName || user.name || 'Verified Host';

        // 2. Real-time Supabase Database Check on organizer_applications
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
          console.warn('Dashboard organizer verification notice:', sbErr);
        }

        // 3. Fallback to API Organizers Check if Supabase direct check was empty
        if (!isApprovedOrganizer) {
          try {
            const apiBase =
              typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                ? '/api'
                : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

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
          // Demote session role to player in localStorage and route to apply form
          const updatedSession = { ...user, role: 'player' };
          delete updatedSession.hostName;
          localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
          window.dispatchEvent(new Event('xenova-auth-change'));
          router.replace('/organizer/apply');
          return;
        }

        const validSession = { ...user, role: 'organizer', hostName };
        localStorage.setItem('xenova_session', JSON.stringify(validSession));
        setSession(validSession);
        loadData(validSession.email, 'organizer', validSession.name);
      } catch {
        router.replace('/login');
      }
    }

    verifyAndLoad();
  }, [router]);

  const handleDeleteTournament = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete your tournament "${title}" from the database?`)) return;

    setDeletingSlug(slug);
    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const res = await fetch(`${apiBase}/tournaments/${slug}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Tournament "${title}" deleted successfully.`);
      }
      if (session) {
        await loadData(session.email, session.role, session.name);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete tournament');
    } finally {
      setDeletingSlug(null);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Compute metrics for my hosted tournaments
  const myTotalRegistrations = registrations.filter((r) => {
    const rSlug = (r.tournament_slug || r.tournamentSlug || '').toLowerCase();
    return tournaments.some((t) => (t.slug || '').toLowerCase() === rSlug);
  }).length;

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition"
              >
                <ArrowLeft className="h-4 w-4" /> Player Dashboard
              </Link>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
              Organizer Dashboard
              <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Verified Host
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Host: <strong className="text-white">{session.name || session.email}</strong> • Managing your hosted tournaments and player rosters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(session.email, session.role, session.name)}
              disabled={loading}
              className="p-3 bg-[#0C111D] border border-white/10 hover:border-white/20 text-slate-300 rounded-xl transition cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <Link
              href="/organizer/tournament/create"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/25"
            >
              <Plus className="h-4 w-4" />
              Launch Tournament
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-indigo-400" /> My Hosted Tournaments
            </span>
            <p className="text-3xl font-black italic text-white">{tournaments.length}</p>
            <p className="text-xs text-slate-500">Active in database</p>
          </div>

          <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-400" /> Total Registered Squads
            </span>
            <p className="text-3xl font-black italic text-white">{myTotalRegistrations}</p>
            <p className="text-xs text-slate-500">Across my hosted arenas</p>
          </div>

          <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Organizer Status
            </span>
            <p className="text-3xl font-black italic text-white">Active</p>
            <p className="text-xs text-emerald-400 font-bold">Cleared for match hosting</p>
          </div>
        </section>

        {/* Quick Operations Hub Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/organizer/rosters"
            className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-[#0C111D] to-[#0C111D] hover:border-indigo-500/60 transition group flex items-center justify-between shadow-lg"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Users className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black uppercase tracking-tight text-white group-hover:text-indigo-300 transition">
                  Squad Rosters Hub
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                View & export all 4 registered players (Captain + Teammates) across all tournaments.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-xs font-bold uppercase tracking-wider group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
              Open Rosters →
            </div>
          </Link>

          <Link
            href="/organizer/attendance"
            className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#0C111D] to-[#0C111D] hover:border-emerald-500/60 transition group flex items-center justify-between shadow-lg"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black uppercase tracking-tight text-white group-hover:text-emerald-300 transition">
                  Event Attendance Hub
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Live match-day check-in desk, QR ticket verification, and no-show tracker.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs font-bold uppercase tracking-wider group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
              Open Attendance →
            </div>
          </Link>
        </section>

        {/* Tournaments Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-indigo-400" /> My Hosted Tournaments ({tournaments.length})
            </h2>
            <span className="text-xs text-slate-500">
              Only tournaments created by you are displayed and manageable here.
            </span>
          </div>

          {loading ? (
            <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading your tournaments from database...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="border border-dashed border-white/10 bg-[#0C111D] p-16 rounded-3xl text-center space-y-4">
              <Trophy className="h-12 w-12 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">No tournaments hosted yet</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Launch your first tournament to start accepting registrations and generating brackets.
                </p>
              </div>
              <Link
                href="/organizer/tournament/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/25"
              >
                <Plus className="h-4 w-4" />
                Launch First Tournament
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament, index) => {
                const tournamentSlug = tournament.slug;
                const regCount = registrations.filter((r) => {
                  const rSlug = (r.tournament_slug || r.tournamentSlug || '').toLowerCase();
                  return rSlug === (tournamentSlug || '').toLowerCase();
                }).length;

                return (
                  <motion.article
                    key={tournamentSlug || tournament.id || `t-${index}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-white/10 bg-[#0C111D] rounded-3xl overflow-hidden shadow-xl hover:border-white/20 transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Banner */}
                      <div className="relative h-44 w-full overflow-hidden bg-black">
                        <img
                          src={tournament.image || '/hero-arena.jpg'}
                          alt={tournament.title || tournament.name}
                          className="h-full w-full object-cover filter brightness-90 group-hover:scale-105 transition duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0C111D] via-black/30 to-transparent" />
                        
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-black/80 backdrop-blur-md text-indigo-400 border border-indigo-500/30">
                            {tournament.game}
                          </span>
                          <span
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full text-white"
                            style={{ backgroundColor: tournament.status_color || '#10B981' }}
                          >
                            {tournament.status || 'Registering'}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-400 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-500/30">
                            Prize: {tournament.prize}
                          </span>
                          <span className="text-[11px] font-bold text-white bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
                            <Users className="h-3 w-3 text-emerald-400" />
                            {regCount} Registered
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-5 space-y-3">
                        <h3 className="text-xl font-black italic uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                          {tournament.title || tournament.name}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 font-semibold pt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            {tournament.date || 'Upcoming'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            {tournament.region || 'Online'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Gamepad2 className="h-3.5 w-3.5 text-slate-500" />
                            {tournament.format || 'Tournament'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            Slots: {tournament.teams}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-0 border-t border-white/5 mt-3 flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/organizer/tournament/${tournamentSlug}/attendance`}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 transition text-xs font-black uppercase tracking-wider text-white text-center rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Event Attendance
                      </Link>

                      <Link
                        href={`/organizer/tournament/${tournamentSlug}`}
                        className="py-2.5 px-3 bg-white/10 hover:bg-white/15 transition text-xs font-bold uppercase tracking-wider text-slate-200 text-center rounded-xl"
                      >
                        Rosters ({regCount})
                      </Link>

                      <Link
                        href={`/organizer/tournament/${tournamentSlug}/edit`}
                        className="py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 transition text-xs font-bold uppercase tracking-wider text-indigo-300 hover:text-white text-center rounded-xl"
                        title="Edit Rules & Details"
                      >
                        Edit
                      </Link>

                      <Link
                        href={`/tournaments/${tournamentSlug}`}
                        target="_blank"
                        className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl transition"
                        title="View Public Page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteTournament(tournamentSlug, tournament.title || tournament.name)}
                        disabled={deletingSlug === tournamentSlug}
                        className="p-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:border-rose-500 text-rose-400 hover:text-white rounded-xl transition cursor-pointer disabled:opacity-50"
                        title="Delete Tournament"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
