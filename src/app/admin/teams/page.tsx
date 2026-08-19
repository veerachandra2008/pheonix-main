'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Trash2, 
  Users, 
  Trophy, 
  Search,
  Activity,
  Plus,
  Gamepad2,
  TrendingUp,
  Building2,
  Zap
} from 'lucide-react';
import { defaultTeams, getCustomTeams, saveCustomTeams } from '@/lib/xenova-data';

export default function AdminTeamsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customTeams, setCustomTeams] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState('All Games');

  // Load custom teams from localStorage
  const loadCustomTeams = () => {
    try {
      setCustomTeams(getCustomTeams());
    } catch (e) {
      console.error('Failed to load custom teams', e);
    }
  };

  useEffect(() => {
    loadCustomTeams();
    window.addEventListener('xenova-teams-change', loadCustomTeams);
    return () => {
      window.removeEventListener('xenova-teams-change', loadCustomTeams);
    };
  }, []);

  const combinedTeams = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const t of customTeams) {
      const key = (t.slug || t.name || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ ...t, isCustom: true });
      }
    }

    for (const t of defaultTeams) {
      const key = (t.slug || t.name || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ ...t, isCustom: false, verified: true, verificationStatus: 'approved' });
      }
    }

    return result;
  }, [customTeams]);

  const filteredTeams = useMemo(() => {
    return combinedTeams.filter((team) => {
      const matchesGame = selectedGame === 'All Games' || team.game === selectedGame;
      const matchesSearch = [team.name, team.college, team.game, team.captain]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesGame && matchesSearch;
    });
  }, [combinedTeams, searchTerm, selectedGame]);

  const handleDeleteTeam = (name: string, slug?: string) => {
    if (!name || !confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const rawCustom = localStorage.getItem('xenova_teams');
      let custom = rawCustom ? JSON.parse(rawCustom) : [];
      const targetSlug = slug || name.toLowerCase().trim().replace(/\s+/g, '-');

      custom = custom.filter((t: any) => {
        const tSlug = t.slug || (t.name || '').toLowerCase().trim().replace(/\s+/g, '-');
        return tSlug !== targetSlug && (t?.name || '').toLowerCase() !== name.toLowerCase();
      });

      saveCustomTeams(custom);
      loadCustomTeams();
      alert('Team deleted successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to delete team.');
    }
  };

  const updateTeamStatus = (name: string, verificationStatus: 'approved' | 'rejected', slug?: string) => {
    if (!name) return;
    const targetSlug = slug || name.toLowerCase().trim().replace(/\s+/g, '-');

    const updated = customTeams.map((team) => {
      const teamSlug = team.slug || (team.name || '').toLowerCase().trim().replace(/\s+/g, '-');
      if (teamSlug !== targetSlug && (team?.name || '').toLowerCase() !== name.toLowerCase()) return team;
      return {
        ...team,
        verificationStatus,
        verified: verificationStatus === 'approved',
      };
    });

    saveCustomTeams(updated);
    loadCustomTeams();
  };

  const gameFilters = ['All Games', 'BGMI', 'Valorant', 'Free Fire', 'CS2', 'FC24'];

  const stats = useMemo(() => {
    const total = combinedTeams.length;
    const customCount = customTeams.length;
    const pendingCount = customTeams.filter(t => t.verificationStatus === 'pending').length;
    const verifiedCount = combinedTeams.filter(t => t.verificationStatus === 'approved' || t.verified).length;
    const presetCount = defaultTeams.length;
    const bgmiCount = combinedTeams.filter(t => t.game === 'BGMI').length;
    const valCount = combinedTeams.filter(t => t.game === 'Valorant').length;
    const otherCount = total - bgmiCount - valCount;

    return { total, customCount, presetCount, bgmiCount, valCount, otherCount, pendingCount, verifiedCount };
  }, [combinedTeams, customTeams]);

  const metricCards = [
    { label: 'Total Active Squads', value: stats.total, icon: Users, color: '#f43f5e' },
    { label: 'Verified Teams', value: stats.verifiedCount, icon: ShieldCheck, color: '#fbbf24' },
    { label: 'Pending Review', value: stats.pendingCount, icon: Plus, color: '#22d3ee' },
    { label: 'Valorant/BGMI split', value: `${stats.valCount} / ${stats.bgmiCount}`, icon: Gamepad2, color: '#a855f7' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px w-8 bg-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Database Control</span>
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
          Team Management
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Review default rosters and manage custom squads added by official event organizers.
        </p>
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
              <div className="absolute top-0 right-0 h-24 w-24 opacity-30 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${card.color}66, transparent 60%)` }} />
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
            placeholder="Filter by name, college, game or captain..."
            className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-rose-500/50 focus:bg-white/[0.08] transition"
          />
        </div>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500/50 focus:bg-white/[0.08] transition cursor-pointer appearance-none"
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
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredTeams.map((team, idx) => (
              <motion.div
                key={`${team.slug || team.name}-${idx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 items-center px-6 py-4 rounded-xl hover:bg-white/[0.03] transition-all"
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl border flex items-center justify-center font-black text-xs italic text-white"
                    style={{ borderColor: `${team.accent || '#6366f1'}33`, background: `linear-gradient(135deg, ${team.accent || '#6366f1'}33, rgba(255,255,255,0.02))` }}
                  >
                    {(team.name || 'TM').replace('Team ', '').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{team.name || 'Unnamed Squad'}</h4>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Rank #{team.rank || 0}</p>
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
                <span className="text-xs text-slate-300 font-bold truncate">{team.captain}</span>

                {/* Status */}
                <div>
                  <span className={`inline-flex px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    team.verificationStatus === 'pending'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : team.verificationStatus === 'rejected'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {team.verificationStatus || 'approved'}
                  </span>
                </div>

                {/* Actions */}
                <div className="text-right">
                  {team.isCustom ? (
                    <div className="flex justify-end gap-2">
                      {team.verificationStatus !== 'approved' && (
                        <button
                          onClick={() => updateTeamStatus(team.name, 'approved', team.slug)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white transition"
                          title="Verify Squad"
                        >
                          <ShieldCheck className="h-4.5 w-4.5" />
                        </button>
                      )}
                      {team.verificationStatus !== 'rejected' && (
                        <button
                          onClick={() => updateTeamStatus(team.name, 'rejected', team.slug)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white transition"
                          title="Reject Squad"
                        >
                          <Zap className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTeam(team.name, team.slug)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                        title="Delete Squad"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic pr-3">Locked</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredTeams.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm font-semibold uppercase tracking-wider">
              No matching squads found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
