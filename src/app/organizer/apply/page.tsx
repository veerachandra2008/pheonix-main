'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Sparkles, Trophy, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

export default function OrganizerApplyPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    hostName: '',
    college: '',
    preferredGame: 'Valorant',
    email: '',
    experience: '',
    details: '',
  });

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (!rawSession) {
      router.replace('/login');
      return;
    }
    const user = JSON.parse(rawSession);
    setSession(user);
    setFormData((prev) => ({
      ...prev,
      email: user.email || '',
      hostName: user.name ? `${user.name} Gaming Club` : '',
    }));

    // Check if user already has an application in the database
    async function checkExistingApplication() {
      try {
        const res = await flaskApi.getApplications();
        if (res.success && res.data?.organizers) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const existing = res.data.organizers.find(
            (a: any) => (a.email || '').toLowerCase().trim() === userEmail
          );
          if (existing && existing.status === 'pending') {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error('Failed to verify existing application from database:', err);
      }
    }

    checkExistingApplication();
  }, [router]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // If user is already an organizer or admin, show state
  if (session.role === 'organizer' || session.role === 'admin') {
    return (
      <main className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-4">
        <div className="max-w-md border border-white/10 bg-[#0C111D] p-8 text-center rounded-2xl space-y-6">
          <div className="h-12 w-12 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight">Access Granted</h2>
          <p className="text-sm text-slate-400">
            You are already verified as an official **{session.role.toUpperCase()}** on XENOVA.
          </p>
          <div className="flex gap-4 flex-col">
            <Link href="/organizer/dashboard" className="w-full py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 transition text-white rounded-xl text-center">
              Tournament Hub
            </Link>
            <Link href="/dashboard" className="w-full py-3 text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition text-white rounded-xl text-center">
              Player Dashboard
            </Link>
            <Link href={session.role === 'admin' ? '/admin/dashboard' : '/admin/event-management'} className="w-full py-3 text-xs font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-black transition text-rose-400 rounded-xl text-center">
              Admin Panel
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await flaskApi.submitOrganizerApplication(formData);
      if (!res.success) {
        alert(res.message || 'Failed to submit application.');
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[#070B14] text-white py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-white/10 bg-[#0C111D] p-10 text-center rounded-3xl space-y-6 shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tight text-white">Application Received</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              Your credentials have been submitted to the Xenova Administration. 
              We will audit your college affiliation and issue approval notifications within 24 hours.
            </p>
            <div className="pt-4 max-w-sm mx-auto">
              <Link href="/dashboard" className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/20">
                Return to Dashboard
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="border border-white/10 bg-[#0C111D] p-8 sm:p-10 rounded-3xl shadow-2xl space-y-8">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Sparkles className="h-4.5 w-4.5" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em]">Organizer Program</span>
              </div>
              <h1 className="text-4xl font-black italic uppercase tracking-tight">Apply to Host Tournaments</h1>
              <p className="text-slate-400 text-sm mt-2">
                Gain access to bracket generation tools, lobby setup aids, casters alignment channels, and official prize pool sync.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Host / Club Identity</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRM Gaming Club"
                    value={formData.hostName}
                    onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                    className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3.5 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">College / Institution</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRM University, Chennai"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3.5 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                  />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Esports Game Title Focus</span>
                  <select
                    value={formData.preferredGame}
                    onChange={(e) => setFormData({ ...formData, preferredGame: e.target.value })}
                    className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3.5 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                  >
                    {['Valorant', 'BGMI', 'Free Fire', 'CS2', 'FC24'].map((game) => (
                      <option key={game} value={game} className="bg-[#0C111D] text-white">{game}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant Email</span>
                  <input
                    type="email"
                    required
                    readOnly
                    placeholder="your@email.com"
                    value={formData.email}
                    className="mt-2 w-full border border-white/10 bg-white/10 px-4 py-3.5 rounded-xl text-sm text-slate-400 cursor-not-allowed outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Event Experience Level</span>
                <select
                  value={formData.experience}
                  required
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3.5 rounded-xl text-sm outline-none focus:border-indigo-500/50"
                >
                  <option value="" disabled className="bg-[#0C111D] text-slate-500">Select experience level</option>
                  <option value="Beginner (First time hosting)" className="bg-[#0C111D] text-white">Beginner (First time hosting)</option>
                  <option value="Intermediate (Hosted local college LANs)" className="bg-[#0C111D] text-white">Intermediate (Hosted local college LANs)</option>
                  <option value="Advanced (Hosted regional inter-college leagues)" className="bg-[#0C111D] text-white">Advanced (Hosted regional inter-college leagues)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Application Notes / Prior Experience Details</span>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your gaming club background, target tournament scale, and why you want to act as a verified Xenova Organizer."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="mt-2 w-full border border-white/10 bg-white/5 px-4 py-3.5 rounded-xl text-sm outline-none focus:border-indigo-500/50 resize-none"
                />
              </label>

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 transition text-xs font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Submit Application
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
