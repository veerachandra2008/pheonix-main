'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Gamepad2, Lock, Mail, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    if (!email || !password) {
      setErrorMsg('Admin email and security password are required.');
      return;
    }

    setLoading(true);

    try {
      // Authenticate against Backend API / Supabase / Root clearance
      const authResult = await flaskApi.adminLogin(email, password);

      if (!authResult.success || !authResult.user) {
        setErrorMsg(authResult.message || 'Invalid admin credentials.');
        setLoading(false);
        return;
      }

      const adminUser = authResult.user;

      // Store in browser session
      localStorage.setItem('xenova_admin_session', JSON.stringify(adminUser));
      localStorage.setItem('xenova_session', JSON.stringify(adminUser));
      window.dispatchEvent(new Event('xenova-auth-change'));

      setSuccessMsg('Access Authorized. Initializing Command Center...');

      setTimeout(() => {
        router.replace('/admin/dashboard');
      }, 500);
    } catch (err: any) {
      console.error('Admin authentication error:', err);
      setErrorMsg('Authentication error. Please verify database connection and credentials.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070B14] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[460px] relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] mb-4" style={{ borderRadius: 16 }}>
            <Gamepad2 className="h-7 w-7 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.15em] italic">
            XENOVA <span className="text-rose-500">ADMIN</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mt-2">
            System Operations Gate
          </p>
        </div>

        <div className="border border-white/10 bg-[#0C111D] p-8 shadow-2xl rounded-2xl">
          <div className="flex items-center gap-2 mb-6 text-rose-400">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authorized Access Only</span>
          </div>

          <h2 className="text-2xl font-black uppercase italic text-white mb-6">
            Sign In
          </h2>

          {errorMsg && (
            <div className="mb-4 border border-rose-500/30 bg-rose-500/10 p-4 rounded-xl text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 border border-emerald-500/30 bg-emerald-500/10 p-4 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Admin Email</span>
              <span className="mt-2 flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-3 rounded-xl focus-within:border-rose-500/50 transition">
                <Mail className="h-5 w-5 text-rose-500 shrink-0" />
                <input
                  type="email"
                  required
                  disabled={loading}
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-600 text-sm"
                  placeholder="admin@xenova.gg"
                  value={formData.email}
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                />
              </span>
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security Password</span>
              <span className="mt-2 flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-3 rounded-xl focus-within:border-rose-500/50 transition">
                <Lock className="h-5 w-5 text-rose-500 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading}
                  className="w-full bg-transparent text-white outline-none placeholder:text-slate-600 text-sm"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 mt-6 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-rose-600/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating System...
                </>
              ) : (
                'Initiate Control'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] leading-5 text-slate-500 uppercase tracking-wider">
            Seeded for evaluation:<br />
            Email: <code className="text-rose-400">admin@xenova.gg</code> | Pass: <code className="text-rose-400">admin123</code>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
