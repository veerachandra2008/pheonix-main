'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react';
import { flaskApi, getCached } from '@/lib/flask-api';
import { getApiBaseUrl } from '@/lib/api-config';

const GAME_PRESET_IMAGES: Record<string, string> = {
  'Valorant': '/valorant.jpg',
  'BGMI': '/bgmi.jpg',
  'Free Fire': '/freefire.jpg',
  'CS2': '/cs2.jpg',
  'FC24': '/fc.jpg',
  'Apex Legends': '/apex.jpg',
};

export default function AdminEventManagementPage() {
  const [tournaments, setTournaments] = useState<any[]>(() => getCached<any[]>('admin:tournaments') || []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'preset'>('upload');
  const [previewImage, setPreviewImage] = useState<string>('/valorant.jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formValues, setFormValues] = useState({
    title: '',
    host: 'XENOVA Campus',
    game: 'Valorant',
    region: 'Online',
    prize: '₹50,000',
    fee: 'Free',
    teams: '32 Teams',
    date: '18-20 May 2026',
    format: 'Single Elimination',
    filled: '0',
    status: 'Registering',
    status_color: '#10B981',
    image: '/valorant.jpg'
  });

  const loadTournaments = async () => {
    try {
      const res = await flaskApi.getTournaments();
      if (res.success && Array.isArray(res.data)) {
        setTournaments(res.data);
      } else {
        setTournaments([]);
      }
    } catch (err) {
      console.error('Failed to load tournaments from DB:', err);
      setTournaments([]);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreviewImage(dataUrl);
        setFormValues((prev) => ({ ...prev, image: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGameChange = (game: string) => {
    const defaultImg = GAME_PRESET_IMAGES[game] || '/valorant.jpg';
    setFormValues((prev) => ({
      ...prev,
      game,
      image: imageMode === 'preset' ? defaultImg : prev.image,
    }));
    if (imageMode === 'preset') {
      setPreviewImage(defaultImg);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formValues.title.trim()) {
      alert('Tournament title is required.');
      return;
    }

    try {
      const slug = formValues.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const finalImage = formValues.image || previewImage || GAME_PRESET_IMAGES[formValues.game] || '/valorant.jpg';

      const newTournament = {
        title: formValues.title.trim(),
        host: formValues.host.trim(),
        game: formValues.game,
        region: formValues.region,
        prize: formValues.prize.trim(),
        fee: formValues.fee.trim(),
        teams: formValues.teams.trim(),
        date: formValues.date.trim(),
        format: formValues.format.trim(),
        slug: slug,
        image: finalImage,
        status: formValues.status,
        status_color: formValues.status === 'Live' ? '#EF4444' : formValues.status === 'Registering' ? '#10B981' : '#38BDF8',
        filled: parseInt(formValues.filled) || 0,
      };

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/tournaments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTournament),
      });

      const data = await res.json();
      if (!res.ok && !data.success) {
        throw new Error(data.message || 'Failed to save tournament in database');
      }

      alert('Tournament successfully launched and published to database!');
      setShowCreateModal(false);

      // Reset form
      setFormValues({
        title: '',
        host: 'XENOVA Campus',
        game: 'Valorant',
        region: 'Online',
        prize: '₹50,000',
        fee: 'Free',
        teams: '32 Teams',
        date: '18-20 May 2026',
        format: 'Single Elimination',
        filled: '0',
        status: 'Registering',
        status_color: '#10B981',
        image: '/valorant.jpg'
      });
      setPreviewImage('/valorant.jpg');

      await loadTournaments();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to launch tournament.');
    }
  };

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete tournament "${title}" from the database and user portal?`)) return;
    try {
      await flaskApi.deleteTournament(slug);
      alert(`Tournament "${title}" deleted successfully from the database.`);
      await loadTournaments();
    } catch (e) {
      console.error(e);
      alert('Failed to delete tournament.');
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
            Launch, configure with custom photos, and manage collegiate tournaments across all esports titles.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setPreviewImage(formValues.image || '/valorant.jpg');
          }}
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-rose-600/20 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Launch Tournament
        </button>
      </header>

      {/* Tournaments Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white">
            Active Tournaments in Database ({tournaments.length})
          </h2>
          <span className="text-xs text-slate-500">All tournaments are synced directly with Supabase</span>
        </div>

        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0C111D] p-12 text-center text-slate-400 space-y-4">
            <Trophy className="h-12 w-12 text-slate-600 mx-auto" />
            <div>
              <p className="text-base font-bold text-white">No tournaments in database.</p>
              <p className="text-xs text-slate-500 mt-1">Click "Launch Tournament" to provision a new tournament with custom photo.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 transition text-xs font-bold uppercase tracking-wider text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Launch First Tournament
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t, idx) => {
              return (
                <motion.article
                  key={`${t.slug || t.title || 'tourn'}-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-white/10 bg-[#0C111D] overflow-hidden rounded-2xl flex flex-col justify-between group shadow-xl"
                >
                  <div>
                    {/* Tournament Banner with Photo */}
                    <div className="relative h-44 bg-slate-900 overflow-hidden">
                      <img
                        src={t.image || '/hero-arena.jpg'}
                        alt={t.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/hero-arena.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0C111D] via-transparent to-black/40" />

                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md text-white shadow-lg"
                        style={{ backgroundColor: t.status_color || t.statusColor || '#10B981' }}
                      >
                        {t.status}
                      </span>

                      {/* Prominent Delete Button for Admin */}
                      <button
                        onClick={() => handleDelete(t.slug, t.title || t.name)}
                        className="absolute top-3 right-3 h-8 w-8 bg-black/60 backdrop-blur-md border border-rose-500/30 hover:bg-rose-600 hover:border-rose-500 text-rose-400 hover:text-white transition flex items-center justify-center rounded-lg shadow-lg cursor-pointer"
                        title="Delete tournament from database"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

                  <div className="px-5 pb-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-[#FBBF24]">
                    <span>Prize: {t.prize}</span>
                    <span className="text-slate-400 text-[10px]">Fee: {t.fee}</span>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* Creation Modal Overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#0C111D] border border-white/10 p-6 sm:p-8 rounded-2xl overflow-y-auto max-h-[92vh] shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-rose-400 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Provision Arena & Match Lobby
                  </h3>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white mt-1">
                    Launch New Tournament
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 w-8 hover:bg-white/10 text-slate-400 hover:text-white transition flex items-center justify-center rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ═══════════════ PHOTO BANNER ATTACHMENT SECTION ═══════════════ */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-rose-400" /> Tournament Banner Photo
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Upload custom tournament artwork or enter an image URL to be displayed on user cards and pass tickets.
                      </p>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setImageMode('upload')}
                        className={`px-3 py-1.5 rounded-md transition ${imageMode === 'upload' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode('url')}
                        className={`px-3 py-1.5 rounded-md transition ${imageMode === 'url' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        Image URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode('preset')}
                        className={`px-3 py-1.5 rounded-md transition ${imageMode === 'preset' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        Presets
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: File Upload */}
                  {imageMode === 'upload' && (
                    <div className="space-y-3">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/20 hover:border-rose-500/50 bg-black/40 hover:bg-rose-500/5 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
                      >
                        <div className="h-12 w-12 rounded-full bg-white/5 group-hover:bg-rose-500/20 flex items-center justify-center text-slate-400 group-hover:text-rose-400 transition">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-white">Click to browse or drop tournament banner image</p>
                        <p className="text-xs text-slate-500">Supports PNG, JPG, WEBP (Landscape recommended)</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Mode 2: Direct Image URL */}
                  {imageMode === 'url' && (
                    <div className="space-y-2">
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Banner URL</span>
                        <div className="relative mt-1">
                          <LinkIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/... or /valorant.jpg"
                            value={formValues.image}
                            onChange={(e) => {
                              setFormValues({ ...formValues, image: e.target.value });
                              setPreviewImage(e.target.value);
                            }}
                            className="w-full border border-white/10 bg-white/5 pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                          />
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Mode 3: Game Artwork Presets */}
                  {imageMode === 'preset' && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {Object.entries(GAME_PRESET_IMAGES).map(([gameName, imgUrl]) => (
                        <button
                          key={gameName}
                          type="button"
                          onClick={() => {
                            setFormValues({ ...formValues, image: imgUrl, game: gameName });
                            setPreviewImage(imgUrl);
                          }}
                          className={`relative rounded-xl overflow-hidden border transition p-1 text-left ${previewImage === imgUrl ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-white/10 hover:border-white/30'}`}
                        >
                          <div className="h-14 w-full rounded-lg overflow-hidden bg-slate-900">
                            <img src={imgUrl} alt={gameName} className="h-full w-full object-cover" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-tight text-white mt-1 truncate">{gameName}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Live Image Preview */}
                  {previewImage && (
                    <div className="relative rounded-xl overflow-hidden border border-white/15 h-36 bg-slate-950">
                      <img
                        src={previewImage}
                        alt="Banner Preview"
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/hero-arena.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-[9px] font-black uppercase tracking-wider text-white">
                            Banner Preview
                          </span>
                          <h4 className="text-base font-black italic uppercase text-white mt-1 drop-shadow">
                            {formValues.title || 'Tournament Title Preview'}
                          </h4>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══════════════ TOURNAMENT DETAILS SECTION ═══════════════ */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Title</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Valorant Spring Championship"
                      value={formValues.title}
                      onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Host</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. XENOVA Esports Club"
                      value={formValues.host}
                      onChange={(e) => setFormValues({ ...formValues, host: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Game Title</span>
                    <select
                      value={formValues.game}
                      onChange={(e) => handleGameChange(e.target.value)}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    >
                      {['Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC24', 'Apex Legends'].map((g) => (
                        <option key={g} value={g} className="bg-[#0C111D] text-white">{g}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region / Venue</span>
                    <select
                      value={formValues.region}
                      onChange={(e) => setFormValues({ ...formValues, region: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    >
                      {['Pan India', 'Online', 'South Zone', 'North Zone', 'West Zone', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad'].map((r) => (
                        <option key={r} value={r} className="bg-[#0C111D] text-white">{r}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Status</span>
                    <select
                      value={formValues.status}
                      onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
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
                      placeholder="e.g. ₹1,00,000"
                      value={formValues.prize}
                      onChange={(e) => setFormValues({ ...formValues, prize: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Fee</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Free or ₹200/team"
                      value={formValues.fee}
                      onChange={(e) => setFormValues({ ...formValues, fee: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Slot Size</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 64/64 or 32 Teams"
                      value={formValues.teams}
                      onChange={(e) => setFormValues({ ...formValues, teams: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
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
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Format Structure</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Double Elimination or Squad BR"
                      value={formValues.format}
                      onChange={(e) => setFormValues({ ...formValues, format: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slot Filled (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={formValues.filled}
                      onChange={(e) => setFormValues({ ...formValues, filled: e.target.value })}
                      className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3 rounded-xl text-sm outline-none focus:border-rose-500/50 text-white"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-rose-600/25 cursor-pointer"
                >
                  Publish & Launch Tournament
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
