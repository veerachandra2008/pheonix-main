'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Zap,
  Building2,
  Save
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

export default function SettingsPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [college, setCollege] = useState('');
  const [team, setTeam] = useState('');
  const [bio, setBio] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

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
    } catch (e) {
      router.replace('/login');
    }
  }, [router]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;

    const updated = {
      ...sessionUser,
      name,
      tag,
      college,
      team,
      bio,
    };

    localStorage.setItem('xenova_session', JSON.stringify(updated));
    
    // Also update in xenova_users
    try {
      const rawUsers = localStorage.getItem('xenova_users');
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      const nextUsers = users.map((u: any) => (u.email === sessionUser.email ? { ...u, ...updated } : u));
      localStorage.setItem('xenova_users', JSON.stringify(nextUsers));
    } catch (e) {
      console.error(e);
    }

    setSavedMsg('Settings updated successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        <div className="absolute inset-0 z-0">
          <img
            src="/apex.jpg"
            alt="Gamer Settings"
            className="w-full h-full object-cover filter brightness-[0.3] saturate-150 scale-105"
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
            Manage your student gamer tag, university affiliation, and verified squad preferences.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-black">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <form onSubmit={handleSave} className="rounded-3xl border border-white/15 bg-[#09090b] p-8 md:p-12 shadow-2xl space-y-6">
            
            {savedMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {savedMsg}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Full Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  required
                />
              </label>

              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Gamer Tag / Handle
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                University / College Affiliation
                <input
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Nexus Institute of Technology"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                />
              </label>

              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Active Squad Team
                <input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="Team Titans"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                />
              </label>
            </div>

            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Player Bio / Specialty
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tactical 5v5 IGL specializing in site executes..."
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 transition"
              />
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Profile Settings
            </button>
          </form>

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
