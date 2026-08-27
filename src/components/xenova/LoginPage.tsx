'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
  Zap,
  School,
  CheckCircle2,
  Gamepad2,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: '',
    role: 'competitor',
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const cleanEmail = formData.email.toLowerCase().trim();

      if (activeTab === 'register') {
        // -------------------------------------------------------------
        // 1. SUPABASE AUTH SIGN UP
        // -------------------------------------------------------------
        let userId = 'usr_' + Math.random().toString(36).substring(2, 9);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: formData.password,
        });

        if (authData?.user?.id) {
          userId = authData.user.id;
        } else if (authError && !authError.message.includes('already registered')) {
          console.warn('Supabase Auth SignUp Notice:', authError.message);
        }

        // -------------------------------------------------------------
        // 2. INSERT PROFILE INTO PUBLIC USERS TABLE & BACKEND
        // -------------------------------------------------------------
        const profilePayload = {
          id: userId,
          email: cleanEmail,
          name: formData.name.trim(),
          college: formData.college.trim() || 'General Campus',
          role: 'PLAYER',
        };

        try {
          await supabase.from('users').upsert([profilePayload]);
        } catch (dbErr) {
          console.warn('Supabase DB Insert Notice:', dbErr);
        }

        try {
          const apiBase = getApiBaseUrl();
          await fetch(`${apiBase}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name.trim(),
              email: cleanEmail,
              password: formData.password,
              college: formData.college.trim() || 'General Campus',
            }),
          });
        } catch {}

        // Store in local storage xenova_users for offline fallback
        try {
          const rawUsers = localStorage.getItem('xenova_users');
          let users = rawUsers ? JSON.parse(rawUsers) : [];
          if (!Array.isArray(users)) users = [];
          if (!users.some((u: any) => u.email === cleanEmail)) {
            users.push({
              id: userId,
              email: cleanEmail,
              name: formData.name.trim(),
              password: formData.password,
              college: formData.college.trim() || 'General Campus',
              role: 'player',
            });
            localStorage.setItem('xenova_users', JSON.stringify(users));
          }
        } catch {}

        // Auto login session setup
        const userSession = {
          id: userId,
          name: formData.name.trim(),
          email: cleanEmail,
          college: formData.college.trim() || 'General Campus',
          role: 'player',
          avatar: '/valorant.jpg',
          tag: `${formData.name.trim().toUpperCase().replace(/\s+/g, '')}#1337`,
        };
        localStorage.setItem('xenova_session', JSON.stringify(userSession));
        window.dispatchEvent(new Event('xenova-auth-change'));

        setStatusMsg({
          type: 'success',
          text: '✅ Registration successful! Account created. Redirecting...',
        });

        setTimeout(() => router.push('/dashboard'), 1000);

      } else {
        // -------------------------------------------------------------
        // 3. STRICT SIGNIN: VERIFY BOTH EMAIL AND PASSWORD
        // -------------------------------------------------------------
        let authenticatedUser: any = null;
        let userId = '';
        let authErrorMessage = '';

        // 3a. Attempt Supabase Auth signInWithPassword
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: formData.password,
          });

          if (!authError && authData?.user) {
            userId = authData.user.id;
            authenticatedUser = authData.user;
          } else if (authError) {
            authErrorMessage = authError.message;
          }
        } catch (sbAuthErr: any) {
          console.warn('Supabase Auth verification notice:', sbAuthErr);
        }

        // 3b. Secondary verification: Backend API /auth/login with credentials
        let userProfile: any = null;
        if (!authenticatedUser) {
          try {
            const apiBase = getApiBaseUrl();
            const apiRes = await fetch(`${apiBase}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password: formData.password }),
            });
            const apiJson = await apiRes.json();
            if (apiRes.ok && apiJson.success && apiJson.user) {
              userProfile = apiJson.user;
              authenticatedUser = { email: cleanEmail, id: apiJson.user.id };
              userId = String(apiJson.user.id);
            } else if (apiJson.message) {
              authErrorMessage = apiJson.message;
            }
          } catch (apiErr) {
            console.warn('Backend login verification notice:', apiErr);
          }
        }

        // 3c. Fallback verification for offline local storage accounts
        if (!authenticatedUser) {
          try {
            const rawUsers = localStorage.getItem('xenova_users');
            const localUsers = rawUsers ? JSON.parse(rawUsers) : [];
            const foundLocal = Array.isArray(localUsers) && localUsers.find(
              (u: any) => u.email?.toLowerCase() === cleanEmail && u.password === formData.password
            );
            if (foundLocal) {
              authenticatedUser = foundLocal;
              userId = foundLocal.id || 'usr_' + Date.now();
              userProfile = foundLocal;
            }
          } catch {}
        }

        // 3d. If password authentication failed across all sources, REJECT LOGIN!
        if (!authenticatedUser) {
          const errorText = authErrorMessage || 'Invalid email or password. Please check your credentials.';
          setStatusMsg({
            type: 'error',
            text: `❌ ${errorText}`,
          });
          setLoading(false);
          return;
        }

        // Fetch user profile from public.users table if not already populated
        if (userId && !userProfile) {
          const { data: dbData } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          userProfile = dbData;
        }

        if (!userProfile) {
          const { data: dbData } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          userProfile = dbData;
        }

        const resolvedUserId = userId || userProfile?.id || 'usr_' + Date.now();
        const resolvedName = userProfile?.name || formData.name || cleanEmail.split('@')[0];

        const userSession = {
          id: resolvedUserId,
          name: resolvedName,
          email: cleanEmail,
          college: userProfile?.college || 'General Campus',
          role: (userProfile?.role || 'PLAYER').toLowerCase(),
          avatar: userProfile?.avatar_url || '/valorant.jpg',
          tag: `${resolvedName.toUpperCase().replace(/\s+/g, '')}#1337`,
        };

        localStorage.setItem('xenova_session', JSON.stringify(userSession));
        window.dispatchEvent(new Event('xenova-auth-change'));

        setStatusMsg({
          type: 'success',
          text: '✅ Signed in successfully! Redirecting to arena dashboard...',
        });

        setTimeout(() => router.push('/dashboard'), 800);
      }
    } catch (err: any) {
      console.error('Unhandled Auth Error:', err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'An unexpected authentication error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'competitor' | 'organizer') => {
    setFormData({
      name: role === 'competitor' ? 'Aarav Sharma' : 'College Esports Convener',
      email: role === 'competitor' ? 'aarav.esports@iitb.ac.in' : 'organizer@bits-pilani.ac.in',
      password: 'demo-password-123',
      college: role === 'competitor' ? 'IIT Bombay' : 'BITS Pilani',
      role,
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black text-white font-sans overflow-hidden py-24 px-4 select-none">
      
      {/* 1. Spine.com Ambient Grid & Spotlight Beams */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293712_1px,transparent_1px),linear-gradient(to_bottom,#1f293712_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* 2. 21st.dev Glassmorphic Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800/80 bg-[#0B0E17]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6"
      >
        
        {/* Top Brand Header Badge */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-400 backdrop-blur-md hover:bg-emerald-500/20 transition"
          >
            <Zap className="h-4 w-4 fill-emerald-400 text-emerald-400" />
            <span>XENOVA PORTAL</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
            {activeTab === 'signin' ? 'Welcome Back' : 'Join Collegiate Arena'}
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            {activeTab === 'signin' ? 'Sign in to access your squad brackets & telemetry.' : 'Register your campus gamer identity in 30 seconds.'}
          </p>
        </div>

        {/* 3. ReactBits Sliding Active Tab Selector */}
        <div className="relative flex rounded-2xl bg-zinc-900/90 p-1 border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            className={`relative flex-1 py-2 text-xs font-bold uppercase tracking-wider transition duration-200 z-10 ${
              activeTab === 'signin' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeTab === 'signin' && (
              <motion.div
                layoutId="auth-tab-pill"
                className="absolute inset-0 bg-emerald-500/20 border border-emerald-500/40 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Sign In
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`relative flex-1 py-2 text-xs font-bold uppercase tracking-wider transition duration-200 z-10 ${
              activeTab === 'register' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeTab === 'register' && (
              <motion.div
                layoutId="auth-tab-pill"
                className="absolute inset-0 bg-emerald-500/20 border border-emerald-500/40 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Register
            </span>
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold border transition flex items-center gap-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* 4. Modern Form Inputs */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {activeTab === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Full Name / Gamer Handle</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aarav (ViperMain)"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">University / College</label>
                <div className="relative">
                  <School className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    placeholder="e.g. IIT Bombay / BITS Pilani"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@college.edu"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-emerald-500 py-3 text-xs font-extrabold uppercase tracking-wider text-zinc-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : (
              <>
                <span>{activeTab === 'signin' ? 'Sign In to Arena' : 'Complete Registration'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* 5. Uiverse / 21st.dev 1-Click Quick Demo Access */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Instant Demo Access</span>
            <span className="text-emerald-400">No Typing Needed</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('competitor')}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-[11px] font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
            >
              <Gamepad2 className="h-3.5 w-3.5 text-emerald-400" /> Gamer Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo('organizer')}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-[11px] font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Host Demo
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
