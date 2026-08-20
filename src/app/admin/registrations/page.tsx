'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Users,
  Search,
  SlidersHorizontal,
  Calendar,
  MapPin,
  Mail,
  Ticket,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Download,
  RefreshCw,
  Gamepad2,
  Building2,
  DollarSign,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Check,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function AdminTournamentRegistrationsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedTournamentSlug, setSelectedTournamentSlug] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'free'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);

  const loadData = async () => {
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

      if (tournData.success && Array.isArray(tournData.data)) {
        setTournaments(tournData.data);
      } else {
        setTournaments([]);
      }

      if (regData.success && Array.isArray(regData.data)) {
        setRegistrations(regData.data);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      console.error('Failed to load tournament registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map of registrations per tournament slug
  const tournamentRegCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const reg of registrations) {
      const slug = reg.tournament_slug || reg.tournamentSlug || 'other';
      counts[slug] = (counts[slug] || 0) + 1;
    }
    return counts;
  }, [registrations]);

  // Selected tournament details
  const activeTournament = useMemo(() => {
    if (selectedTournamentSlug === 'all') return null;
    return tournaments.find((t) => t.slug === selectedTournamentSlug) || null;
  }, [tournaments, selectedTournamentSlug]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const tournSlug = (reg.tournament_slug || reg.tournamentSlug || '').toLowerCase();
      const matchesTournament =
        selectedTournamentSlug === 'all' || tournSlug === selectedTournamentSlug.toLowerCase();

      const teamName = reg.team_name || reg.teamName || '';
      const captainName = reg.captain_name || reg.captainName || '';
      const college = reg.college || '';
      const email = reg.email || reg.captainEmail || '';
      const passId = reg.pass_id || reg.passId || '';
      const tournTitle = reg.tournament_title || reg.tournamentTitle || '';

      const matchesSearch = [teamName, captainName, college, email, passId, tournTitle]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const isPaid = (reg.payment_status || reg.paymentStatus) === 'SUCCESS' && (reg.tournament_fee || reg.tournamentFee) !== 'Free';
      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'paid' && isPaid) ||
        (paymentFilter === 'free' && !isPaid);

      return matchesTournament && matchesSearch && matchesPayment;
    });
  }, [registrations, selectedTournamentSlug, searchTerm, paymentFilter]);

  // Copy pass ID helper
  const handleCopyPass = (passId: string) => {
    navigator.clipboard.writeText(passId);
    setCopiedPassId(passId);
    setTimeout(() => setCopiedPassId(null), 2000);
  };

  // Delete registration handler
  const handleDeleteRegistration = async (passId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to cancel and remove registration pass "${passId}" for squad "${teamName}"?`)) return;

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
        alert(data.message || 'Registration deleted successfully.');
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete registration.');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) {
      alert('No registrations to export.');
      return;
    }

    const headers = ['Pass ID', 'Tournament Title', 'Team Name', 'College', 'Captain Name', 'Email', 'Payment Status', 'Registered At'];
    const rows = filteredRegistrations.map((r) => [
      `"${r.pass_id || r.passId || ''}"`,
      `"${r.tournament_title || r.tournamentTitle || ''}"`,
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
    link.setAttribute('download', `xenova_registrations_${selectedTournamentSlug}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Roster Clearance & Verification</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Tournament Registrations
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            View, audit, and manage registered varsity teams grouped by tournament.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-3 bg-[#0C111D] border border-white/10 hover:border-white/20 transition text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white rounded-xl shadow-lg cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-rose-600/20 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Roster
          </button>
        </div>
      </header>

      {/* ═══════════════ TOURNAMENT TABS SELECTOR ═══════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" /> Select Tournament Lobby
          </span>
          <span className="text-xs font-bold text-slate-500">
            Total Registrations: <strong className="text-white font-black">{registrations.length}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pb-2">
          {/* All Tournaments Tab */}
          <button
            type="button"
            onClick={() => setSelectedTournamentSlug('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border flex items-center gap-2 ${
              selectedTournamentSlug === 'all'
                ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/25'
                : 'bg-[#0C111D] border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            All Tournaments
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              selectedTournamentSlug === 'all' ? 'bg-black/30 text-white' : 'bg-white/5 text-slate-400'
            }`}>
              {registrations.length}
            </span>
          </button>

          {/* Individual Tournament Tabs */}
          {tournaments.map((t) => {
            const count = tournamentRegCounts[t.slug] || 0;
            const isSelected = selectedTournamentSlug === t.slug;

            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setSelectedTournamentSlug(t.slug)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/25'
                    : 'bg-[#0C111D] border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="max-w-[200px] truncate">{t.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-white/5 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ ACTIVE TOURNAMENT BANNER HERO ═══════════════ */}
      {activeTournament && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0C111D] p-6 shadow-xl"
        >
          {/* Background overlay */}
          <div className="absolute inset-0 z-0 opacity-25">
            <img
              src={activeTournament.image || '/hero-arena.jpg'}
              alt={activeTournament.title}
              className="h-full w-full object-cover filter blur-sm"
              onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C111D] via-[#0C111D]/90 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-20 w-28 rounded-xl overflow-hidden bg-slate-900 border border-white/15 shrink-0">
                <img
                  src={activeTournament.image || '/hero-arena.jpg'}
                  alt={activeTournament.title}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md text-white"
                    style={{ backgroundColor: activeTournament.status_color || activeTournament.statusColor || '#10B981' }}
                  >
                    {activeTournament.status}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {activeTournament.game} • {activeTournament.format}
                  </span>
                </div>

                <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
                  {activeTournament.title}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" /> {activeTournament.region}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" /> {activeTournament.date}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">
                    Prize: {activeTournament.prize}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registered</p>
                <p className="text-2xl font-black text-white">{tournamentRegCounts[activeTournament.slug] || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Slots: {activeTournament.teams}</p>
              </div>

              <Link
                href={`/tournaments/${activeTournament.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition"
              >
                Public Page <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* ═══════════════ SEARCH & FILTER BAR ═══════════════ */}
      <section className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by team name, captain, college, email, or Pass ID (XPH-...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0C111D] pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setPaymentFilter('all')}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              paymentFilter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setPaymentFilter('paid')}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              paymentFilter === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Paid Entries
          </button>
          <button
            onClick={() => setPaymentFilter('free')}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              paymentFilter === 'free' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Free Entries
          </button>
        </div>
      </section>

      {/* ═══════════════ REGISTRATIONS LIST / TABLE ═══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
          <span>Showing {filteredRegistrations.length} registered squads</span>
          {selectedTournamentSlug !== 'all' && (
            <span className="text-slate-500">Filtered for: <strong className="text-white">{activeTournament?.title}</strong></span>
          )}
        </div>

        {filteredRegistrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C111D] p-16 text-center text-slate-400 space-y-3">
            <Ticket className="h-12 w-12 text-slate-600 mx-auto" />
            <p className="text-base font-bold text-white">No registrations found.</p>
            <p className="text-xs text-slate-500">
              {selectedTournamentSlug === 'all'
                ? 'No squads have registered for any tournament yet.'
                : `No registrations found for ${activeTournament?.title || 'this tournament'}.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRegistrations.map((reg, idx) => {
              const passId = reg.pass_id || reg.passId || `XPH-2026-${idx}`;
              const teamName = reg.team_name || reg.teamName || 'Independent Squad';
              const captainName = reg.captain_name || reg.captainName || 'Squad Leader';
              const email = reg.email || reg.captainEmail || 'captain@team.gg';
              const college = reg.college || 'Independent';
              const tournamentTitle = reg.tournament_title || reg.tournamentTitle || 'Esports Championship';
              const tournamentSlug = reg.tournament_slug || reg.tournamentSlug || '';
              const registeredAt = reg.registered_at || reg.registeredAt || 'Recent';
              const isPaid = (reg.payment_status || reg.paymentStatus) === 'SUCCESS' && (reg.tournament_fee || reg.tournamentFee) !== 'Free';

              return (
                <motion.article
                  key={`${passId}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-white/10 bg-[#0C111D] hover:border-white/20 transition p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 shadow-lg group"
                >
                  {/* Left Squad & College Identity */}
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-600/30 to-indigo-600/30 border border-white/10 flex items-center justify-center text-white font-black text-lg shrink-0">
                      {teamName.charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-rose-400 transition-colors">
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

                      <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-400" />
                        <span>Tournament: </span>
                        <span className="text-slate-200">{tournamentTitle}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-semibold pt-1">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" /> {captainName}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-slate-400" /> {email}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3 text-slate-500" /> {registeredAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Pass Actions */}
                  <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                    {/* Pass ID Pill with Copy */}
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

                    {/* View Entry Pass Link */}
                    {tournamentSlug && (
                      <Link
                        href={`/registration/${tournamentSlug}/pass?passId=${passId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition"
                        title="Open digital ticket pass"
                      >
                        <Ticket className="h-3.5 w-3.5 text-amber-400" />
                        Ticket Pass
                      </Link>
                    )}

                    {/* Cancel & Delete Registration */}
                    <button
                      type="button"
                      onClick={() => handleDeleteRegistration(passId, teamName)}
                      className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:border-rose-500 text-rose-400 hover:text-white transition flex items-center justify-center cursor-pointer shadow-lg"
                      title="Cancel & delete registration"
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
  );
}
