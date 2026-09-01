'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Inbox,
  Sparkles,
  ShieldAlert,
  Ticket,
  Trophy,
  ArrowUpRight,
  Send,
  Eye,
  X
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

interface ContactMessage {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  category: string;
  subject: string;
  message: string;
  status: 'unread' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Tournament Dispute / Match Issue': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  'Ticket Pass & Scanner Verification': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'College Fest / Hosting Application': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'Prize Pool Payout Query': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Anti-Cheat & Fair Play Report': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'Brand Partnership & Sponsorship': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Other Inquiries': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'in_progress' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | number | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string | number, string>>({});

  const loadMessages = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch directly from backend database
      const res = await flaskApi.getContactMessages();
      if (res.success && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err) {
      console.warn('Failed to load contact messages from backend database:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // Update Status in backend database
  const handleUpdateStatus = async (id: string | number, newStatus: 'unread' | 'in_progress' | 'resolved') => {
    setActionLoading(id);
    try {
      await flaskApi.updateContactMessageStatus(id, newStatus);

      // Update local state
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, status: newStatus } : msg))
      );
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('Failed to update status in backend database:', err);
      alert('Failed to update ticket status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete message from backend database
  const handleDelete = async (id: string | number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the ticket from "${name}"?`)) return;

    setActionLoading(id);
    try {
      await flaskApi.deleteContactMessage(id);

      setMessages((prev) => prev.filter((msg) => msg.id !== id));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error('Failed to delete ticket from backend database:', err);
      alert('Failed to delete message.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter & Search Logic
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (msg.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.college || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (msg.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || msg.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [messages, searchQuery, statusFilter, categoryFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter((m) => m.status === 'unread').length;
    const inProgress = messages.filter((m) => m.status === 'in_progress').length;
    const resolved = messages.filter((m) => m.status === 'resolved').length;
    return { total, unread, inProgress, resolved };
  }, [messages]);

  // Categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [messages]);

  return (
    <div className="space-y-8 p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen">
      
      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-widest mb-2">
            <MessageSquare className="h-3.5 w-3.5" /> Support Operations Desk
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            Contact Forms & Support Tickets
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review incoming inquiries, matchday disputes, college fest applications, and scanner reports from players & organizers.
          </p>
        </div>

        <button
          onClick={() => loadMessages(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Refresh Inbox'}</span>
        </button>
      </div>

      {/* ═══════════════ METRIC STATS CARDS ═══════════════ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Inquiries */}
        <div className="rounded-2xl border border-white/10 bg-[#0C111D] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Inquiries</span>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{stats.total}</p>
          <p className="text-[11px] text-slate-400">Received across all channels</p>
        </div>

        {/* Unread / New Tickets */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">Action Required</span>
            <span className="relative flex h-2.5 w-2.5">
              {stats.unread > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-300 font-mono">{stats.unread}</p>
          <p className="text-[11px] text-rose-400 font-medium">Unread & pending tickets</p>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Under Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{stats.inProgress}</p>
          <p className="text-[11px] text-amber-400 font-medium">Being resolved by marshals</p>
        </div>

        {/* Resolved */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">{stats.resolved}</p>
          <p className="text-[11px] text-emerald-400 font-medium">Closed support tickets</p>
        </div>
      </div>

      {/* ═══════════════ SEARCH & FILTER BAR ═══════════════ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border border-white/10 bg-[#0C111D] p-4 sm:p-5 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sender name, email, phone, college, subject, or keywords..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-rose-400 transition"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold uppercase">
            {(['all', 'unread', 'in_progress', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition text-[11px] ${
                  statusFilter === st
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'in_progress' ? 'In Progress' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ MESSAGES LIST ═══════════════ */}
      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mx-auto" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Support Tickets...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="py-20 text-center space-y-4 border border-dashed border-white/10 rounded-3xl bg-[#0C111D]/50">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase tracking-tight text-white">No Tickets Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'No contact submissions match the current search filters.'
                : 'No support inquiries have been submitted yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => {
            const categoryStyle = CATEGORY_COLORS[msg.category] || {
              bg: 'bg-zinc-500/10',
              text: 'text-zinc-400',
              border: 'border-zinc-500/30',
            };

            const formattedDate = new Date(msg.created_at || Date.now()).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const cleanPhone = (msg.phone || '').replace(/[^0-9+]/g, '');
            const whatsappUrl = cleanPhone
              ? `https://wa.me/${cleanPhone.replace('+', '')}`
              : null;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border transition p-6 space-y-4 bg-[#0C111D] ${
                  msg.status === 'unread'
                    ? 'border-rose-500/40 shadow-lg shadow-rose-500/5'
                    : msg.status === 'in_progress'
                    ? 'border-amber-500/30'
                    : 'border-white/10'
                }`}
              >
                {/* Top Row: Sender Info & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-black text-white">{msg.name}</h3>
                      
                      {/* Category Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
                        {msg.category}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        msg.status === 'unread'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : msg.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {msg.status === 'unread' ? '● Unread' : msg.status === 'in_progress' ? '⏳ In Progress' : '✓ Resolved'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                      <a href={`mailto:${msg.email}`} className="hover:text-cyan-400 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" /> {msg.email}
                      </a>
                      {msg.phone && (
                        <a href={`tel:${msg.phone}`} className="hover:text-emerald-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" /> {msg.phone}
                        </a>
                      )}
                      {msg.college && (
                        <span className="flex items-center gap-1 text-slate-300 font-sans font-bold">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" /> {msg.college}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Subject & Message Preview */}
                <div className="rounded-xl border border-white/5 bg-black/40 p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Subject: {msg.subject}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                    {msg.message}
                  </p>
                </div>

                {/* In-App Admin Reply Section */}
                {(msg as any).admin_reply ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          Official Admin Response
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          • {(msg as any).admin_reply_by || 'Xenova Ops Desk'}
                          {(msg as any).admin_reply_at && ` (${new Date((msg as any).admin_reply_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})`}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setReplyOpenId(replyOpenId === msg.id ? null : msg.id);
                          setReplyInputs((prev) => ({ ...prev, [msg.id]: (msg as any).admin_reply || '' }));
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition"
                      >
                        {replyOpenId === msg.id ? 'Close' : 'Edit Reply'}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed font-mono whitespace-pre-line bg-black/40 p-3 rounded-lg border border-emerald-500/20">
                      {(msg as any).admin_reply}
                    </p>
                  </div>
                ) : null}

                {/* Interactive Reply Composer Drawer */}
                {(!((msg as any).admin_reply) || replyOpenId === msg.id) && (
                  <div className="rounded-xl border border-rose-500/20 bg-black/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                        {((msg as any).admin_reply) ? 'Update Official Reply' : 'Send In-App Admin Reply'}
                      </label>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                        Saves to Database & Visible to User
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Dispute investigated and match bracket updated.',
                        'Scanner pass verified. You are cleared for venue entry.',
                        'College fest application received. Our partnership marshal will connect.',
                        'Prize pool payout credited to registered UPI/account.',
                        'Report received. Tournament anti-cheat logs reviewed.',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReplyInputs((prev) => ({ ...prev, [msg.id]: preset }))}
                          className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition text-left"
                        >
                          + {preset.substring(0, 38)}...
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={replyInputs[msg.id] || ''}
                      onChange={(e) => setReplyInputs((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                      placeholder="Type official admin resolution or instructions for the player/organizer..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition resize-none font-mono"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === msg.id || !replyInputs[msg.id]?.trim()}
                        onClick={async () => {
                          const replyText = replyInputs[msg.id];
                          if (!replyText?.trim()) return;
                          setActionLoading(msg.id);
                          try {
                            await flaskApi.sendAdminReply(msg.id, replyText, 'resolved');
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id
                                  ? {
                                      ...m,
                                      status: 'resolved',
                                      admin_reply: replyText,
                                      admin_reply_at: new Date().toISOString(),
                                      admin_reply_by: 'Xenova Operations Desk',
                                    } as any
                                  : m
                              )
                            );
                            setReplyOpenId(null);
                          } catch (e) {
                            alert('Failed to save admin reply.');
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {actionLoading === msg.id ? 'Saving...' : 'Save & Mark Resolved'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status:</span>
                    <select
                      value={msg.status}
                      disabled={actionLoading === msg.id}
                      onChange={(e) => handleUpdateStatus(msg.id, e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-rose-400 transition"
                    >
                      <option value="unread">Unread / Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved / Closed</option>
                    </select>
                  </div>

                  {/* Direct Contact & Delete Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {whatsappUrl && (
                      <a
                        href={`${whatsappUrl}?text=${encodeURIComponent(
                          `Hello ${msg.name}, regarding your Xenova ticket "${msg.subject}": ${replyInputs[msg.id] || (msg as any).admin_reply || 'Our operations desk has reviewed your dispute.'}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> WhatsApp Direct
                      </a>
                    )}

                    <a
                      href={`mailto:${msg.email}?subject=Re: [Xenova Support Ticket] ${encodeURIComponent(
                        msg.subject
                      )}&body=${encodeURIComponent(
                        `Hi ${msg.name},\n\nRegarding your ticket regarding "${msg.subject}":\n\n${replyInputs[msg.id] || (msg as any).admin_reply || 'Our operations desk has resolved your query.'}\n\nBest regards,\nXenova Tournament Operations Desk`
                      )}`}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email Reply
                    </a>

                    <button
                      onClick={() => handleDelete(msg.id, msg.name)}
                      disabled={actionLoading === msg.id}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
