'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Trophy, 
  Users, 
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  Eye,
  Gamepad2
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
  slug: string;
  createdBy: string;
  players: any[];
  image?: string;
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTournaments = (email: string, role = session?.role) => {
    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      let allTournaments = rawTournaments ? JSON.parse(rawTournaments) : [];

      // Filter by organizer email (or show all if admin)
      if (role !== 'admin') {
        allTournaments = allTournaments.filter((t: Tournament) => t.createdBy === email);
      }

      setTournaments(allTournaments);
    } catch (e) {
      console.error(e);
      setTournaments([]);
    }
  };

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (!rawSession) {
      router.replace('/login');
      return;
    }

    const user = JSON.parse(rawSession);
    
    // Check if user is an approved organizer
    if (user.role !== 'organizer' && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    setSession(user);
    loadTournaments(user.email, user.role);
    setLoading(false);
  }, [router]);

  const deleteTournament = (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return;

    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      let tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      tournaments = tournaments.filter((t: Tournament) => t.id !== id);
      localStorage.setItem('xenova_tournaments', JSON.stringify(tournaments));
      loadTournaments(session.email);
    } catch (e) {
      console.error(e);
      alert('Failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <header className="mb-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tight flex items-center gap-3 mb-2">
                <Trophy className="h-8 w-8 text-indigo-400 shrink-0" />
                Tournament Hub
              </h1>
              <p className="text-slate-400">Create, manage, and host official college esports tournaments</p>
            </div>
            
            <Link 
              href="/organizer/tournament/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/20 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Create Tournament
            </Link>
          </div>
        </header>

        {tournaments.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-bold uppercase tracking-wider text-slate-400 mb-2">No tournaments yet</h3>
            <p className="text-sm text-slate-500 mb-6">Get started by creating your first tournament</p>
            <Link 
              href="/organizer/tournament/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl"
            >
              <Plus className="h-4 w-4" />
              Create Tournament
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {tournaments.map((tournament, idx) => (
              <motion.article
                key={tournament.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="border border-white/10 bg-[#0C111D] rounded-2xl overflow-hidden hover:border-indigo-500/30 transition"
              >
                {tournament.image && (
                  <div className="relative h-32 overflow-hidden bg-slate-700">
                    <img src={tournament.image} alt={tournament.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0C111D]" />
                  </div>
                )}
                
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <h3 className="text-2xl font-black italic uppercase tracking-tight">{tournament.name}</h3>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                        tournament.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        tournament.status === 'completed' ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4 text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-2">
                        <Gamepad2 className="h-3.5 w-3.5 text-indigo-400" />
                        {tournament.game}
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        {tournament.players?.length || 0} Players
                      </span>
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-indigo-400" />
                        {tournament.prize}
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        {tournament.startDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap md:flex-col md:items-end justify-end">
                    <Link
                      href={`/tournaments/${tournament.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-500/30 hover:bg-indigo-500/10 transition text-xs font-bold uppercase tracking-widest text-white rounded-lg"
                    >
                      <Eye className="h-4 w-4" />
                      View Public
                    </Link>
                    <Link
                      href={`/organizer/tournament/${tournament.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-bold uppercase tracking-widest text-white rounded-lg"
                    >
                      <Eye className="h-4 w-4" />
                      Manage
                    </Link>
                    <Link
                      href={`/organizer/tournament/${tournament.id}/edit`}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition text-xs font-bold uppercase tracking-widest text-white rounded-lg"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteTournament(tournament.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition text-xs font-bold uppercase tracking-widest text-rose-400 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
