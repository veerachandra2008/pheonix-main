'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
  Sparkles,
  FileText,
  Clock,
  Crown,
  ShieldAlert,
  Layers,
  Mail,
  MessageSquare
} from 'lucide-react';

const GAME_PRESETS: Record<string, string> = {
  'Valorant': '/valorant.jpg',
  'BGMI': '/bgmi.jpg',
  'Free Fire': '/freefire.jpg',
  'CS2': '/cs2.jpg',
  'FC / FIFA': '/fc.jpg',
  'Apex Legends': '/apex.jpg',
};

export default function EditTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = (params?.id as string) || '';
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [imagePreview, setImagePreview] = useState('/valorant.jpg');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    game: 'Valorant',
    format: 'Single Elimination',
    teams: '32',
    prize: '₹50,000',
    prize_1st: '',
    prize_2nd: '',
    prize_3rd: '',
    date: '18-20 May 2026',
    region: 'Online',
    fee: 'Free',
    image: '/valorant.jpg',
    status: 'Registering',
    host: '',
    description: '',
    rules: '',
    schedule: '',
    map_pool: '',
    contact_email: '',
    discord_url: '',
  });

  const loadTournament = async (userEmail: string, userRole: string, userName?: string) => {
    setLoading(true);
    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
      const data = await res.json();

      let found: any = null;
      if (data.success && Array.isArray(data.data)) {
        found = data.data.find((t: any) => t.slug === rawId || String(t.id) === rawId);
      }

      if (!found) {
        alert('Tournament not found.');
        router.replace('/organizer/dashboard');
        return;
      }

      // Check ownership
      const createdBy = (found.createdBy || found.organizer_email || '').toLowerCase();
      const host = (found.host || '').toLowerCase();
      const isOwner =
        userRole === 'admin' ||
        (userEmail && createdBy === userEmail.toLowerCase()) ||
        (userName && host === userName.toLowerCase()) ||
        true; // Permissive for local demo

      setFormData({
        title: found.title || found.name || '',
        slug: found.slug,
        game: found.game || 'Valorant',
        format: found.format || 'Single Elimination',
        teams: String(found.teams || '32').replace(/[^0-9]/g, '') || '32',
        prize: found.prize || '₹50,000',
        prize_1st: found.prize_1st || '',
        prize_2nd: found.prize_2nd || '',
        prize_3rd: found.prize_3rd || '',
        date: found.date || 'Upcoming',
        region: found.region || 'Online',
        fee: found.fee || 'Free',
        image: found.image || '/valorant.jpg',
        status: found.status || 'Registering',
        host: found.host || userName || 'Verified Host',
        description: found.description || '',
        rules: found.rules || '',
        schedule: found.schedule || '',
        map_pool: found.map_pool || '',
        contact_email: found.contact_email || userEmail || '',
        discord_url: found.discord_url || '',
      });
      setImagePreview(found.image || '/valorant.jpg');
    } catch (e) {
      console.error(e);
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
        setSession(user);
        loadTournament(user.email, user.role || 'organizer', user.name);
      } catch {
        router.replace('/login');
      }
    }

    verifyAndLoad();
  }, [router, rawId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setFormData((prev) => ({ ...prev, image: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.prize.trim()) {
      alert('Tournament Title and Prize Pool are required.');
      return;
    }

    setSubmitting(true);
    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

      const updatePayload = {
        title: formData.title.trim(),
        name: formData.title.trim(),
        game: formData.game,
        format: formData.format,
        teams: `${formData.teams} Teams`,
        prize: formData.prize.trim(),
        prize_1st: formData.prize_1st.trim(),
        prize_2nd: formData.prize_2nd.trim(),
        prize_3rd: formData.prize_3rd.trim(),
        date: formData.date.trim(),
        region: formData.region,
        fee: formData.fee.trim(),
        image: formData.image || imagePreview,
        status: formData.status,
        status_color: formData.status === 'Live' ? '#EF4444' : formData.status === 'Registering' ? '#10B981' : '#38BDF8',
        description: formData.description.trim(),
        rules: formData.rules.trim(),
        schedule: formData.schedule.trim(),
        map_pool: formData.map_pool.trim(),
        contact_email: formData.contact_email.trim(),
        discord_url: formData.discord_url.trim(),
      };

      const res = await fetch(`${apiBase}/tournaments/${formData.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update tournament');
      }

      alert('Tournament details and rules updated successfully!');
      router.push(`/organizer/tournament/${formData.slug}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update tournament');
    } finally {
      setSubmitting(false);
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
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
        <Link
          href={`/organizer/tournament/${formData.slug}`}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament Management
        </Link>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Configure Lobby & Rules</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Edit Tournament & Rules
          </h1>
          <p className="text-slate-400 text-sm">
            Updating: <strong className="text-white">{formData.title}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 border border-white/10 bg-[#0C111D] p-6 sm:p-10 rounded-3xl shadow-2xl">
          
          {/* Image Artwork */}
          <div className="space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-indigo-400" /> Tournament Banner Artwork
            </span>

            <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-white/15 bg-black shadow-xl">
              <img
                src={imagePreview || '/hero-arena.jpg'}
                alt="Banner preview"
                className="h-full w-full object-cover filter brightness-75"
                onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 bg-indigo-600/80 backdrop-blur-md rounded-lg text-xs font-bold text-white uppercase tracking-wider">
                  {formData.game}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImageMode('preset')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  imageMode === 'preset' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                Game Preset
              </button>
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  imageMode === 'upload' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  imageMode === 'url' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                Custom URL
              </button>
            </div>

            {imageMode === 'preset' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(GAME_PRESETS).map(([name, src]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setImagePreview(src);
                      setFormData((prev) => ({ ...prev, image: src, game: name }));
                    }}
                    className={`p-2 rounded-xl border text-center transition ${
                      imagePreview === src ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <p className="text-[10px] font-bold text-slate-300 truncate">{name}</p>
                  </button>
                ))}
              </div>
            )}

            {imageMode === 'upload' && (
              <label className="flex items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-indigo-500 rounded-2xl cursor-pointer bg-white/[0.01] transition">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                  <Upload className="h-4 w-4" /> Click to browse and upload image
                </div>
              </label>
            )}

            {imageMode === 'url' && (
              <input
                type="text"
                placeholder="https://example.com/banner.jpg"
                value={formData.image}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, image: e.target.value }));
                  setImagePreview(e.target.value);
                }}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono outline-none focus:border-indigo-500"
              />
            )}
          </div>

          {/* Core Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tournament Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            {/* Game */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gamepad2 className="h-3.5 w-3.5 text-indigo-400" /> Esports Title
              </label>
              <select
                value={formData.game}
                onChange={(e) => {
                  const g = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    game: g,
                    image: GAME_PRESETS[g] || prev.image,
                  }));
                  if (GAME_PRESETS[g]) setImagePreview(GAME_PRESETS[g]);
                }}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-bold"
              >
                <option value="Valorant">Valorant (PC)</option>
                <option value="BGMI">BGMI (Mobile Squad)</option>
                <option value="CS2">CS2 (PC 5v5)</option>
                <option value="Free Fire">Free Fire (Mobile Squad)</option>
                <option value="FC / FIFA">FC / FIFA (1v1)</option>
                <option value="Apex Legends">Apex Legends</option>
              </select>
            </div>

            {/* Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Match Format
              </label>
              <input
                type="text"
                value={formData.format}
                onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value }))}
                placeholder="e.g. Double Elimination / Squad BR / Single Elim"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Total Prize Pool */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Total Prize Pool
              </label>
              <input
                type="text"
                value={formData.prize}
                onChange={(e) => setFormData((prev) => ({ ...prev, prize: e.target.value }))}
                placeholder="e.g. ₹2,50,000"
                required
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-amber-400 text-sm font-black outline-none focus:border-amber-500"
              />
            </div>

            {/* Entry Fee */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Registration Fee
              </label>
              <input
                type="text"
                value={formData.fee}
                onChange={(e) => setFormData((prev) => ({ ...prev, fee: e.target.value }))}
                placeholder="e.g. Free or ₹500/team"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Slots */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-400" /> Max Slots (Teams)
              </label>
              <input
                type="number"
                value={formData.teams}
                onChange={(e) => setFormData((prev) => ({ ...prev, teams: e.target.value }))}
                placeholder="e.g. 64"
                min="2"
                max="500"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-bold"
              >
                <option value="Registering">Registering (Green)</option>
                <option value="Live">Live / In-Progress (Red)</option>
                <option value="Upcoming">Upcoming (Blue)</option>
              </select>
            </div>

            {/* Event Dates */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" /> Event Date
              </label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                placeholder="e.g. 28 May - 2 Jun 2026"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Region / Venue */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Region / Venue
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="e.g. Pan India / South Zone / Online"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

          </div>

          {/* ═══════════════ PRIZE BREAKDOWN SECTION ═══════════════ */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Crown className="h-4 w-4" /> Prize Distribution Podium Breakdown
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <label className="text-[10px] font-black uppercase text-amber-300">1st Place (Champion)</label>
                <input
                  type="text"
                  value={formData.prize_1st}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prize_1st: e.target.value }))}
                  placeholder="e.g. ₹1,25,000 + Trophy"
                  className="w-full px-3 py-2 bg-black/50 border border-amber-500/30 rounded-xl text-white text-xs font-bold outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300">2nd Place (Runner-Up)</label>
                <input
                  type="text"
                  value={formData.prize_2nd}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prize_2nd: e.target.value }))}
                  placeholder="e.g. ₹75,000 + Silver"
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-700 rounded-xl text-white text-xs font-bold outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-amber-900/15 border border-amber-800/40 space-y-1">
                <label className="text-[10px] font-black uppercase text-amber-500">3rd Place (Bronze)</label>
                <input
                  type="text"
                  value={formData.prize_3rd}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prize_3rd: e.target.value }))}
                  placeholder="e.g. ₹50,000 + Bronze"
                  className="w-full px-3 py-2 bg-black/50 border border-amber-800/40 rounded-xl text-white text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* ═══════════════ DESCRIPTION / SYNOPSIS ═══════════════ */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" /> Tournament Synopsis & Overview
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your tournament, eligibility criteria, collegiate format, stream links, and special announcements..."
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-2xl text-white text-xs sm:text-sm leading-relaxed outline-none focus:border-indigo-500 font-normal"
            />
          </div>

          {/* ═══════════════ RULES & REGULATIONS ═══════════════ */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Rules & Regulations (Anti-Cheat & Match Guidelines)
            </label>
            <textarea
              rows={5}
              value={formData.rules}
              onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
              placeholder="Enter match rules (e.g. 1. Device restrictions. 2. Vanguard anti-cheat mandatory. 3. 10-minute check-in grace period. 4. Disconnect and re-host policies)..."
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-2xl text-white text-xs sm:text-sm leading-relaxed outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* ═══════════════ SCHEDULE TIMELINE ═══════════════ */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Schedule Stages & Match Timings
            </label>
            <textarea
              rows={4}
              value={formData.schedule}
              onChange={(e) => setFormData((prev) => ({ ...prev, schedule: e.target.value }))}
              placeholder="e.g. Day 1: Group Stage (10:00 AM - 04:00 PM)&#10;Day 2: Quarter Finals & Semi Finals&#10;Day 3: Grand Finals (BO5) live stream"
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-2xl text-white text-xs sm:text-sm leading-relaxed outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Map Pool & Organizer Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Competitive Map Pool</label>
              <input
                type="text"
                value={formData.map_pool}
                onChange={(e) => setFormData((prev) => ({ ...prev, map_pool: e.target.value }))}
                placeholder="e.g. Ascent, Bind, Haven, Lotus, Split"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-400" /> Host Contact / Discord
              </label>
              <input
                type="text"
                value={formData.contact_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                placeholder="e.g. organizer@esports.edu or Discord invite"
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-end gap-4">
            <Link
              href={`/organizer/tournament/${formData.slug}`}
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving Changes...' : 'Save & Publish Tournament'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
