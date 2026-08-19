'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy,
  Save,
  Upload
} from 'lucide-react';

export default function CreateTournamentPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    game: 'Valorant',
    format: '5v5',
    teams: '16',
    prize: '$5000',
    startDate: '',
    description: '',
    image: '',
    region: 'Online',
    fee: 'Free',
  });

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
  }, [router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setFormData({ ...formData, image: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.startDate || !formData.image || !formData.description.trim() || !formData.prize.trim()) {
      alert('Tournament name, image, prize pool, start date, and description are required');
      return;
    }

    try {
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tournaments = rawTournaments ? JSON.parse(rawTournaments) : [];

      const newTournament = {
        id: Math.random().toString(36).substring(7),
        name: formData.name,
        title: formData.name,
        game: formData.game,
        format: formData.format,
        teams: parseInt(formData.teams),
        prize: formData.prize,
        startDate: formData.startDate,
        date: new Date(formData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        description: formData.description,
        image: formData.image,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        status: 'draft',
        statusColor: '#F59E0B',
        host: session.name || session.email,
        region: formData.region,
        filled: 0,
        fee: formData.fee,
        createdBy: session.email,
        createdAt: new Date().toISOString(),
        players: [],
      };

      tournaments.push(newTournament);
      localStorage.setItem('xenova_tournaments', JSON.stringify(tournaments));

      alert('Tournament created successfully!');
      router.push('/organizer/dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to create tournament');
    }
  };

  if (!session) {
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
        <Link href="/organizer/dashboard" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to Tournaments
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-white/10 bg-[#0C111D] p-8 rounded-2xl shadow-xl space-y-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-6 w-6 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Create New</span>
            </div>
            <h1 className="text-4xl font-black italic uppercase tracking-tight">Tournament Setup</h1>
            <p className="text-slate-400 text-sm mt-2">Configure your tournament details and go live</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Name</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spring Valorant Cup 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Image</span>
                <div className="mt-2 relative">
                  {imagePreview && (
                    <div className="mb-3 h-40 w-full rounded-xl overflow-hidden border border-white/10">
                      <img src={imagePreview} alt="Tournament preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-white/20 bg-white/5 px-4 py-6 rounded-xl cursor-pointer hover:border-indigo-500/50 transition">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <div>
                      <span className="text-sm font-semibold text-white">Click to upload</span>
                      <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleImageUpload}
                      className="hidden"
                      required
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
                  placeholder="16"
                  value={formData.teams}
                  onChange={(e) => setFormData({ ...formData, teams: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prize Pool</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. $5000"
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
                  value={formData.region}
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
                  value={formData.fee}
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
                placeholder="Tournament rules, eligibility, and details..."
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
                Create Tournament
              </button>
              <Link
                href="/organizer/dashboard"
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
