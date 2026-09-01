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
  MessageSquare,
  Plus,
  Trash2,
  Medal,
  Award,
  ShieldCheck
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { 
  sanitizeTournamentPayload, 
  invalidateTournamentsCache,
  extractPrizeTiers,
  cleanDescriptionText,
  embedTournamentMetadata,
  extractOrganizerData,
  saveOrUpdateTournament,
  getTournamentBySlug,
  PrizeTier
} from '@/lib/tournaments-db';

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
  const rawId = decodeURIComponent((params?.id as string) || '').trim();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [imagePreview, setImagePreview] = useState('/valorant.jpg');

  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([
    { id: 'tier-1', label: '1st Place (Champion)', amount: '', rankKey: '1st' },
    { id: 'tier-2', label: '2nd Place (Runner-Up)', amount: '', rankKey: '2nd' },
    { id: 'tier-3', label: '3rd Place (Bronze)', amount: '', rankKey: '3rd' },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
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

  const loadTournament = async (userEmail: string, userRole: string, userName?: string) => {
    setLoading(true);
    try {
      let found = await getTournamentBySlug(rawId);

      // Fallback Tournament if not found in database yet
      if (!found) {
        found = {
          slug: rawId,
          title: rawId.replace(/[-_]/g, ' ').toUpperCase(),
          name: rawId.replace(/[-_]/g, ' ').toUpperCase(),
          game: 'BGMI',
          format: 'Single Elimination',
          teams: '32',
          prize: '₹50,000',
          prize_1st: '₹1,25,000 + Trophy',
          prize_2nd: '₹75,000 + Silver',
          prize_3rd: '₹50,000 + Bronze',
          date: '18-20 May 2026',
          region: 'Malla Reddy University',
          fee: '₹1000/team',
          image: '/bgmi.jpg',
          status: 'Registering',
          host: userName || 'veera',
          description: '',
          rules: '',
          schedule: '',
          map_pool: '',
          contact_email: userEmail || '',
          discord_url: '',
        };
      }

      // Extract organizer details accurately
      const org = extractOrganizerData(found);

      setFormData({
        title: found.title || found.name || '',
        slug: found.slug || rawId,
        game: found.game || 'Valorant',
        format: found.format || 'Single Elimination',
        teams: String(found.teams || '32').replace(/[^0-9]/g, '') || '32',
        prize: found.prize || '₹50,000',
        date: found.date || 'Upcoming',
        region: found.region || 'Online',
        fee: found.fee || 'Free',
        image: found.image || '/valorant.jpg',
        status: found.status || 'Registering',
        host: org.name || userName || 'Verified Host',
        organizer_name: org.name || userName || 'Verified Host',
        organizer_email: org.email || userEmail || '',
        organizer_phone: org.phone || '',
        organizer_college: org.college || '',
        description: cleanDescriptionText(found.description),
        rules: found.rules || '',
        schedule: found.schedule || '',
        map_pool: found.map_pool || '',
        contact_email: found.contact_email || org.email || userEmail || '',
        discord_url: found.discord_url || '',
      });

      // Populate prize tiers dynamically (from embedded metadata or columns)
      const loadedTiers = extractPrizeTiers(found);
      if (loadedTiers.length === 0) {
        loadedTiers.push(
          { id: 'tier-1', label: '1st Place (Champion)', amount: '₹1,25,000 + Trophy', rankKey: '1st' },
          { id: 'tier-2', label: '2nd Place (Runner-Up)', amount: '₹75,000 + Silver', rankKey: '2nd' },
          { id: 'tier-3', label: '3rd Place (Bronze)', amount: '₹50,000 + Bronze', rankKey: '3rd' }
        );
      }
      setPrizeTiers(loadedTiers);

      setImagePreview(found.image || '/valorant.jpg');
    } catch (e) {
      console.error('Failed to load tournament for edit:', e);
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
        loadTournament(user.email, user.role || 'organizer', user.hostName || user.name);
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
      // Resolve 1st, 2nd, 3rd place from prize tiers
      const p1Tier = prizeTiers.find((t) => t.rankKey === '1st' || t.label.toLowerCase().includes('1st')) || prizeTiers[0];
      const p2Tier = prizeTiers.find((t) => (t.rankKey === '2nd' || t.label.toLowerCase().includes('2nd')) && t.id !== p1Tier?.id) || prizeTiers.find((t) => t.id !== p1Tier?.id);
      const p3Tier = prizeTiers.find((t) => (t.rankKey === '3rd' || t.label.toLowerCase().includes('3rd')) && t.id !== p1Tier?.id && t.id !== p2Tier?.id) || prizeTiers.find((t) => t.id !== p1Tier?.id && t.id !== p2Tier?.id);

      const p1 = p1Tier?.amount?.trim() || '';
      const p2 = p2Tier?.amount?.trim() || '';
      const p3 = p3Tier?.amount?.trim() || '';

      const targetSlug = formData.slug || rawId;
      const organizerName = (formData.organizer_name.trim() || formData.host.trim() || session?.hostName || session?.name || 'Verified Host').trim();
      const organizerEmail = (formData.organizer_email.trim() || session?.email || '').trim().toLowerCase();
      const organizerPhone = (formData.organizer_phone.trim() || session?.phone || '').trim();
      const organizerCollege = (formData.organizer_college.trim() || session?.college || '').trim();

      const payload = {
        slug: targetSlug,
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
        teams: formData.teams.includes('Teams') ? formData.teams : `${formData.teams} Teams`,
        fee: formData.fee.trim(),
        description: formData.description.trim(),
        rules: formData.rules.trim(),
        schedule: formData.schedule.trim(),
        map_pool: formData.map_pool.trim(),
        discord_url: formData.discord_url.trim(),
      };

      // Direct Database Save
      const result = await saveOrUpdateTournament(targetSlug, payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update tournament.');
      }

      alert('Tournament details, prize breakdown, and organizer details updated successfully!');
      router.push(`/organizer/tournament/${targetSlug}`);
    } catch (err: any) {
      console.error('Failed to update tournament:', err);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Crown className="h-4 w-4" /> Prize Distribution Podium Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure custom cash rewards, trophies, and awards. Add or delete prize tiers as needed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAddPrizeTier()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider transition self-start sm:self-auto shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Prize Position
              </button>
            </div>

            {/* Quick Add Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Add:</span>
              {!prizeTiers.some((t) => t.label.toLowerCase().includes('1st')) && (
                <button
                  type="button"
                  onClick={() => handleAddPrizeTier('1st Place (Champion)', '₹1,25,000 + Trophy')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" /> 1st Place
                </button>
              )}
              {!prizeTiers.some((t) => t.label.toLowerCase().includes('2nd')) && (
                <button
                  type="button"
                  onClick={() => handleAddPrizeTier('2nd Place (Runner-Up)', '₹75,000 + Silver')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-700/30 hover:bg-zinc-700/50 border border-zinc-600 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" /> 2nd Place
                </button>
              )}
              {!prizeTiers.some((t) => t.label.toLowerCase().includes('3rd')) && (
                <button
                  type="button"
                  onClick={() => handleAddPrizeTier('3rd Place (Bronze)', '₹50,000 + Bronze')}
                  className="px-2.5 py-1 rounded-lg bg-amber-900/20 hover:bg-amber-900/30 border border-amber-800/50 text-amber-400 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="h-3 w-3" /> 3rd Place
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAddPrizeTier('4th Place', '₹25,000')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> 4th Place
              </button>
              <button
                type="button"
                onClick={() => handleAddPrizeTier('MVP / Top Fragger', '₹10,000 + MVP Trophy')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> MVP Award
              </button>
              <button
                type="button"
                onClick={() => handleAddPrizeTier('Best Sniper / IGL', '₹5,000 Special Prize')}
                className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" /> Special Award
              </button>
            </div>

            {/* Prize Tiers Grid */}
            {prizeTiers.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center space-y-3 bg-black/20">
                <Crown className="h-8 w-8 text-slate-600 mx-auto" />
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
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-black uppercase tracking-wider transition"
                >
                  Restore Default Top 3 Podium
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div key={tier.id} className={`p-4 rounded-2xl border ${cardStyle} space-y-2.5 transition relative group shadow-sm`}>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdatePrizeTier(tier.id, 'label', e.target.value)}
                          placeholder="Tier Label (e.g. 1st Place)"
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border bg-black/40 ${badgeStyle} outline-none w-full max-w-[200px]`}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePrizeTier(tier.id)}
                          title="Delete this prize tier"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
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

          {/* Organizer & Marshal Profile Details */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Verified Organizer & Marshal Details
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                These details will be displayed on the tournament details page so players know who launched and manages this tournament.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Organizer / Host Name *</label>
                <input
                  type="text"
                  required
                  value={formData.organizer_name || formData.host}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizer_name: e.target.value, host: e.target.value }))}
                  placeholder="e.g. Veera Chandra"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Organizer College / Affiliation *</label>
                <input
                  type="text"
                  required
                  value={formData.organizer_college}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizer_college: e.target.value }))}
                  placeholder="e.g. Nexus Institute of Technology"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Organizer Phone / WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.organizer_phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizer_phone: e.target.value }))}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Organizer Official Email *</label>
                <input
                  type="email"
                  required
                  value={formData.organizer_email || formData.contact_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizer_email: e.target.value, contact_email: e.target.value }))}
                  placeholder="e.g. organizer@esports.edu"
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Map Pool & Discord */}
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
                <Mail className="h-3.5 w-3.5 text-indigo-400" /> Discord / Community Invite Link
              </label>
              <input
                type="text"
                value={formData.discord_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, discord_url: e.target.value }))}
                placeholder="e.g. https://discord.gg/yourserver"
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
