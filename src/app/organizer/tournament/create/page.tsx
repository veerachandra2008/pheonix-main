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
  Sparkles,
  Crown,
  Plus,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { 
  sanitizeTournamentPayload, 
  invalidateTournamentsCache,
  embedTournamentMetadata,
  extractPrizeTiers,
  cleanDescriptionText,
  saveOrUpdateTournament,
  PrizeTier
} from '@/lib/tournaments-db';

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

  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([
    { id: 'tier-1', label: '1st Place (Champion)', amount: '₹1,25,000 + Trophy', rankKey: '1st' },
    { id: 'tier-2', label: '2nd Place (Runner-Up)', amount: '₹75,000 + Silver', rankKey: '2nd' },
    { id: 'tier-3', label: '3rd Place (Bronze)', amount: '₹50,000 + Bronze', rankKey: '3rd' },
  ]);

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
    host: '',
    organizer_name: '',
    organizer_email: '',
    organizer_phone: '',
    organizer_college: '',
    description: '',
    rules: '',
    schedule: '',
    map_pool: '',
    contact_email: '',
    discord_url: '',
  });

  const handleAddPrizeTier = (presetLabel?: string, defaultAmount?: string) => {
    const newId = `tier-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const count = prizeTiers.length + 1;
    const label = presetLabel || `${count}th Place Prize`;
    const amount = defaultAmount || '';
    
    let rankKey: '1st' | '2nd' | '3rd' | 'other' = 'other';
    if (label.toLowerCase().includes('1st')) rankKey = '1st';
    else if (label.toLowerCase().includes('2nd')) rankKey = '2nd';
    else if (label.toLowerCase().includes('3rd')) rankKey = '3rd';

    setPrizeTiers((prev) => [...prev, { id: newId, label, amount, rankKey }]);
  };

  const handleDeletePrizeTier = (id: string) => {
    setPrizeTiers((prev) => prev.filter((tier) => tier.id !== id));
  };

  const handleUpdatePrizeTier = (id: string, field: 'label' | 'amount', value: string) => {
    setPrizeTiers((prev) =>
      prev.map((tier) => {
        if (tier.id === id) {
          const updated = { ...tier, [field]: value };
          if (field === 'label') {
            const l = value.toLowerCase();
            if (l.includes('1st')) updated.rankKey = '1st';
            else if (l.includes('2nd')) updated.rankKey = '2nd';
            else if (l.includes('3rd')) updated.rankKey = '3rd';
            else updated.rankKey = 'other';
          }
          return updated;
        }
        return tier;
      })
    );
  };

  useEffect(() => {
    async function verifyOrganizer() {
      const rawSession = localStorage.getItem('xenova_session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }

      try {
        const user = JSON.parse(rawSession);
        const email = (user.email || '').trim().toLowerCase();
        const role = (user.role || '').toLowerCase();

        // Admin always has bypass
        if (role === 'admin' || email === 'admin@xenova.gg') {
          setSession(user);
          setFormData((prev) => ({
            ...prev,
            host: user.name || 'Xenova HQ',
            contact_email: user.email || 'admin@xenova.gg',
          }));
          return;
        }

        let isApprovedOrganizer = role === 'organizer' || role === 'host';
        let hostName = user.hostName || user.name || 'Verified Host';
        let organizerCollege = user.college || '';
        let organizerPhone = user.phone || '';

        // 1. Direct Supabase Query check
        try {
          const { data } = await supabase
            .from('organizer_applications')
            .select('*')
            .eq('email', email);

          if (data && data.length > 0) {
            const app = data[0];
            const status = (app.status || '').toUpperCase();
            if (status === 'APPROVED') {
              isApprovedOrganizer = true;
              hostName = app.host_name || user.name || 'Verified Host';
              if (app.college) organizerCollege = app.college;
              if (app.phone) organizerPhone = app.phone;
            }
          }
        } catch (err) {
          console.warn('Supabase organizer verification notice:', err);
        }

        // 2. Fallback to API Check
        if (!isApprovedOrganizer) {
          try {
            const apiBase = getApiBaseUrl();

            const res = await fetch(`${apiBase}/auth/organizers`, { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                const matched = json.data.find(
                  (a: any) => (a.email || '').toLowerCase().trim() === email
                );
                if (matched) {
                  isApprovedOrganizer = true;
                  hostName = matched.name || matched.host_name || user.name;
                  if (matched.college) organizerCollege = matched.college;
                  if (matched.phone) organizerPhone = matched.phone;
                }
              }
            }
          } catch (apiErr) {
            console.warn('API organizer verification notice:', apiErr);
          }
        }

        if (!isApprovedOrganizer) {
          const updatedSession = { ...user, role: 'player' };
          delete updatedSession.hostName;
          localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
          window.dispatchEvent(new Event('xenova-auth-change'));
          alert('You must be an approved Organizer or Host to launch a tournament.');
          router.replace('/organizer/apply');
          return;
        }

        const validSession = { ...user, role: 'organizer', hostName, college: organizerCollege, phone: organizerPhone };
        localStorage.setItem('xenova_session', JSON.stringify(validSession));
        setSession(validSession);
        setFormData((prev) => ({
          ...prev,
          host: hostName,
          organizer_name: hostName,
          organizer_email: validSession.email,
          organizer_phone: organizerPhone,
          organizer_college: organizerCollege,
          contact_email: validSession.email,
          contact_phone: organizerPhone,
          college: organizerCollege,
        }));
      } catch {
        router.replace('/login');
      }
    }

    verifyOrganizer();
  }, [router]);

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
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);

      // Resolve 1st, 2nd, 3rd place from prize tiers
      const p1Tier = prizeTiers.find((t) => t.rankKey === '1st' || t.label.toLowerCase().includes('1st')) || prizeTiers[0];
      const p2Tier = prizeTiers.find((t) => (t.rankKey === '2nd' || t.label.toLowerCase().includes('2nd')) && t.id !== p1Tier?.id) || prizeTiers.find((t) => t.id !== p1Tier?.id);
      const p3Tier = prizeTiers.find((t) => (t.rankKey === '3rd' || t.label.toLowerCase().includes('3rd')) && t.id !== p1Tier?.id && t.id !== p2Tier?.id) || prizeTiers.find((t) => t.id !== p1Tier?.id && t.id !== p2Tier?.id);

      const p1 = p1Tier?.amount?.trim() || '';
      const p2 = p2Tier?.amount?.trim() || '';
      const p3 = p3Tier?.amount?.trim() || '';

      const organizerName = (formData.organizer_name.trim() || formData.host.trim() || session?.hostName || session?.name || 'Verified Host').trim();
      const organizerEmail = (formData.organizer_email.trim() || session?.email || '').trim().toLowerCase();
      const organizerPhone = (formData.organizer_phone.trim() || session?.phone || '').trim();
      const organizerCollege = (formData.organizer_college.trim() || session?.college || '').trim();

      const newTournament = {
        slug,
        title: formData.title.trim(),
        host: organizerName,
        organizer_name: organizerName,
        organizer_email: organizerEmail,
        organizer_phone: organizerPhone,
        organizer_college: organizerCollege,
        contact_email: formData.contact_email.trim() || organizerEmail,
        contact_phone: organizerPhone,
        college: organizerCollege,
        image: formData.image || imagePreview,
        game: formData.game,
        status: formData.status,
        status_color: formData.status === 'Live' ? '#EF4444' : formData.status === 'Registering' ? '#10B981' : '#38BDF8',
        prize: formData.prize.trim(),
        prize_1st: p1 || formData.prize.trim(),
        prize_2nd: p2 || '',
        prize_3rd: p3 || '',
        date: formData.date.trim(),
        region: formData.region,
        format: formData.format,
        teams: `${formData.teams} Teams`,
        fee: formData.fee.trim(),
        description: formData.description.trim(),
        rules: formData.rules.trim(),
        schedule: formData.schedule.trim(),
        map_pool: formData.map_pool.trim(),
        discord_url: formData.discord_url.trim(),
      };

      // Resilient Save
      const result = await saveOrUpdateTournament(slug, newTournament);
      if (!result.success) {
        throw new Error(result.error || 'Failed to launch tournament.');
      }

      alert(`Tournament "${formData.title}" launched successfully!`);
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

          {/* ═══════════════ PRIZE BREAKDOWN SECTION ═══════════════ */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <Crown className="h-4 w-4" /> Prize Distribution Podium Breakdown
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure custom cash rewards, trophies, and awards. Add or delete prize tiers as needed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddPrizeTier()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider transition self-start sm:self-auto shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Prize Position
              </button>
            </div>

            {/* Quick Add Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Add:</span>
              {!prizeTiers.some((t) => t.label.toLowerCase().includes('1st')) && (
                <button
                  type="button"
                  onClick={() => handleAddPrizeTier('1st Place (Champion)', '₹1,25,000 + Trophy')}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" /> 1st Place
                </button>
              )}
              {!prizeTiers.some((t) => t.label.toLowerCase().includes('2nd')) && (
                <button
                  type="button"
                  onClick={() => handleAddPrizeTier('2nd Place (Runner-Up)', '₹75,000 + Silver')}
                  className="px-2 py-1 rounded-lg bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" /> 2nd Place
                </button>
              )}
              {!prizeTiers.some((t) => t.label.toLowerCase().includes('3rd')) && (
                <button
                  type="button"
                  onClick={() => handleAddPrizeTier('3rd Place (Bronze)', '₹50,000 + Bronze')}
                  className="px-2 py-1 rounded-lg bg-amber-900/20 hover:bg-amber-900/30 border border-amber-800/50 text-amber-400 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" /> 3rd Place
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAddPrizeTier('4th Place', '₹25,000')}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> 4th Place
              </button>
              <button
                type="button"
                onClick={() => handleAddPrizeTier('MVP / Top Fragger', '₹10,000 + MVP Trophy')}
                className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> MVP Award
              </button>
              <button
                type="button"
                onClick={() => handleAddPrizeTier('Best Sniper / IGL', '₹5,000 Special Prize')}
                className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> Special Award
              </button>
            </div>

            {/* Prize Tiers Grid */}
            {prizeTiers.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/15 text-center space-y-2 bg-black/20">
                <Crown className="h-6 w-6 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No prize tiers defined.</p>
                <button
                  type="button"
                  onClick={() => {
                    setPrizeTiers([
                      { id: 'tier-1', label: '1st Place (Champion)', amount: '₹1,25,000 + Trophy', rankKey: '1st' },
                      { id: 'tier-2', label: '2nd Place (Runner-Up)', amount: '₹75,000 + Silver', rankKey: '2nd' },
                      { id: 'tier-3', label: '3rd Place (Bronze)', amount: '₹50,000 + Bronze', rankKey: '3rd' },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-black uppercase tracking-wider transition"
                >
                  Restore Default Top 3 Podium
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {prizeTiers.map((tier, idx) => {
                  const isGold = tier.label.toLowerCase().includes('1st') || tier.rankKey === '1st' || (idx === 0 && !tier.rankKey);
                  const isSilver = tier.label.toLowerCase().includes('2nd') || tier.rankKey === '2nd' || (idx === 1 && !tier.rankKey);
                  const isBronze = tier.label.toLowerCase().includes('3rd') || tier.rankKey === '3rd' || (idx === 2 && !tier.rankKey);
                  const isMvp = tier.label.toLowerCase().includes('mvp') || tier.label.toLowerCase().includes('fragger');

                  let cardStyle = 'bg-white/5 border-white/10 text-indigo-300';
                  let badgeStyle = 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30';
                  let inputBorder = 'border-white/10 focus:border-indigo-500';

                  if (isGold) {
                    cardStyle = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
                    badgeStyle = 'text-amber-300 bg-amber-500/20 border-amber-500/40';
                    inputBorder = 'border-amber-500/30 focus:border-amber-400';
                  } else if (isSilver) {
                    cardStyle = 'bg-zinc-800/30 border-zinc-700 text-slate-300';
                    badgeStyle = 'text-slate-300 bg-zinc-700/40 border-zinc-600';
                    inputBorder = 'border-zinc-700 focus:border-slate-400';
                  } else if (isBronze) {
                    cardStyle = 'bg-amber-900/15 border-amber-800/40 text-amber-500';
                    badgeStyle = 'text-amber-400 bg-amber-900/30 border-amber-800/50';
                    inputBorder = 'border-amber-800/40 focus:border-amber-500';
                  } else if (isMvp) {
                    cardStyle = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
                    badgeStyle = 'text-rose-300 bg-rose-500/20 border-rose-500/40';
                    inputBorder = 'border-rose-500/30 focus:border-rose-400';
                  }

                  return (
                    <div key={tier.id} className={`p-3.5 rounded-2xl border ${cardStyle} space-y-2 transition relative group shadow-sm`}>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdatePrizeTier(tier.id, 'label', e.target.value)}
                          placeholder="Tier Label (e.g. 1st Place)"
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border bg-black/40 ${badgeStyle} outline-none w-full max-w-[180px]`}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePrizeTier(tier.id)}
                          title="Delete this prize tier"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={tier.amount}
                          onChange={(e) => handleUpdatePrizeTier(tier.id, 'amount', e.target.value)}
                          placeholder="e.g. ₹1,25,000 + Trophy"
                          className={`w-full px-3 py-2 bg-black/60 border ${inputBorder} rounded-xl text-white text-xs font-bold outline-none transition placeholder:text-slate-600`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══════════════ ORGANIZER & MARSHAL PROFILE SECTION ═══════════════ */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Organizer & Marshal Support Details
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                These verified details will be exclusively displayed on this tournament's public details page so players can contact you directly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizer / Host Name *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Veera Chandra or Nexus Esports Club"
                  value={formData.organizer_name || formData.host}
                  onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value, host: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizer College / Varsity Affiliation *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexus Institute of Technology"
                  value={formData.organizer_college}
                  onChange={(e) => setFormData({ ...formData, organizer_college: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizer Phone / WhatsApp Number *</span>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={formData.organizer_phone}
                  onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizer Official Email *</span>
                <input
                  type="email"
                  required
                  placeholder="e.g. organizer@nexus.edu"
                  value={formData.organizer_email || formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, organizer_email: e.target.value, contact_email: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500/50"
                />
              </label>
            </div>
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
