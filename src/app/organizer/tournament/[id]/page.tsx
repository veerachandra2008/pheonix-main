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

export default function TournamentManagePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = (params?.id as string) || '';
  const [session, setSession] = useState<any>(null);
  const [tournament, setTournament] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async (userEmail: string, userRole: string, userName?: string) => {
    setLoading(true);
    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const [tournRes, regRes] = await Promise.all([
        fetch(`${apiBase}/tournaments/`, { cache: 'no-store' }),
        fetch(`${apiBase}/registrations`, { cache: 'no-store' }),
      ]);

      const tournData = await tournRes.json();
      const regData = await regRes.json();

      let foundTournament: any = null;
      if (tournData.success && Array.isArray(tournData.data)) {
        foundTournament = tournData.data.find((t: any) => t.slug === rawId || String(t.id) === rawId);
      }

      if (!foundTournament) {
        alert('Tournament not found or has been deleted.');
        router.replace('/organizer/dashboard');
        return;
      }

      // Check ownership permission: only the host who created it or admin can manage
      const createdBy = (foundTournament.createdBy || foundTournament.organizer_email || '').toLowerCase();
      const host = (foundTournament.host || '').toLowerCase();
      const isOwner =
        userRole === 'admin' ||
        (userEmail && createdBy === userEmail.toLowerCase()) ||
        (userName && host === userName.toLowerCase());

      if (!isOwner) {
        alert('You do not have permission to manage this tournament.');
        router.replace('/organizer/dashboard');
        return;
      }

      setTournament(foundTournament);

      // Filter registrations ONLY for this tournament
      if (regData.success && Array.isArray(regData.data)) {
        const tournSlug = (foundTournament.slug || '').toLowerCase();
        const filtered = regData.data.filter((r: any) => {
          const rSlug = (r.tournament_slug || r.tournamentSlug || '').toLowerCase();
          return rSlug === tournSlug;
        });
        setRegistrations(filtered);
      }
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
        const email = (user.email || '').trim().toLowerCase();
        const role = (user.role || '').toLowerCase();

        if (role === 'admin' || email === 'admin@xenova.gg') {
          setSession(user);
          loadData(user.email, 'admin', user.name);
          return;
        }

        let isApproved = role === 'organizer' || role === 'host';
        let hostName = user.hostName || user.name || 'Verified Host';

        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase.from('organizer_applications').select('*').eq('email', email);
          if (data && data.length > 0 && (data[0].status || '').toUpperCase() === 'APPROVED') {
            isApproved = true;
            hostName = data[0].host_name || user.name || 'Verified Host';
          }
        } catch {}

        if (!isApproved) {
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
                  isApproved = true;
                  hostName = matched.name || matched.host_name || user.name;
                }
              }
            }
          } catch {}
        }

        if (!isApproved) {
          const updatedSession = { ...user, role: 'player' };
          delete updatedSession.hostName;
          localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
          window.dispatchEvent(new Event('xenova-auth-change'));
          router.replace('/organizer/apply');
          return;
        }

        const validSession = { ...user, role: 'organizer', hostName };
        setSession(validSession);
        loadData(validSession.email, 'organizer', validSession.name);
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
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const res = await fetch(`${apiBase}/registrations/${passId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Registration removed successfully.');
      }
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
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const res = await fetch(`${apiBase}/tournaments/${tournament.slug}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Tournament deleted from database.');
      }
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
                href={`/organizer/tournament/${rawId}/attendance`}
                className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 transition text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                Event Attendance Desk
              </Link>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-3.5 py-3 bg-white/10 hover:bg-white/15 transition text-xs font-bold uppercase tracking-wider text-white rounded-xl cursor-pointer"
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
