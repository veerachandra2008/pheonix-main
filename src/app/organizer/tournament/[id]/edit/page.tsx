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
    date: '18-20 May 2026',
    region: 'Online',
    fee: 'Free',
    image: '/valorant.jpg',
    status: 'Registering',
    host: '',
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
        (userName && host === userName.toLowerCase());

      if (!isOwner) {
        alert('You do not have permission to edit this tournament.');
        router.replace('/organizer/dashboard');
        return;
      }

      setFormData({
        title: found.title || found.name || '',
        slug: found.slug,
        game: found.game || 'Valorant',
        format: found.format || 'Single Elimination',
        teams: String(found.teams || '32').replace(/[^0-9]/g, '') || '32',
        prize: found.prize || '₹50,000',
        date: found.date || 'Upcoming',
        region: found.region || 'Online',
        fee: found.fee || 'Free',
        image: found.image || '/valorant.jpg',
        status: found.status || 'Registering',
        host: found.host || userName || 'Verified Host',
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
        const email = (user.email || '').trim().toLowerCase();
        const role = (user.role || '').toLowerCase();

        if (role === 'admin' || email === 'admin@xenova.gg') {
          setSession(user);
          loadTournament(user.email, 'admin', user.name);
          return;
        }

        let isApproved = false;
        let hostName = user.name || 'Verified Host';

        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase.from('organizer_applications').select('*').eq('email', email);
          if (data && data.length > 0 && (data[0].status || '').toUpperCase() === 'APPROVED') {
            isApproved = true;
            hostName = data[0].host_name || user.name || 'Verified Host';
          }
        } catch {}

        if (!isApproved) {
          const updatedSession = { ...user, role: 'player' };
          delete updatedSession.hostName;
          localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
          window.dispatchEvent(new Event('xenova-auth-change'));
          router.replace('/organizer/apply');
          return;
        }

        const validSession = { ...user, role: 'organizer', hostName };
        setSession(validSession);
        loadTournament(validSession.email, 'organizer', validSession.name);
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
        date: formData.date.trim(),
        region: formData.region,
        fee: formData.fee.trim(),
        image: formData.image || imagePreview,
        status: formData.status,
        status_color: formData.status === 'Live' ? '#EF4444' : formData.status === 'Registering' ? '#10B981' : '#38BDF8',
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

      alert('Tournament updated successfully in database!');
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
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
        <Link
          href={`/organizer/tournament/${formData.slug}`}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament Management
        </Link>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Configure Lobby</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tight text-white">
            Edit Tournament
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
                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md bg-indigo-600 text-white">
                  {formData.game}
                </span>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-white mt-1">
                  {formData.title}
                </h3>
              </div>
            </div>

            <div className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 transition p-6 rounded-2xl text-center bg-white/[0.02]">
              <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-white mb-1">Replace Poster Artwork</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Title *</span>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0C111D] px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              >
                <option value="Registering">Registering</option>
                <option value="Live">Live</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prize Pool *</span>
              <input
                type="text"
                required
                value={formData.prize}
                onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Format</span>
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
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule / Dates</span>
              <input
                type="text"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region</span>
              <input
                type="text"
                required
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entry Fee</span>
              <input
                type="text"
                required
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </label>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving changes to database...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
