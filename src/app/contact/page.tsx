'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Zap,
  ShieldCheck,
  Trophy,
  ArrowRight,
  Headphones,
  Lock,
  UserCheck,
  Loader2
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';
import { supabase } from '@/lib/supabase';

export default function ContactPage() {
  const router = useRouter();

  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    category: 'Tournament Dispute / Match Issue',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ═══════════════ REAL SUPABASE AUTH GUARD ═══════════════
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session || !session.user) {
          if (isMounted) {
            setAuthState('unauthenticated');
            router.replace('/login?redirect=/contact');
          }
          return;
        }

        if (isMounted) {
          const authUser = session.user;
          setUser(authUser);
          setAuthState('authenticated');

          // Prepopulate verified identity into form
          const metaName = authUser.user_metadata?.name || '';
          const metaCollege = authUser.user_metadata?.college || '';

          setFormData((prev) => ({
            ...prev,
            name: prev.name || metaName || authUser.email?.split('@')[0] || 'Player',
            email: authUser.email || '',
            college: prev.college || metaCollege || '',
          }));
        }
      } catch (err) {
        console.error('Session verification error:', err);
        if (isMounted) {
          setAuthState('unauthenticated');
          router.replace('/login?redirect=/contact');
        }
      }
    }

    checkAuthSession();

    // Listen for authentication changes (e.g. user signs out in another tab)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (isMounted) {
          setAuthState('unauthenticated');
          router.replace('/login?redirect=/contact');
        }
      } else if (session?.user && isMounted) {
        setUser(session.user);
        setAuthState('authenticated');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      setErrorMessage('Please fill in both the Subject and Message fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Obtain fresh real Supabase Auth session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session || !session.access_token) {
        setErrorMessage('Authentication session expired. Redirecting to login...');
        setAuthState('unauthenticated');
        setTimeout(() => router.replace('/login?redirect=/contact'), 1500);
        return;
      }

      // 2. Transmit ticket payload strictly with Bearer Authorization token
      const payload = {
        name: formData.name.trim() || user?.user_metadata?.name || 'Player',
        email: user?.email || session.user?.email || formData.email.trim(),
        phone: formData.phone.trim(),
        college: formData.college.trim(),
        category: formData.category,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      };

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 201 && data.success) {
        // Save local tracking so Navbar and My Tickets page instantly show the ticket
        try {
          localStorage.setItem('xenova_last_contact_email', payload.email);
          const prevTickets = JSON.parse(localStorage.getItem('xenova_user_contact_tickets') || '[]');
          if (data?.data?.id && !prevTickets.includes(data.data.id)) {
            prevTickets.push(data.data.id);
            localStorage.setItem('xenova_user_contact_tickets', JSON.stringify(prevTickets));
          }
        } catch {}

        // Broadcast event so Navbar displays the "Admin Replies" button immediately
        window.dispatchEvent(new Event('xenova-contact-ticket-submitted'));

        setSubmitted(true);
        setFormData((prev) => ({
          ...prev,
          subject: '',
          message: '',
        }));
      } else if (res.status === 401) {
        setErrorMessage('Authentication required. Redirecting to portal login...');
        setAuthState('unauthenticated');
        setTimeout(() => router.replace('/login?redirect=/contact'), 1500);
      } else {
        setErrorMessage(data.message || 'Failed to submit message to database.');
      }
    } catch (err: any) {
      console.error('Failed to submit contact message:', err);
      setErrorMessage('Failed to send message. Please check your connection or reach out on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. HERO BANNER ═══════════════ */}
      <section 
        className="relative overflow-hidden bg-black py-20 sm:py-28 border-b border-emerald-500/20"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)',
        }}
      >
        <div className="absolute inset-0 z-0">
          <img
            src="/valorant.jpg"
            alt="Xenova Contact Desk"
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_70%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest"
          >
            <Headphones className="h-4 w-4" /> Official Support & Tournament Ops Desk
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl"
          >
            Contact <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">XENOVA</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Have a question about tournament rules, university partnerships, ticket passes, or need matchday emergency support? Connect with our dedicated operations team.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════ 2. MAIN CONTACT SECTION ═══════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Primary Phone Hotline Card */}
            <div className="p-7 rounded-3xl border border-emerald-500/40 bg-zinc-950/90 backdrop-blur-2xl shadow-2xl space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">Helpline / Matchday Hotline</h3>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Dispatch
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="tel:+917993728522"
                  className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 hover:text-emerald-300 tracking-tight transition block"
                >
                  +91 79937 28522
                </a>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Call or WhatsApp for immediate tournament referee escalation, lobby disputes, and gate scanner assistance.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> 24/7 Matchday Support
                </span>
                <a
                  href="https://wa.me/917993728522"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Chat on WhatsApp &rarr;
                </a>
              </div>
            </div>

            {/* Email Support Card */}
            <div className="p-7 rounded-3xl border border-white/15 bg-zinc-950/90 backdrop-blur-2xl shadow-2xl space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">Official Inquiries & Desk</h3>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mt-0.5 block">
                    Direct Administrative Mail
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="mailto:xenovaesports1@gmail.com"
                  className="text-lg sm:text-xl font-bold font-mono text-white hover:text-cyan-400 tracking-tight transition block truncate"
                >
                  xenovaesports1@gmail.com
                </a>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  For university festival partnerships, brand sponsorships, campus ambassador applications, and payment queries.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                <span>Response Time</span>
                <span className="text-cyan-400 font-bold">&lt; 15 Minutes</span>
              </div>
            </div>

            {/* Headquarters & Operations Card */}
            <div className="p-6 rounded-3xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <MapPin className="w-4 h-4 text-emerald-400" /> Pan-India Collegiate Network
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Operating across 200+ universities in Hyderabad, Bengaluru, Delhi NCR, Mumbai, Pune, Chennai, and Kolkata.
              </p>
            </div>

          </div>

          {/* Right Column: Interactive Contact / Escalation Form */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-3xl border border-white/15 bg-zinc-950/90 backdrop-blur-2xl shadow-2xl">
              
              <div className="mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Send a Message</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Fill in the details below. Our tournament marshals will respond immediately.
                </p>
              </div>

              {/* AUTH STATE 1: LOADING SKELETON (Hydration-Safe Initial State) */}
              {authState === 'loading' && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">Verifying Arena Credentials</h3>
                    <p className="text-xs text-zinc-400 font-medium">Checking active Supabase Auth session...</p>
                  </div>
                </div>
              )}

              {/* AUTH STATE 2: UNAUTHENTICATED REDIRECT NOTICE */}
              {authState === 'unauthenticated' && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">Authentication Required</h3>
                    <p className="text-xs text-zinc-400 font-medium">Redirecting you to portal login...</p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/login?redirect=/contact"
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition inline-flex items-center gap-2"
                    >
                      <span>Sign In Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* AUTH STATE 3: AUTHENTICATED FORM */}
              {authState === 'authenticated' && (
                <>
                  {submitted ? (
                    <div className="py-12 px-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-extrabold uppercase text-white">Message Dispatched!</h3>
                      <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                        Thank you! Your ticket request has been received by our tournament operations desk. We will reach out to your provided email or phone number shortly.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <Link
                          href="/my-tickets"
                          className="px-6 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25 inline-flex items-center gap-2"
                        >
                          <span>Track Status & Admin Replies</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => setSubmitted(false)}
                          className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold uppercase tracking-wider hover:bg-white/15 transition cursor-pointer"
                        >
                          Send Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {errorMessage && (
                        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2.5">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      {/* Verified Account Banner */}
                      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-2 font-bold">
                          <UserCheck className="w-4 h-4" /> Authenticated Supabase User
                        </span>
                        <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[200px]">
                          {user?.email}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                            Your Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Veera Chandra"
                            className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5 flex items-center justify-between">
                            <span>Email Address *</span>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                              <Lock className="w-3 h-3" /> Verified
                            </span>
                          </label>
                          <input
                            type="email"
                            required
                            readOnly
                            value={formData.email}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-900/80 border border-emerald-500/30 text-zinc-300 text-xs font-mono cursor-not-allowed focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                            Phone / WhatsApp No.
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="e.g. +91 79937 28522"
                            className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                            College / University Name
                          </label>
                          <input
                            type="text"
                            value={formData.college}
                            onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                            placeholder="e.g. IIT Bombay / BITS Pilani"
                            className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                          Issue Category *
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/15 text-white text-xs focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                        >
                          <option value="Tournament Dispute / Match Issue">Tournament Dispute / Match Issue</option>
                          <option value="Ticket Pass & Scanner Verification">Ticket Pass & Scanner Verification</option>
                          <option value="College Fest / Hosting Application">College Fest / Hosting Application</option>
                          <option value="Prize Pool Payout Query">Prize Pool Payout Query</option>
                          <option value="Anti-Cheat & Fair Play Report">Anti-Cheat & Fair Play Report</option>
                          <option value="Brand Partnership & Sponsorship">Brand Partnership & Sponsorship</option>
                          <option value="Other Inquiries">Other Inquiries</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                          Subject *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="Brief summary of your query or match ID"
                          className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                          Message / Dispute Description *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Please include tournament name, match bracket link, and specific details..."
                          className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full blob-btn bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-4 text-xs sm:text-sm uppercase tracking-wider rounded-xl transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <span>Dispatching Message...</span>
                        ) : (
                          <>
                            <span>Submit Support Ticket</span>
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}

            </div>
          </div>

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
