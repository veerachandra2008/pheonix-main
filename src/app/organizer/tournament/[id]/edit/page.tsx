'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy,
  Save,
  Upload
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  game: string;
  format: string;
  teams: number;
  prize: string;
  startDate: string;
  description: string;
  region: string;
  fee: string;
  image?: string;
}

export default function EditTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.id as string;
  const [session, setSession] = useState<any>(null);
  const [formData, setFormData] = useState<Tournament | null>(null);

  const loadTournament = (email: string, role = session?.role) => {
    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      const found = tournaments.find((t: Tournament & { createdBy?: string }) => t.id === tournamentId);

      if (!found) {
        router.replace('/organizer/dashboard');
        return;
      }

      // Check permission
      if (found.createdBy !== email && role !== 'admin') {
        router.replace('/organizer/dashboard');
        return;
      }

      setFormData(found);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData({ ...formData!, image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData || !formData.name.trim() || !formData.startDate || !formData.description.trim() || !formData.prize.trim()) {
      alert('Tournament name, prize pool, start date, and description are required');
      return;
    }

    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];
      const updated = tournaments.map((t: Tournament) => {
        if (t.id === tournamentId) {
          return { ...t, ...formData };
        }
        return t;
      });

      localStorage.setItem('xenova_tournaments', JSON.stringify(updated));
      alert('Tournament updated successfully!');
      router.push(`/organizer/tournament/${tournamentId}`);
    } catch (e) {
      console.error(e);
      alert('Failed to update tournament');
    }
  };

  if (!formData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <Link href={`/organizer/tournament/${tournamentId}`} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-white/10 bg-[#0C111D] p-8 rounded-2xl shadow-xl space-y-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-6 w-6 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Edit Tournament</span>
            </div>
            <h1 className="text-4xl font-black italic uppercase tracking-tight">Update Details</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Name</span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Image</span>
                <div className="mt-2 relative">
                  {formData.image && (
                    <div className="mb-3 h-40 w-full rounded-xl overflow-hidden border border-white/10">
                      <img src={formData.image} alt="Tournament preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-white/20 bg-white/5 px-4 py-6 rounded-xl cursor-pointer hover:border-indigo-500/50 transition">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <div>
                      <span className="text-sm font-semibold text-white">Click to upload new image</span>
                      <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Game Title</span>
                <select
                  value={formData.game}
                  onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                >
                  {['Valorant', 'CS2', 'BGMI', 'Free Fire', 'FC24', 'Apex Legends', 'Rocket League'].map((game) => (
                    <option key={game} value={game} className="bg-[#0C111D]">{game}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Format</span>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                >
                  {['5v5', '4v4', '3v3', '2v2', '1v1', 'Squad', 'Trio', 'Duo', 'Solo'].map((fmt) => (
                    <option key={fmt} value={fmt} className="bg-[#0C111D]">{fmt}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Number of Teams</span>
                <input
                  type="number"
                  required
                  value={formData.teams}
                  onChange={(e) => setFormData({ ...formData, teams: parseInt(e.target.value) || 0 })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prize Pool</span>
                <input
                  type="text"
                  required
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region / Location</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Online"
                  value={formData.region || ''}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Fee</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free"
                  value={formData.fee || ''}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</span>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</span>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50 resize-none"
              />
            </label>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
              <Link
                href={`/organizer/tournament/${tournamentId}`}
                className="flex-1 py-4 border border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition text-xs font-black uppercase tracking-widest text-white rounded-xl flex items-center justify-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
