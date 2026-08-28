'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Trash2, 
  Users, 
  Trophy, 
  Search,
  Plus,
  Gamepad2,
  Zap,
  RefreshCw,
  XCircle,
  BadgeCheck
} from 'lucide-react';
import { flaskApi, getCached } from '@/lib/flask-api';

export default function AdminTeamsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState<any[]>(() => getCached<any[]>('admin:teams') || []);
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [loading, setLoading] = useState(false);

  const loadTeams = async (isManual: any = false) => {
    if (isManual === true) setLoading(true);
    try {
      const res = await flaskApi.getTeams();
      if (res.success && Array.isArray(res.data)) {
        setTeams(res.data);
      }
    } catch (e) {
      console.error('Failed to load teams from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const updateTeamStatus = async (team: any, action: 'approved' | 'rejected') => {
    try {
      const slug = team.slug || team.name.toLowerCase().replace(/\s+/g, '-');
      await flaskApi.handleTeamAction({ slug: team.slug, name: team.name }, action === 'approved' ? 'approve' : 'reject');
      if (team.slug) {
        await flaskApi.updateTeam(team.slug, {
          verification_status: action,
          verificationStatus: action,
          verified: action === 'approved',
        });
      }
      await loadTeams();
    } catch (e) {
      console.error(e);
      alert('Failed to update squad status.');
    }
  };

  const handleDeleteTeam = async (team: any) => {
    if (!confirm(`Are you sure you want to delete squad "${team.name}"?`)) return;
    try {
      const slug = team.slug || team.name.toLowerCase().replace(/\s+/g, '-');
      await flaskApi.deleteTeam(slug);
      await loadTeams();
    } catch (e) {
      console.error(e);
      alert('Failed to delete squad.');
    }
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesGame = selectedGame === 'All Games' || team.game === selectedGame;
      const matchesSearch = [team.name, team.college, team.game, team.captain]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesGame && matchesSearch;
    });
  }, [teams, searchTerm, selectedGame]);

  const stats = useMemo(() => {
    const total = teams.length;
    const pendingCount = teams.filter(t => (t.verification_status || t.verificationStatus) === 'pending').length;
    const verifiedCount = teams.filter(t => (t.verification_status || t.verificationStatus) === 'approved' || t.verified).length;
    const bgmiCount = teams.filter(t => t.game === 'BGMI').length;
    const valCount = teams.filter(t => t.game === 'Valorant').length;
    return { total, pendingCount, verifiedCount, valCount, bgmiCount };
  }, [teams]);

  const metricCards = [
    { label: 'Total Active Squads', value: stats.total, icon: Users, color: '#f43f5e' },
    { label: 'Verified Rosters', value: stats.verifiedCount, icon: ShieldCheck, color: '#10b981' },
    { label: 'Pending Approvals', value: stats.pendingCount, icon: Plus, color: '#fbbf24' },
    { label: 'Valorant / BGMI', value: `${stats.valCount} / ${stats.bgmiCount}`, icon: Gamepad2, color: '#a855f7' },
  ];

  const gameFilters = ['All Games', 'BGMI', 'Valorant', 'Free Fire', 'CS2', 'FC24'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Database Control</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Team Management
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Audit registered collegiate teams, approve varsity squads, and manage official tournament rosters.
          </p>
        </div>

        <button
          onClick={loadTeams}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          Sync Database
        </button>
      </header>

      {/* Stats Telemetry */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl relative overflow-hidden group hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.label}</span>
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <p className="text-3xl font-black italic mt-4">{card.value}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Filter HUD Panel */}
      <section className="grid gap-4 sm:grid-cols-[2fr_1fr] bg-[#0C111D] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-slate-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by squad name, college, active game or captain..."
            className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-rose-500/50 focus:bg-white/[0.08] transition text-white"
          />
        </div>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500/50 focus:bg-white/[0.08] transition cursor-pointer appearance-none text-white"
        >
          {gameFilters.map((opt) => (
            <option key={opt} value={opt} className="bg-[#0c111d] text-white">
              {opt.toUpperCase()}
            </option>
          ))}
        </select>
      </section>

      {/* Team Roster Grid */}
      <div className="border border-white/10 bg-[#0C111D] rounded-3xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 px-8 py-5 border-b border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>Squad Name</span>
          <span>Affiliated College</span>
          <span>Active Game</span>
          <span>Captain</span>
          <span>Verification Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="p-2 space-y-1">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 uppercase tracking-widest">
              Loading squads from database...
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 uppercase tracking-widest">
              No matching squads found.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTeams.map((team, idx) => {
                const status = team.verification_status || team.verificationStatus || (team.verified ? 'approved' : 'pending');
                return (
                  <motion.div
                    key={`${team.slug || team.name}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 items-center px-6 py-4 rounded-xl hover:bg-white/[0.03] transition-all"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-10 w-10 rounded-xl border flex items-center justify-center font-black text-xs italic text-white shrink-0"
                        style={{ borderColor: `${team.accent || '#6366f1'}40`, background: `linear-gradient(135deg, ${team.accent || '#6366f1'}33, transparent)` }}
                      >
                        {(team.name || 'TM').replace('Team ', '').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{team.name || 'Squad'}</h4>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Rank #{team.rank || 1}</p>
                      </div>
                    </div>

                    {/* College */}
                    <span className="text-xs text-slate-300 font-semibold truncate pr-4">{team.college}</span>

                    {/* Game */}
                    <div>
                      <span className="inline-flex px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-slate-400">
                        {team.game}
                      </span>
                    </div>

                    {/* Captain */}
                    <span className="text-xs text-slate-300 font-bold truncate">{team.captain || 'Captain'}</span>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="text-right flex justify-end gap-2">
                      {status !== 'approved' && (
                        <button
                          onClick={() => updateTeamStatus(team, 'approved')}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                          title="Verify Squad"
                        >
                          <BadgeCheck className="h-4.5 w-4.5" />
                        </button>
                      )}
                      {status !== 'rejected' && (
                        <button
                          onClick={() => updateTeamStatus(team, 'rejected')}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white transition"
                          title="Reject Squad"
                        >
                          <XCircle className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                        title="Delete Squad"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
