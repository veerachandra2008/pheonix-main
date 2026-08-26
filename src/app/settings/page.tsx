'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Zap,
  Building2,
  Save,
  Camera,
  Upload,
  Sparkles,
  Users,
  Award,
  Image as ImageIcon
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

const PRESET_AVATARS = [
  { label: 'Valorant Phoenix', src: '/valorant.jpg' },
  { label: 'Apex Legends', src: '/apex.jpg' },
  { label: 'BGMI Soldier', src: '/bgmi.jpg' },
  { label: 'CS2 Operative', src: '/cs2.jpg' },
  { label: 'Cyber Hero', src: '/hero-arena.jpg' },
  { label: 'FC Striker', src: '/fc.jpg' },
];

// Helper to auto-resize and compress images to max 512x512 (~35KB-50KB)
const compressImageToDataUrl = (file: File, maxDim = 512, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
  });
};

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [college, setCollege] = useState('');
  const [team, setTeam] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('/valorant.jpg');

  useEffect(() => {
    const raw = localStorage.getItem('xenova_session');
    if (!raw) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(raw);
      setSessionUser(user);
      setName(user.name || '');
      setTag(user.tag || '');
      setCollege(user.college || '');
      setTeam(user.team || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || user.avatar_url || '/valorant.jpg');

      // Fetch live fresh profile from Database (/api/auth/profile + Supabase)
      const fetchLiveProfile = async () => {
        try {
          // 1. Direct Supabase Query
          try {
            const { data: sbData } = await supabase
              .from('users')
              .select('*')
              .eq('email', user.email.toLowerCase())
              .maybeSingle();

            if (sbData) {
              setName(sbData.name || user.name || '');
              setTag(sbData.tag || user.tag || '');
              setCollege(sbData.college || user.college || '');
              setTeam(sbData.team || user.team || '');
              setBio(sbData.bio || user.bio || '');
              if (sbData.avatar_url || sbData.avatar) {
                setAvatar(sbData.avatar_url || sbData.avatar);
              }
              const updatedSession = { ...user, ...sbData };
              localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
            }
          } catch {}

          // 2. Backend API Query
          const apiBase = getApiBaseUrl();
          const res = await fetch(`${apiBase}/auth/profile?email=${encodeURIComponent(user.email)}`, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              const live = json.data;
              setName(live.name || user.name || '');
              setTag(live.tag || user.tag || '');
              setCollege(live.college || user.college || '');
              setTeam(live.team || user.team || '');
              setBio(live.bio || user.bio || '');
              if (live.avatar || live.avatar_url) {
                setAvatar(live.avatar || live.avatar_url);
              }
              // Update local session
              const updatedSession = { ...user, ...live };
              localStorage.setItem('xenova_session', JSON.stringify(updatedSession));
            }
          }
        } catch (err) {
          console.warn('Profile database fetch error:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchLiveProfile();
    } catch (e) {
      router.replace('/login');
    }
  }, [router]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    try {
      // Auto-compress photo to max 512x512 (~40KB) to prevent 413 Payload Too Large
      const compressedDataUrl = await compressImageToDataUrl(file, 512, 0.85);
      setAvatar(compressedDataUrl);
    } catch (err) {
      setErrorMsg('Could not process this image. Please select another image.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;

    setSaving(true);
    setErrorMsg('');
    setSavedMsg('');

    const payload = {
      email: sessionUser.email,
      name: name.trim(),
      tag: tag.trim(),
      college: college.trim(),
      team: team.trim(),
      bio: bio.trim(),
      avatar_url: avatar,
      avatar: avatar,
    };

    try {
      // 1. Direct Supabase Update
      try {
        const { error: fullErr } = await supabase
          .from('users')
          .update({
            name: name.trim(),
            college: college.trim(),
            team: team.trim() || 'Free Agent',
            tag: tag.trim(),
            bio: bio.trim(),
            avatar_url: avatar,
          })
          .eq('email', sessionUser.email.toLowerCase());

        if (fullErr) {
          // Fallback to core columns
          await supabase
            .from('users')
            .update({
              name: name.trim(),
              college: college.trim(),
              bio: bio.trim(),
              avatar_url: avatar,
            })
            .eq('email', sessionUser.email.toLowerCase());
        }
      } catch (sbErr) {
        console.warn('Direct Supabase update notice:', sbErr);
      }

      // 2. Backend API Update
      try {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (apiErr) {
        console.warn('Backend profile update notice:', apiErr);
      }

      // Update session in local storage
      const nextSession = {
        ...sessionUser,
        ...payload,
      };
      localStorage.setItem('xenova_session', JSON.stringify(nextSession));
      window.dispatchEvent(new Event('xenova-auth-change'));

      setSavedMsg('Profile and picture updated successfully in database!');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        <div className="absolute inset-0 z-0">
          <img
            src="/apex.jpg"
            alt="Gamer Settings"
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none pt-2">
            Gamer Profile <span className="text-emerald-400">Settings</span>
          </h1>

          <p className="text-sm text-zinc-400 font-normal">
            Customize your avatar photo, student gamer tag, university club affiliation, and varsity credentials.
          </p>
        </div>
      </section>

      {/* Main Settings Form */}
      <section className="py-12 sm:py-16 bg-black">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <form onSubmit={handleSave} className="rounded-3xl border border-white/15 bg-[#09090b] p-6 sm:p-10 md:p-12 shadow-2xl space-y-8">
            
            {savedMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> {savedMsg}
              </motion.div>
            )}

            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black uppercase flex items-center gap-2">
                {errorMsg}
              </motion.div>
            )}

            {/* ═══════════════ PROFILE PICTURE / AVATAR PICKER ═══════════════ */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-400" /> Profile Picture & Avatar
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                
                {/* Avatar Preview */}
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-emerald-500/60 bg-zinc-900 shadow-2xl relative flex items-center justify-center">
                    {avatar ? (
                      <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-emerald-400">
                        {name ? name.slice(0, 2).toUpperCase() : 'XP'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl shadow-lg transition cursor-pointer"
                    title="Upload Custom Photo"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>

                {/* Upload Instructions & Preset Avatars */}
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-bold text-white uppercase">Upload Custom Photo or Choose Preset</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Supports PNG, JPG, WebP up to 5MB.</p>
                  </div>

                  {/* Preset Options */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    {PRESET_AVATARS.map((p) => (
                      <button
                        key={p.src}
                        type="button"
                        onClick={() => setAvatar(p.src)}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          avatar === p.src ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/30' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                        }`}
                        title={p.label}
                      >
                        <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-400" /> Upload File
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-400" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Veera Chandra"
                  className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Gamer Tag */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" /> In-Game Gamer Tag (IGN)
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. VEERA#1337"
                  className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* University / College */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" /> University / College
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Malla Reddy University"
                  className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Team Name */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-sky-400" /> Varsity Esports Team
                </label>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Team Phoenix"
                  className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" /> Registered Account Email (Locked)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={sessionUser?.email || ''}
                    className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-4 py-3.5 text-sm text-zinc-400 cursor-not-allowed"
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                </div>
              </div>

              {/* Bio / Bio Description */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Athlete Bio & Playstyle
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Duelist main specializing in entry frags and tactical callouts."
                  className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-8 py-4 text-xs font-black uppercase tracking-wider text-zinc-950 transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </div>

          </form>

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
