'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy,
  Users,
  Trash2,
  Plus,
  Eye,
  Mail
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  game: string;
  format: string;
  teams: number;
  prize: string;
  startDate: string;
  status: 'draft' | 'active' | 'completed';
  createdBy: string;
  players: any[];
  description: string;
  slug: string;
}

export default function TournamentManagePage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.id as string;
  const [session, setSession] = useState<any>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [playerEmail, setPlayerEmail] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);

  const loadTournament = (email: string, role = session?.role) => {
    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      const found = tournaments.find((t: Tournament) => t.id === tournamentId);

      if (!found) {
        router.replace('/organizer/dashboard');
        return;
      }

      // Check permission
      if (found.createdBy !== email && role !== 'admin') {
        router.replace('/organizer/dashboard');
        return;
      }

      setTournament(found);

      const rawRegistrations = localStorage.getItem('xenova_registrations');
      const allRegistrations = rawRegistrations ? JSON.parse(rawRegistrations) : [];
      setRegistrations(
        allRegistrations.filter((registration: any) =>
          registration.tournamentId === found.id ||
          registration.tournamentSlug === found.slug ||
          registration.organizerEmail === found.createdBy
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (!rawSession) {
      router.replace('/login');
      return;
    }

    const user = JSON.parse(rawSession);
    if (user.role !== 'organizer' && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    setSession(user);
    loadTournament(user.email, user.role);
  }, [router, tournamentId]);

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerEmail.trim()) {
      alert('Enter a valid email');
      return;
    }

    if (tournament?.players?.some((p: any) => p.email === playerEmail)) {
      alert('Player already in tournament');
      return;
    }

    try {
      const newPlayer = {
        email: playerEmail,
        addedAt: new Date().toISOString(),
      };

      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      const updated = tournaments.map((t: Tournament) => {
        if (t.id === tournamentId) {
          return {
            ...t,
            players: [...(t.players || []), newPlayer]
          };
        }
        return t;
      });

      localStorage.setItem('xenova_tournaments', JSON.stringify(updated));
      loadTournament(session.email);
      setPlayerEmail('');
    } catch (e) {
      console.error(e);
      alert('Failed to add player');
    }
  };

  const removePlayer = (email: string) => {
    if (!confirm('Remove this player from tournament?')) return;

    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      const updated = tournaments.map((t: Tournament) => {
        if (t.id === tournamentId) {
          return {
            ...t,
            players: t.players?.filter((p: any) => p.email !== email) || []
          };
        }
        return t;
      });

      localStorage.setItem('xenova_tournaments', JSON.stringify(updated));
      loadTournament(session.email);
    } catch (e) {
      console.error(e);
      alert('Failed to remove player');
    }
  };

  const changeStatus = (newStatus: 'draft' | 'active' | 'completed') => {
    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      const updated = tournaments.map((t: Tournament) => {
        if (t.id === tournamentId) {
          return { ...t, status: newStatus };
        }
        return t;
      });

      localStorage.setItem('xenova_tournaments', JSON.stringify(updated));
      loadTournament(session.email);
      alert(`Tournament status changed to ${newStatus}`);
    } catch (e) {
      console.error(e);
      alert('Failed to update tournament');
    }
  };

  if (!tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <Link href="/organizer/dashboard" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Tournaments
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Tournament Info */}
          <div className="border border-white/10 bg-[#0C111D] p-8 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tight flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-indigo-400" />
                  {tournament.name}
                </h1>
                <p className="text-slate-400 text-sm mt-2">{tournament.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/tournaments/${tournament.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-500/30 hover:bg-indigo-500/10 transition text-[10px] font-black uppercase tracking-widest text-white rounded-lg whitespace-nowrap"
                >
                  <Eye className="h-4 w-4" />
                  View Public Page
                </Link>
                <span className={`inline-flex px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                tournament.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                tournament.status === 'completed' ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {tournament.status}
              </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4 mb-6">
              <div className="border border-white/5 bg-white/[0.02] p-3 rounded-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Game</p>
                <p className="text-sm font-bold">{tournament.game}</p>
              </div>
              <div className="border border-white/5 bg-white/[0.02] p-3 rounded-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Format</p>
                <p className="text-sm font-bold">{tournament.format}</p>
              </div>
              <div className="border border-white/5 bg-white/[0.02] p-3 rounded-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Teams</p>
                <p className="text-sm font-bold">{tournament.teams}</p>
              </div>
              <div className="border border-white/5 bg-white/[0.02] p-3 rounded-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Prize</p>
                <p className="text-sm font-bold">{tournament.prize}</p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => changeStatus('draft')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                  tournament.status === 'draft' 
                    ? 'bg-amber-600 text-white' 
                    : 'border border-white/10 hover:border-amber-500/50 text-white'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => changeStatus('active')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                  tournament.status === 'active' 
                    ? 'bg-emerald-600 text-white' 
                    : 'border border-white/10 hover:border-emerald-500/50 text-white'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => changeStatus('completed')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${
                  tournament.status === 'completed' 
                    ? 'bg-slate-600 text-white' 
                    : 'border border-white/10 hover:border-slate-500/50 text-white'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="border border-white/10 bg-[#0C111D] p-8 rounded-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-400" />
              Team Registrations ({registrations.length})
            </h2>

            {registrations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-xl">
                <p className="text-sm font-bold uppercase tracking-wider">No team registrations submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {registrations.map((registration) => (
                  <article key={registration.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">{registration.teamName}</h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                          {registration.college} • {registration.teamSize} players
                        </p>
                      </div>
                      <div className="text-xs text-slate-400 md:text-right">
                        <p className="font-bold text-white">{registration.captainName}</p>
                        <p className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {registration.captainEmail}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{registration.registeredAt}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {(registration.players || []).map((player: any, index: number) => (
                        <div key={`${registration.id}-${player.email}-${index}`} className="rounded-lg border border-white/5 bg-[#070B14] p-3">
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
          </div>

          {/* Add Player */}
          <div className="border border-white/10 bg-[#0C111D] p-8 rounded-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-6 flex items-center gap-2">
              <Plus className="h-6 w-6 text-indigo-400" />
              Add Players
            </h2>
            
            <form onSubmit={addPlayer} className="flex gap-3">
              <input
                type="email"
                placeholder="player@example.com"
                value={playerEmail}
                onChange={(e) => setPlayerEmail(e.target.value)}
                className="flex-1 border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl whitespace-nowrap"
              >
                Add Player
              </button>
            </form>
          </div>

          {/* Player List */}
          <div className="border border-white/10 bg-[#0C111D] p-8 rounded-2xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-400" />
              Registered Players ({tournament.players?.length || 0})
            </h2>

            {!tournament.players || tournament.players.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm font-bold uppercase tracking-wider">No players registered yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tournament.players.map((player: any, idx: number) => (
                  <div
                    key={player.email + idx}
                    className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.02] rounded-lg hover:border-white/10 transition"
                  >
                    <span className="text-sm font-semibold">{player.email}</span>
                    <button
                      onClick={() => removePlayer(player.email)}
                      className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                      title="Remove Player"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
