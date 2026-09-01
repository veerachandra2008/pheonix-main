'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Inbox,
  Phone,
  Mail,
  Building2,
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import FinalCTA from '@/components/xenova/FinalCTA';

interface Ticket {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  category: string;
  subject: string;
  message: string;
  status: 'unread' | 'in_progress' | 'resolved';
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  admin_reply_by?: string | null;
  created_at: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Tournament Dispute / Match Issue': { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40' },
  'Ticket Pass & Scanner Verification': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40' },
  'College Fest / Hosting Application': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  'Prize Pool Payout Query': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  'Anti-Cheat & Fair Play Report': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40' },
  'Brand Partnership & Sponsorship': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  'Other Inquiries': { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/40' },
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  const loadUserTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      let email = '';
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        try {
          const parsed = JSON.parse(rawSession);
          email = (parsed.email || '').trim().toLowerCase();
        } catch {}
      }

      // Also check last submitted contact email in localStorage
      const lastContactEmail = (localStorage.getItem('xenova_last_contact_email') || '').trim().toLowerCase();
      const targetEmail = email || lastContactEmail;
      setUserEmail(targetEmail);

      if (targetEmail) {
        const res = await flaskApi.getUserContactMessages(targetEmail);
        if (res.success && Array.isArray(res.data)) {
          setTickets(res.data);
          return;
        }
      }

      // Fallback: check stored local ticket IDs if no email
      const localStored = localStorage.getItem('xenova_user_contact_tickets');
      if (localStored) {
        try {
          const storedIds = JSON.parse(localStored);
          if (Array.isArray(storedIds) && storedIds.length > 0) {
            const allRes = await flaskApi.getContactMessages();
            if (allRes.success && Array.isArray(allRes.data)) {
              const matched = allRes.data.filter((t: any) => storedIds.includes(t.id) || storedIds.includes(String(t.id)));
              setTickets(matched);
              return;
            }
          }
        } catch {}
      }

      setTickets([]);
    } catch (err) {
      console.warn('Failed to load user tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserTickets();

    const handleTicketSubmitted = () => {
      loadUserTickets(true);
    };

    window.addEventListener('xenova-contact-ticket-submitted', handleTicketSubmitted);
    return () => window.removeEventListener('xenova-contact-ticket-submitted', handleTicketSubmitted);
  }, []);

  const repliedCount = tickets.filter((t) => Boolean(t.admin_reply)).length;
  const pendingCount = tickets.filter((t) => !t.admin_reply).length;

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950 pt-24 pb-16">
      
      {/* ═══════════════ 1. HEADER HERO ═══════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest mb-3">
              <MessageSquare className="h-3.5 w-3.5" /> Support Desk & Admin Replies
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              My Support <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Tickets</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl leading-relaxed">
              Track real-time status and official responses from Xenova Tournament Operations marshals regarding your match disputes, scanner passes, and inquiries.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => loadUserTickets(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{refreshing ? 'Checking...' : 'Refresh Status'}</span>
            </button>

            <Link
              href="/contact"
              className="blob-btn inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
            >
              <span>New Ticket</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* ═══════════════ 2. METRIC SUMMARY PILLS ═══════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Submitted Tickets</span>
            <p className="text-2xl sm:text-3xl font-black text-white font-mono">{tickets.length}</p>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Admin Replies</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">{repliedCount}</p>
          </div>

          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-xl space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">In Queue</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{pendingCount}</p>
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. TICKETS LIST ═══════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Loading Support Tickets & Replies...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-20 text-center space-y-6 border border-dashed border-white/15 rounded-3xl bg-zinc-950/50 p-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">No Tickets Found</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You have not submitted any match disputes or support requests yet. Once you submit a form from the contact desk, marshal responses will show up here.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
            >
              <span>Contact Support Desk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket, idx) => {
              const categoryStyle = CATEGORY_STYLES[ticket.category] || {
                bg: 'bg-zinc-500/15',
                text: 'text-zinc-400',
                border: 'border-zinc-500/40',
              };

              const formattedDate = new Date(ticket.created_at || Date.now()).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isResolved = ticket.status === 'resolved' || Boolean(ticket.admin_reply);

              return (
                <motion.div
                  key={ticket.id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border transition p-6 sm:p-8 space-y-6 bg-zinc-950/90 backdrop-blur-2xl shadow-2xl ${
                    ticket.admin_reply
                      ? 'border-emerald-500/40 shadow-emerald-500/5'
                      : 'border-white/15'
                  }`}
                >
                  {/* Top Row: Category & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Category Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
                        {ticket.category}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isResolved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolved / Replied</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>Under Review</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Submitted: {formattedDate}</span>
                    </div>
                  </div>

                  {/* Subject & Original Inquiry */}
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      {ticket.subject}
                    </h3>
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Your Submitted Query</span>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line pt-1">
                        {ticket.message}
                      </p>
                    </div>
                  </div>

                  {/* ═══════════════ OFFICIAL ADMIN REPLY BOX ═══════════════ */}
                  {ticket.admin_reply ? (
                    <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-black to-zinc-950 p-6 space-y-3 shadow-xl shadow-emerald-500/10">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">
                            Official Response from {ticket.admin_reply_by || 'Xenova Tournament Operations Desk'}
                          </h4>
                        </div>

                        {ticket.admin_reply_at && (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {new Date(ticket.admin_reply_at).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-black/70 border border-emerald-500/30">
                        <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed font-mono whitespace-pre-line">
                          {ticket.admin_reply}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                        <span className="text-[11px] text-emerald-400/80 font-bold">
                          ✓ This ticket has been officially resolved.
                        </span>
                        <a
                          href="https://wa.me/917993728522"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          Need further assistance? WhatsApp Desk &rarr;
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                          <Clock className="w-4 h-4 animate-spin" />
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                            Awaiting Tournament Marshal Review
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Your inquiry is in the priority queue. Our marshals respond within 15 minutes.
                          </p>
                        </div>
                      </div>

                      <a
                        href="https://wa.me/917993728522"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider transition inline-flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> Urgent Matchday Hotline
                      </a>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-20">
        <FinalCTA />
      </div>
    </main>
  );
}
