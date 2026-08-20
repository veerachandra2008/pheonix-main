'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy, 
  Save, 
  Upload,
  Calendar,
  DollarSign,
  Gamepad2,
  MapPin,
  Users,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

const GAME_PRESETS: Record<string, string> = {
  'Valorant': '/valorant.jpg',
  'BGMI': '/bgmi.jpg',
  'Free Fire': '/freefire.jpg',
  'CS2': '/cs2.jpg',
  'FC24': '/fc.jpg',
  'Apex Legends': '/apex.jpg',
};

export default function CreateTournamentPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'preset' | 'url'>('preset');
  const [imagePreview, setImagePreview] = useState('/valorant.jpg');

  const [formData, setFormData] = useState({
    title: '',
    game: 'Valorant',
    format: 'Single Elimination',
    teams: '32',
    prize: '₹50,000',
    date: '18-20 May 2026',
    region: 'Online',
    fee: 'Free',
    image: '/valorant.jpg',
    status: 'Registering',
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

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setFormData((prev) => ({ ...prev, image: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleGameChange = (game: string) => {
    const defaultImg = GAME_PRESETS[game] || '/valorant.jpg';
    setFormData((prev) => ({
      ...prev,
      game,
      image: imageMode === 'preset' ? defaultImg : prev.image,
    }));
    if (imageMode === 'preset') {
      setImagePreview(defaultImg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.prize.trim()) {
      alert('Tournament Title and Prize Pool are required.');
      return;
    }

    setSubmitting(true);
    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const finalImage = formData.image || imagePreview || GAME_PRESETS[formData.game] || '/valorant.jpg';
      const hostName = session?.name || session?.email?.split('@')[0] || 'Verified Host';

      const newTournament = {
        title: formData.title.trim(),
        name: formData.title.trim(),
        slug: slug,
        game: formData.game,
        format: formData.format,
        teams: `${formData.teams} Teams`,
        prize: formData.prize.trim(),
        date: formData.date.trim(),
        region: formData.region,
        fee: formData.fee.trim(),
        host: hostName,
        createdBy: session?.email,
        organizer_email: session?.email,
        image: finalImage,
        status: formData.status,
        status_color: formData.status === 'Live' ? '#EF4444' : formData.status === 'Registering' ? '#10B981' : '#38BDF8',
        filled: 0,
      };

      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const res = await fetch(`${apiBase}/tournaments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTournament),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save tournament in database');
      }

      alert(`Tournament "${formData.title}" launched successfully! It is now live in the database, user portal, and admin dashboard.`);
      router.push('/organizer/dashboard');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to launch tournament.');
    } finally {
      setSubmitting(false);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
        {/* Top Back Link */}
        <Link
          href="/organizer/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizer Hub
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Host Arena Portal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Host & Launch Tournament
          </h1>
          <p className="text-slate-400 text-sm">
            Provision a new collegiate esports tournament. It will automatically publish to the public tournaments directory and admin control board.
          </p>
        </div>

        {/* Create Form */}
        <form onSubmit={handleSubmit} className="space-y-8 border border-white/10 bg-[#0C111D] p-6 sm:p-10 rounded-3xl shadow-2xl">
          
          {/* SECTION 1: Banner Photo & Artwork */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-400" /> Tournament Banner Artwork
              </span>
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('preset');
                    setImagePreview(GAME_PRESETS[formData.game] || '/valorant.jpg');
                    setFormData((prev) => ({ ...prev, image: GAME_PRESETS[formData.game] || '/valorant.jpg' }));
                  }}
                  className={`px-3 py-1 rounded-lg transition ${imageMode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Game Presets
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-3 py-1 rounded-lg transition ${imageMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-3 py-1 rounded-lg transition ${imageMode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {/* Visual Live Preview Banner */}
            <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-xl group">
              <img
                src={imagePreview || '/valorant.jpg'}
                alt="Tournament Preview"
                className="h-full w-full object-cover filter brightness-75"
                onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-indigo-600 text-white">
                    {formData.game}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white mt-1">
                    {formData.title || 'Tournament Title Preview'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-300">
                    Host: {session?.name || session?.email} • Prize: {formData.prize}
                  </p>
                </div>
              </div>
            </div>

            {/* Image Mode Inputs */}
            {imageMode === 'upload' && (
              <div className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 transition p-6 rounded-2xl text-center bg-white/[0.02]">
                <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-white mb-1">Select Custom Tournament Poster</p>
                <p className="text-[11px] text-slate-500 mb-3">PNG, JPG, or WEBP up to 5MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {imageMode === 'url' && (
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or /custom-banner.jpg"
                value={formData.image}
                onChange={(e) => {
                  setFormData({ ...formData, image: e.target.value });
                  setImagePreview(e.target.value);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            )}

            {imageMode === 'preset' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(GAME_PRESETS).map(([game, imgUrl]) => (
                  <button
                    key={game}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, game, image: imgUrl }));
                      setImagePreview(imgUrl);
                    }}
                    className={`p-2 rounded-xl border text-center transition ${
                      formData.game === game && imagePreview === imgUrl
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider truncate">{game}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: General Details */}
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Title *</span>
              <input
                type="text"
                required
                placeholder="e.g. Red Bull Campus Clutch 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Esports Game Title Focus *</span>
              <select
                value={formData.game}
                onChange={(e) => handleGameChange(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0C111D] px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              >
                {['Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC24', 'Apex Legends'].map((game) => (
                  <option key={game} value={game} className="bg-[#0C111D] text-white">{game}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Format *</span>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0C111D] px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              >
                {['Single Elimination', 'Double Elimination', 'Squad Battle Royale', 'Swiss Bracket', 'Round Robin', '1v1 Knockout'].map((fmt) => (
                  <option key={fmt} value={fmt} className="bg-[#0C111D] text-white">{fmt}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prize Pool *</span>
              <input
                type="text"
                required
                placeholder="e.g. ₹50,000 or ₹1,00,000"
                value={formData.prize}
                onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Max Team Slots *</span>
              <select
                value={formData.teams}
                onChange={(e) => setFormData({ ...formData, teams: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0C111D] px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              >
                {['8', '16', '32', '64', '128', '256'].map((slots) => (
                  <option key={slots} value={slots} className="bg-[#0C111D] text-white">{slots} Teams</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Schedule / Dates *</span>
              <input
                type="text"
                required
                placeholder="e.g. 24-26 Jun 2026"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Fee *</span>
              <input
                type="text"
                required
                placeholder="e.g. Free or ₹200/team"
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region / Venue *</span>
              <input
                type="text"
                required
                placeholder="e.g. Online Pan-India / South Zone LAN"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Publishing to Database...' : 'Launch & Publish Tournament'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
