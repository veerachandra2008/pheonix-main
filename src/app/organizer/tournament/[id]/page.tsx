'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Trash2, 
  Eye, 
  Mail,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  DollarSign,
  Download,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { invalidateTournamentsCache } from '@/lib/tournaments-db';

export default function TournamentManagePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = decodeURIComponent((params?.id as string) || '').trim();
  const [session, setSession] = useState<any>(null);
  const [tournament, setTournament] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async (userEmail: string, userRole: string, userName?: string) => {
    setLoading(true);
    try {
      let foundTournament: any = null;
      let allRegistrations: any[] = [];
      const cleanId = (rawId || '').toLowerCase().trim();

      // 1. Direct Supabase Query (Fastest, direct PostgreSQL)
      try {
        const [sbTournRes, sbRegRes] = await Promise.all([
          supabase.from('tournaments').select('*'),
          supabase.from('registrations').select('*'),
        ]);

        if (sbTournRes.data && Array.isArray(sbTournRes.data)) {
          foundTournament = sbTournRes.data.find((t: any) => {
            const s = (t.slug || '').toLowerCase().trim();
            const idStr = String(t.id || '').toLowerCase().trim();
            const title = (t.title || t.name || '').toLowerCase().trim();
            return (
              s === cleanId ||
              idStr === cleanId ||
              title === cleanId ||
              (cleanId && s.includes(cleanId)) ||
              (s && cleanId.includes(s))
            );
          });
        }

        if (sbRegRes.data && Array.isArray(sbRegRes.data)) {
          allRegistrations = sbRegRes.data;
        }
      } catch (sbErr) {
        console.warn('Supabase tournament rosters fetch notice:', sbErr);
      }

      // 2. Query Backend API
      try {
        const apiBase = getApiBaseUrl();
        const [tournRes, regRes] = await Promise.all([
          fetch(`${apiBase}/tournaments/`, { cache: 'no-store' }),
          fetch(`${apiBase}/registrations`, { cache: 'no-store' }),
        ]);

        if (tournRes.ok) {
          const tournData = await tournRes.json();
          if (tournData.success && Array.isArray(tournData.data)) {
            const match = tournData.data.find((t: any) => {
              const s = (t.slug || '').toLowerCase().trim();
              const idStr = String(t.id || '').toLowerCase().trim();
              const title = (t.title || t.name || '').toLowerCase().trim();
              return (
                s === cleanId ||
                idStr === cleanId ||
                title === cleanId ||
                (cleanId && s.includes(cleanId)) ||
                (s && cleanId.includes(s))
              );
            });
            if (match) {
              foundTournament = { ...(foundTournament || {}), ...match };
            }
          }
        }

        if (regRes.ok) {
          const regData = await regRes.json();
          if (regData.success && Array.isArray(regData.data)) {
            const seenPassIds = new Set(allRegistrations.map((r: any) => r.pass_id || r.passId));
            for (const r of regData.data) {
              const pid = r.pass_id || r.passId;
              if (pid && !seenPassIds.has(pid)) {
                allRegistrations.push(r);
                seenPassIds.add(pid);
              }
            }
          }
        }
      } catch (apiErr) {
        console.warn('Backend API tournament rosters fetch notice:', apiErr);
      }

      // 3. Fallback Tournament if not found in database yet
      if (!foundTournament) {
        foundTournament = {
          slug: rawId,
          title: rawId.replace(/[-_]/g, ' ').toUpperCase(),
          name: rawId.replace(/[-_]/g, ' ').toUpperCase(),
          game: 'Competitive Esports',
          format: 'Single Elimination',
          region: 'Online',
          date: '18-20 May 2026',
          prize: '₹50,000',
          teams: '32 Teams',
          image: '/bgmi.jpg',
          status: 'Registering',
          status_color: '#10B981',
          host: userName || 'veera',
          createdBy: userEmail,
        };
      }

      setTournament(foundTournament);

      // Filter registrations for this tournament
      const targetSlug = (foundTournament.slug || rawId).toLowerCase().trim();
      const targetTitle = (foundTournament.title || foundTournament.name || '').toLowerCase().trim();

      const filtered = allRegistrations.filter((r: any) => {
        const rSlug = (r.tournament_slug || r.tournamentSlug || '').toLowerCase().trim();
        const rTitle = (r.tournament_title || r.tournamentTitle || '').toLowerCase().trim();
        return (
          rSlug === targetSlug ||
          (targetSlug && rSlug.includes(targetSlug)) ||
          (rSlug && targetSlug.includes(rSlug)) ||
          (targetTitle && rTitle === targetTitle) ||
          (targetTitle && rTitle.includes(targetTitle)) ||
          (rTitle && targetTitle.includes(rTitle))
        );
      });

      setRegistrations(filtered);
    } catch (e) {
      console.error('Failed to load tournament management data:', e);
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
        setSession(user);
        loadData(user.email, user.role || 'organizer', user.hostName || user.name);
      } catch {
        router.replace('/login');
      }
    }

    verifyAndLoad();
  }, [router, rawId]);

  const handleDeleteRegistration = async (passId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to cancel registration "${passId}" for squad "${teamName}"?`)) return;

    setActionLoading(passId);
    try {
      const apiBase = getApiBaseUrl();

      // 1. Direct Supabase Delete
      try {
        await supabase.from('registrations').delete().eq('pass_id', passId);
        await supabase.from('tournament_rosters').delete().eq('pass_id', passId);
        await supabase.from('event_attendance').delete().eq('pass_id', passId);
      } catch {}

      // 2. Backend Delete
      try {
        const res = await fetch(`${apiBase}/registrations/${passId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || 'Registration removed successfully.');
        }
      } catch {}

      if (session) {
        await loadData(session.email, session.role, session.name);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete registration.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    if (!confirm(`Are you sure you want to permanently delete tournament "${tournament.title || tournament.name}"? This action cannot be undone.`)) return;

    try {
      const apiBase = getApiBaseUrl();
      const targetSlug = tournament.slug || rawId;

      // 1. Direct Supabase Delete
      try {
        await supabase.from('tournaments').delete().eq('slug', targetSlug);
      } catch {}

      // 2. Backend Delete
      try {
        const res = await fetch(`${apiBase}/tournaments/${targetSlug}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || 'Tournament deleted from database.');
        }
      } catch {}

      invalidateTournamentsCache();
      router.replace('/organizer/dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to delete tournament.');
    }
  };

  const handleCopyPass = (passId: string) => {
    navigator.clipboard.writeText(passId);
    setCopiedPassId(passId);
    setTimeout(() => setCopiedPassId(null), 2000);
  };

  const handleExportCSV = () => {
    if (registrations.length === 0) {
      alert('No registrations to export.');
      return;
    }

    const headers = ['Pass ID', 'Tournament', 'Team Name', 'College', 'Captain Name', 'Captain Email', 'Payment Status', 'Registered At'];
    const rows = registrations.map((r) => [
      `"${r.pass_id || r.passId || ''}"`,
      `"${tournament?.title || ''}"`,
      `"${r.team_name || r.teamName || ''}"`,
      `"${r.college || ''}"`,
      `"${r.captain_name || r.captainName || ''}"`,
      `"${r.email || r.captainEmail || ''}"`,
      `"${r.payment_status || r.paymentStatus || 'SUCCESS'}"`,
      `"${r.registered_at || r.registeredAt || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `roster_${tournament?.slug || 'tournament'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href="/organizer/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Organizer Hub
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/tournaments/${tournament.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 rounded-xl transition"
            >
              Public Tournament Page <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={handleDeleteTournament}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:border-rose-500 text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Tournament
            </button>
          </div>
        </div>

        {/* Hero Banner Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0C111D] p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 z-0 opacity-25">
            <img
              src={tournament.image || '/hero-arena.jpg'}
              alt={tournament.title || tournament.name}
              className="h-full w-full object-cover filter blur-sm"
              onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C111D] via-[#0C111D]/90 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="h-24 w-32 rounded-2xl overflow-hidden bg-slate-900 border border-white/15 shrink-0">
                <img
                  src={tournament.image || '/hero-arena.jpg'}
                  alt={tournament.title || tournament.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md text-white"
                    style={{ backgroundColor: tournament.status_color || '#10B981' }}
                  >
                    {tournament.status || 'Registering'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {tournament.game} • {tournament.format}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
                  {tournament.title || tournament.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" /> {tournament.region || 'Online'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" /> {tournament.date || 'Scheduled'}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">
                    Prize: {tournament.prize}
                  </span>
                  <span>•</span>
                  <span className="text-slate-300">
                    Host: {tournament.host || session.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8">
              <div className="text-center pr-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registered</p>
                <p className="text-3xl font-black text-white">{registrations.length}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Capacity: {tournament.teams}</p>
              </div>

              <Link
                href={`/organizer/tournament/${rawId}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Edit Rules & Details
              </Link>

              <Link
                href={`/organizer/tournament/${rawId}/attendance`}
                className="inline-flex items-center gap-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 transition text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                Attendance Desk
              </Link>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-3 bg-white/10 hover:bg-white/15 transition text-xs font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </section>

        {/* Registered Rosters Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                Event Registrations ({registrations.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Teams that registered specifically for this tournament lobby.
              </p>
            </div>

            <button
              onClick={() => loadData(session.email, session.role, session.name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 rounded-lg transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {registrations.length === 0 ? (
            <div className="border border-dashed border-white/10 bg-[#0C111D] p-16 rounded-3xl text-center space-y-3">
              <Ticket className="h-12 w-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No registrations for this event yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Share your tournament link with university teams to start receiving team passes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {registrations.map((reg, idx) => {
                const passId = reg.pass_id || reg.passId || `XPH-REG-${idx}`;
                const teamName = reg.team_name || reg.teamName || 'Squad';
                const captainName = reg.captain_name || reg.captainName || 'Captain';
                const email = reg.email || reg.captainEmail || 'captain@team.gg';
                const college = reg.college || 'Independent Campus';
                const registeredAt = reg.registered_at || reg.registeredAt || 'Recent';
                const isPaid = (reg.payment_status || reg.paymentStatus) === 'SUCCESS' && (reg.tournament_fee || reg.tournamentFee) !== 'Free';

                return (
                  <motion.article
                    key={`${passId}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-white/10 bg-[#0C111D] hover:border-white/20 transition p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 shadow-lg group"
                  >
                    {/* Left: Squad Identity */}
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-white font-black text-lg shrink-0">
                        {teamName.charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                            {teamName}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                            {college}
                          </span>
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Paid Entry
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/15 border border-sky-500/30 text-sky-400">
                              Free Entry
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold pt-0.5">
                          <span className="text-slate-200 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" /> Captain: {captainName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> {email}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 text-[11px]">
                            {registeredAt}
                          </span>
                        </div>

                        {/* 4-Player Roster Summary */}
                        {reg.players && Array.isArray(reg.players) && reg.players.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 pt-2">
                            {reg.players.map((p: any) => (
                              <div
                                key={p.slot}
                                className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex flex-col justify-center ${
                                  p.slot === 1
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-black/40 border-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-white flex items-center gap-1">
                                    {p.slot === 1 ? '👑' : `P${p.slot}`}: {p.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-indigo-300 font-bold px-1.5 py-0.2 bg-white/5 rounded">
                                    {p.inGameTag || p.in_game_tag || 'IGN'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 truncate pt-0.5" title={p.email}>
                                  {p.email}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: Pass & Actions */}
                    <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                      {/* Pass ID Pill */}
                      <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3.5 py-2 rounded-xl">
                        <Ticket className="h-4 w-4 text-emerald-400" />
                        <div className="text-left font-mono">
                          <span className="text-[9px] uppercase tracking-widest text-slate-500 block">Pass ID</span>
                          <span className="text-xs font-black text-white">{passId}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPass(passId)}
                          className="ml-1 text-slate-400 hover:text-white transition cursor-pointer"
                          title="Copy Pass ID"
                        >
                          {copiedPassId === passId ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {/* View Ticket Link */}
                      <Link
                        href={`/registration/${tournament.slug}/pass?passId=${passId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition"
                        title="View Pass"
                      >
                        <Ticket className="h-3.5 w-3.5 text-amber-400" />
                        Pass
                      </Link>

                      {/* Cancel / Delete Registration */}
                      <button
                        type="button"
                        onClick={() => handleDeleteRegistration(passId, teamName)}
                        disabled={actionLoading === passId}
                        className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:border-rose-500 text-rose-400 hover:text-white transition flex items-center justify-center cursor-pointer shadow-lg disabled:opacity-50"
                        title="Remove squad registration from event"
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
