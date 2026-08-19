'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Plus,
  X,
  Calendar,
  MapPin,
  Users,
  Gamepad2,
  DollarSign,
  Bookmark,
  CheckCircle2,
  Trash2,
  Mail
} from 'lucide-react';
import { tournaments as defaultTournaments } from '../../tournaments/data';

export default function AdminEventManagementPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    host: 'XENOVA Campus',
    game: 'Valorant',
    region: 'Online',
    prize: '$5,000',
    fee: 'Free',
    teams: '32 Teams',
    date: '18-20 May 2026',
    format: 'Single Elimination',
    filled: '0',
    status: 'Registering',
    statusColor: '#6366F1',
    image: '/valorant.jpg'
  });

  const loadTournaments = () => {
    try {
      const rawCustom = localStorage.getItem('xenova_tournaments');
      const custom = rawCustom ? JSON.parse(rawCustom) : [];

      // Merge base tournaments with custom ones
      setTournaments([...custom, ...defaultTournaments]);
      const rawRegistrations = localStorage.getItem('xenova_registrations');
      setRegistrations(rawRegistrations ? JSON.parse(rawRegistrations) : []);
    } catch (e) {
      console.error(e);
      setTournaments(defaultTournaments);
      setRegistrations([]);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const rawCustom = localStorage.getItem('xenova_tournaments');
      const custom = rawCustom ? JSON.parse(rawCustom) : [];

      const imageMap: Record<string, string> = {
        'Valorant': '/valorant.jpg',
        'BGMI': '/bgmi.jpg',
        'Free Fire': '/freefire.jpg',
        'CS2': '/cs2.jpg',
        'FC24': '/fc.jpg'
      };

      const newTournament = {
        ...formValues,
        slug: formValues.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        image: imageMap[formValues.game] || '/valorant.jpg',
        statusColor: formValues.status === 'Live' ? '#EF4444' : formValues.status === 'Registering' ? '#10B981' : '#F59E0B',
        filled: parseInt(formValues.filled) || 0,
      };

      const updated = [newTournament, ...custom];
      localStorage.setItem('xenova_tournaments', JSON.stringify(updated));
      alert('Tournament successfully launched and published!');
      setShowCreateModal(false);

      // Reset form
      setFormValues({
        title: '',
        host: 'XENOVA Campus',
        game: 'Valorant',
        region: 'Online',
        prize: '$5,000',
        fee: 'Free',
        teams: '32 Teams',
        date: '18-20 May 2026',
        format: 'Single Elimination',
        filled: '0',
        status: 'Registering',
        statusColor: '#6366F1',
        image: '/valorant.jpg'
      });

      loadTournaments();
    } catch (err) {
      console.error(err);
      alert('Failed to launch tournament.');
    }
  };

  const handleDelete = (slug: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;
    try {
      const rawCustom = localStorage.getItem('xenova_tournaments');
      const custom = rawCustom ? JSON.parse(rawCustom) : [];
      const updated = custom.filter((t: any) => t.slug !== slug);
      localStorage.setItem('xenova_tournaments', JSON.stringify(updated));
      loadTournaments();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Match Arena Provisioning</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Event Control
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Create, configure, and schedule collegiate tournaments across all esports titles.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-rose-600/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Launch Tournament
        </button>
      </header>

      <section className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-8 bg-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Player Rosters</span>
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tight">Tournament Registrations</h2>
            <p className="text-sm text-slate-400 mt-1">Teams submitted through the public registration form.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-300">
            <Users className="h-3.5 w-3.5" />
            {registrations.length} Registrations
          </span>
        </div>

        {registrations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-slate-500">
            No tournament registrations submitted yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {registrations.map((registration, index) => (
              <article key={registration.id ? `${registration.id}-${index}` : `reg-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">{registration.teamName}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                      {registration.tournamentTitle} • {registration.game} • {registration.teamSize} players
                    </p>
                    <p className="mt-2 text-sm text-slate-400">{registration.college}</p>
                  </div>
                  <div className="text-left text-xs text-slate-400 lg:text-right">
                    <p className="font-bold text-white">{registration.captainName}</p>
                    <p className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {registration.captainEmail}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{registration.registeredAt}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(registration.players || []).map((player: any, index: number) => (
                    <div key={`${registration.id || 'reg'}-${player.email || index}-${index}`} className="rounded-lg border border-white/5 bg-[#070B14] p-3">
                      <p className="text-sm font-bold text-white">{player.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{player.email}</p>
                      <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-indigo-300">{player.role}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Tournaments Grid */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t, idx) => {
          // Check if tournament is custom by matching with localStorage custom list
          const rawCustom = typeof window !== 'undefined' ? localStorage.getItem('xenova_tournaments') : null;
          const customList = rawCustom ? JSON.parse(rawCustom) : [];
          const isCustom = customList.some((item: any) => item.slug === t.slug);

          return (
            <motion.article
              key={`${t.slug || t.title || 'tourn'}-${idx}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-white/10 bg-[#0C111D] overflow-hidden rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="relative h-32 bg-slate-900 overflow-hidden">
                  <img src={t.image} alt={t.title} className="h-full w-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C111D] to-transparent" />

                  <span className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rose-600 rounded-md">
                    {t.status}
                  </span>

                  {isCustom && (
                    <button
                      onClick={() => handleDelete(t.slug)}
                      className="absolute top-3 right-3 h-8 w-8 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white transition flex items-center justify-center rounded-lg"
                      title="Delete custom tournament"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-black italic uppercase text-lg text-white truncate">{t.title}</h3>
                    <p className="text-xs text-slate-500">by {t.host}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5 truncate">
                      <Gamepad2 className="h-3.5 w-3.5 text-rose-500" />
                      {t.game}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                      {t.region}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <Trophy className="h-3.5 w-3.5 text-rose-500" />
                      {t.format}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <Users className="h-3.5 w-3.5 text-rose-500" />
                      {t.teams}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-[#FBBF24]">
                <span>Prize: {t.prize}</span>
                <span className="text-slate-500 text-[10px]">Fee: {t.fee}</span>
              </div>
            </motion.article>
          );
        })}
      </section>

      {/* Creation Modal Overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0C111D] border border-white/10 p-6 rounded-2xl overflow-y-auto max-h-[90vh] shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-rose-400 text-xs font-black uppercase tracking-widest">Provision Arena</h3>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mt-1">Configure New Tournament</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 w-8 hover:bg-white/5 text-slate-400 hover:text-white transition flex items-center justify-center rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Title</span>
                    <input
                      type="text"
                      required
                      placeholder="Valorant Spring Showdown"
                      value={formValues.title}
                      onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Host</span>
                    <input
                      type="text"
                      required
                      placeholder="XENOVA Esports Club"
                      value={formValues.host}
                      onChange={(e) => setFormValues({ ...formValues, host: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Game Title</span>
                    <select
                      value={formValues.game}
                      onChange={(e) => setFormValues({ ...formValues, game: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    >
                      {['Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC24'].map((g) => (
                        <option key={g} value={g} className="bg-[#0C111D] text-white">{g}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region</span>
                    <select
                      value={formValues.region}
                      onChange={(e) => setFormValues({ ...formValues, region: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    >
                      {['Online', 'Offline / LAN', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad'].map((r) => (
                        <option key={r} value={r} className="bg-[#0C111D] text-white">{r}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Status</span>
                    <select
                      value={formValues.status}
                      onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    >
                      {['Registering', 'Live', 'Upcoming'].map((s) => (
                        <option key={s} value={s} className="bg-[#0C111D] text-white">{s}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prize Pool</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. $10,000"
                      value={formValues.prize}
                      onChange={(e) => setFormValues({ ...formValues, prize: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Fee</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Free or $10"
                      value={formValues.fee}
                      onChange={(e) => setFormValues({ ...formValues, fee: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Teams</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 32 Teams"
                      value={formValues.teams}
                      onChange={(e) => setFormValues({ ...formValues, teams: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dates / Schedule</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24-26 June 2026"
                      value={formValues.date}
                      onChange={(e) => setFormValues({ ...formValues, date: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Format Structure</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Double Elimination"
                      value={formValues.format}
                      onChange={(e) => setFormValues({ ...formValues, format: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Filled (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={formValues.filled}
                      onChange={(e) => setFormValues({ ...formValues, filled: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-rose-600/20"
                >
                  Confirm Provisioning
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
