'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Trophy,
  Zap,
  CheckCheck,
  Sparkles,
  Swords,
  Users,
  Building2,
  Clock,
  Check,
  X,
  Trash2,
  ExternalLink,
  Flame,
  Radio,
  Share2,
  Copy,
  Ticket,
  UserPlus,
  Mail
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';
import { supabase } from '@/lib/supabase';

export type NotificationType = 'tournament' | 'team' | 'campus' | 'system';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: NotificationType;
  actionUrl?: string;
  actionLabel?: string;
  badge?: string;
  inviteId?: string;
  inviteStatus?: 'pending' | 'accepted' | 'declined';
  roomCode?: string;
  createdAt?: string;
};

function formatRelativeTime(dateInput?: string | number): string {
  if (!dateInput) return 'Recently';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'tournament' | 'team' | 'campus' | 'system'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentEmail = '';
    let currentName = 'Athlete';
    let currentCollege = '';
    let accountCreated = '';

    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession);
        setSession(parsed);
        currentEmail = (parsed.email || '').trim().toLowerCase();
        currentName = parsed.name || 'Athlete';
        currentCollege = parsed.college || '';
        accountCreated = parsed.created_at || '';
      } catch (e) {
        console.error(e);
      }
    }

    async function loadRealDatabaseNotifications() {
      setLoading(true);
      const realNotifs: NotificationItem[] = [];
      const seenIds = new Set<string>();

      const addUnique = (item: NotificationItem) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          realNotifs.push(item);
        }
      };

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      try {
        // ═══════════════ 0. AUTO-DELETE NOTIFICATIONS OLDER THAN 7 DAYS ═══════════════
        try {
          await supabase
            .from('notifications')
            .delete()
            .lt('created_at', sevenDaysAgo);
        } catch (delErr) {
          console.warn('7-day auto-purge note:', delErr);
        }

        // ═══════════════ 1. SUPABASE REAL NOTIFICATIONS TABLE (LAST 7 DAYS) ═══════════════
        const { data: dbNotifs, error: notifErr } = await supabase
          .from('notifications')
          .select('*')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!notifErr && Array.isArray(dbNotifs)) {
          for (const n of dbNotifs) {
            const notifUserEmail = (n.user_email || n.email || '').trim().toLowerCase();
            // Show only if public broadcast (NULL) or targeted to current user
            if (!notifUserEmail || notifUserEmail === currentEmail) {
              const id = String(n.id);
              addUnique({
                id,
                title: n.title || 'Platform Dispatch',
                message: n.message || '',
                time: formatRelativeTime(n.created_at || n.time),
                read: Boolean(n.read),
                type: (n.type as NotificationType) || 'system',
                badge: n.badge || 'OFFICIAL',
                actionUrl: n.action_url || n.actionUrl,
                actionLabel: n.action_label || n.actionLabel || 'View',
                createdAt: n.created_at,
              });
            }
          }
        }

        // ═══════════════ 2. REAL TOURNAMENT REGISTRATIONS (LAST 7 DAYS) ═══════════════
        if (currentEmail) {
          const { data: userRegs, error: regErr } = await supabase
            .from('registrations')
            .select('*')
            .eq('email', currentEmail)
            .gte('registered_at', sevenDaysAgo)
            .order('registered_at', { ascending: false });

          if (!regErr && Array.isArray(userRegs)) {
            for (const r of userRegs) {
              const regId = `reg-entry-${r.id || r.tournament_slug || r.pass_id}`;
              addUnique({
                id: regId,
                title: `Tournament Registration: ${r.tournament_title || r.tournament_slug}`,
                message: `Squad "${r.team_name}" is locked in for ${r.tournament_title || r.tournament_slug}. Entry Pass: ${r.pass_id}. College: ${r.college || currentCollege || 'University'}.`,
                time: formatRelativeTime(r.registered_at || r.created_at),
                read: false,
                type: 'tournament',
                badge: 'REGISTERED',
                actionUrl: `/tournaments/${r.tournament_slug || ''}`,
                actionLabel: 'View Tournament',
                roomCode: r.pass_id,
                createdAt: r.registered_at || r.created_at,
              });
            }
          }
        }

        // ═══════════════ 3. REAL ATHLETE FOLLOWERS (LAST 7 DAYS) ═══════════════
        if (currentEmail) {
          const { data: followRows, error: followErr } = await supabase
            .from('user_follows')
            .select('follower_email, created_at')
            .eq('target_email', currentEmail)
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false });

          if (!followErr && Array.isArray(followRows)) {
            for (const f of followRows) {
              const followId = `follow-${f.follower_email}-${f.created_at}`;
              addUnique({
                id: followId,
                title: 'New Athlete Follower',
                message: `${f.follower_email} started following your collegiate gamer profile and match stats.`,
                time: formatRelativeTime(f.created_at),
                read: false,
                type: 'team',
                badge: 'FOLLOWER',
                actionUrl: '/players',
                actionLabel: 'View Athletes',
                createdAt: f.created_at,
              });
            }
          }
        }

        // ═══════════════ 4. REAL ACCOUNT VERIFICATION ═══════════════
        if (currentEmail) {
          const accountId = `account-init-${currentEmail}`;
          addUnique({
            id: accountId,
            title: `Welcome to Xenova Esports, ${currentName}`,
            message: `Account (${currentEmail}) verified for ${currentCollege || 'University'}. You are cleared for all varsity esports open cups and leaderboard rankings.`,
            time: formatRelativeTime(accountCreated || '2026-01-01'),
            read: true,
            type: 'system',
            badge: 'VERIFIED',
            actionUrl: '/dashboard',
            actionLabel: 'Profile',
            createdAt: accountCreated,
          });
        }
      } catch (err) {
        console.warn('Real notifications fetch notice:', err);
      }

      setNotifications(realNotifs);
      setLoading(false);
    }

    loadRealDatabaseNotifications();
  }, []);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (showUnreadOnly && item.read) return false;
      if (selectedFilter === 'all') return true;
      return item.type === selectedFilter;
    });
  }, [notifications, selectedFilter, showUnreadOnly]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Mark all as read directly in Supabase
  const markAllRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);

    try {
      const userEmail = session?.email ? String(session.email).trim().toLowerCase() : null;
      if (userEmail) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .or(`user_email.is.null,user_email.eq.${userEmail}`);
      } else {
        await supabase.from('notifications').update({ read: true }).neq('id', '');
      }
    } catch {}
  };

  // Toggle single read status in Supabase
  const toggleReadStatus = async (id: string) => {
    let nextRead = true;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          nextRead = !n.read;
          return { ...n, read: nextRead };
        }
        return n;
      })
    );

    try {
      if (!id.startsWith('reg-entry-') && !id.startsWith('follow-') && !id.startsWith('account-init-')) {
        await supabase.from('notifications').update({ read: nextRead }).eq('id', id);
      }
    } catch {}
  };

  // Delete notification directly from Supabase
  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      if (!id.startsWith('reg-entry-') && !id.startsWith('follow-') && !id.startsWith('account-init-')) {
        await supabase.from('notifications').delete().eq('id', id);
      }
    } catch {}
  };

  // Clear all read notifications directly from Supabase
  const clearReadNotifications = async () => {
    const readItems = notifications.filter((n) => n.read);
    const dbIdsToDelete = readItems
      .map((n) => n.id)
      .filter((id) => !id.startsWith('reg-entry-') && !id.startsWith('follow-') && !id.startsWith('account-init-'));

    setNotifications((prev) => prev.filter((n) => !n.read));

    try {
      if (dbIdsToDelete.length > 0) {
        await supabase.from('notifications').delete().in('id', dbIdsToDelete);
      }
    } catch {}
  };

  // Handle Team Squad Invite response
  const handleInviteResponse = (item: NotificationItem, status: 'accepted' | 'declined') => {
    const updated = notifications.map((n) => {
      if (n.id === item.id) {
        return {
          ...n,
          inviteStatus: status,
          read: true,
          message:
            status === 'accepted'
              ? `You accepted the squad invitation. Roster status is now active.`
              : `You declined the squad invitation.`,
        };
      }
      return n;
    });
    setNotifications(updated);
  };

  const handleCopyCode = (id: string, code: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'tournament':
        return <Swords className="h-4.5 w-4.5 text-emerald-400" />;
      case 'team':
        return <Users className="h-4.5 w-4.5 text-indigo-400" />;
      case 'campus':
        return <Building2 className="h-4.5 w-4.5 text-amber-400" />;
      case 'system':
        return <ShieldCheck className="h-4.5 w-4.5 text-teal-400" />;
      default:
        return <Bell className="h-4.5 w-4.5 text-emerald-400" />;
    }
  };

  const getTypeBadgeStyle = (type: NotificationType) => {
    switch (type) {
      case 'tournament':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'team':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'campus':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'system':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      default:
        return 'bg-white/10 text-zinc-300 border-white/20';
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ 1. HERO HEADER ═══════════════ */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-arena.jpg"
            alt="Activity Notifications"
            className="w-full h-full object-cover filter brightness-[0.25] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_60%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>

            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider animate-pulse">
                <Radio className="h-3 w-3" /> {unreadCount} Unread Alert{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
                <Bell className="h-3.5 w-3.5" /> Database Dispatch Feed
              </div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                Live <span className="text-emerald-400">Notifications</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal mt-2 max-w-xl">
                Real database notifications for your tournament registrations, team invites, and athlete followers.
              </p>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-400 transition cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4" /> Mark All Read
                </button>
              )}
              {notifications.some((n) => n.read) && (
                <button
                  type="button"
                  onClick={clearReadNotifications}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Read
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ 2. FILTERS & CONTROLS ═══════════════ */}
      <section className="sticky top-16 z-30 border-b border-white/10 bg-black/90 backdrop-blur-2xl py-3">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/80 border border-white/10 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                selectedFilter === 'all'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('tournament')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                selectedFilter === 'tournament'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Swords className="h-3.5 w-3.5" /> Tournaments & Passes
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('team')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                selectedFilter === 'team'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Squads & Follows
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('system')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                selectedFilter === 'system'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> System & Verification
            </button>
          </div>

          {/* Unread Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-300 hover:text-white transition shrink-0">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40 h-4 w-4"
            />
            <span>Unread Only</span>
          </label>
        </div>
      </section>

      {/* ═══════════════ 3. NOTIFICATIONS FEED ═══════════════ */}
      <section className="py-10 sm:py-16 bg-black min-h-[60vh]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-4">
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-3xl border border-white/5 bg-[#09090b] p-6 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="w-48 h-5 rounded bg-zinc-900" />
                    <div className="w-16 h-4 rounded bg-zinc-900" />
                  </div>
                  <div className="w-full h-4 rounded bg-zinc-900/60" />
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#09090b] p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase text-white">
                {showUnreadOnly ? 'No Unread Notifications' : 'No Notifications Yet'}
              </h3>
              <p className="text-xs text-zinc-400">
                {showUnreadOnly
                  ? 'You have caught up with all live dispatches.'
                  : 'Register for a tournament, create a team, or follow athletes to receive live updates in your dispatch feed.'}
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/tournaments"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition"
                >
                  Browse Tournaments
                </Link>
                <Link
                  href="/players"
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition"
                >
                  Find Athletes
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredNotifications.map((item, idx) => {
                const isUnread = !item.read;

                return (
                  <motion.div
                    key={`${item.id}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`group rounded-3xl border transition-all duration-200 p-5 sm:p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                      isUnread
                        ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-[#0d1410] to-[#09090b] shadow-xl shadow-emerald-500/5'
                        : 'border-white/10 bg-[#09090b] hover:border-white/20'
                    }`}
                  >
                    {/* Unread Left Border Highlight */}
                    {isUnread && (
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-500" />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-2xl border shrink-0 mt-0.5 ${getTypeBadgeStyle(item.type)}`}>
                        {getTypeIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                            {item.title}
                          </h3>
                          {item.badge && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getTypeBadgeStyle(item.type)}`}>
                              {item.badge}
                            </span>
                          )}
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                          {item.message}
                        </p>

                        {/* Interactive Match Room Code / Pass ID */}
                        {item.roomCode && (
                          <div className="pt-1 flex items-center gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-emerald-400 font-bold">
                              <span>PASS ID: {item.roomCode}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(item.id, item.roomCode!)}
                                className="text-zinc-400 hover:text-white transition cursor-pointer p-0.5"
                                title="Copy Pass ID"
                              >
                                {copiedCodeId === item.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            {copiedCodeId === item.id && (
                              <span className="text-[11px] font-bold text-emerald-400">Copied!</span>
                            )}
                          </div>
                        )}

                        {/* Interactive Invite Buttons */}
                        {item.type === 'team' && item.inviteStatus === 'pending' && (
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleInviteResponse(item, 'accepted')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
                            >
                              <Check className="h-3.5 w-3.5" /> Accept Invite
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInviteResponse(item, 'declined')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/15 text-zinc-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" /> Decline
                            </button>
                          </div>
                        )}

                        {item.type === 'team' && item.inviteStatus === 'accepted' && (
                          <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Squad Invitation Accepted
                          </div>
                        )}

                        {/* Action Link (e.g. View Tournament / Profile) */}
                        {item.actionUrl && (
                          <div className="pt-1">
                            <Link
                              href={item.actionUrl}
                              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition"
                            >
                              {item.actionLabel || 'View Details'} <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right metadata & quick buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 uppercase">
                        <Clock className="h-3 w-3" />
                        <span>{item.time}</span>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => toggleReadStatus(item.id)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            isUnread
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                          }`}
                          title={isUnread ? 'Mark as read' : 'Mark as unread'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNotification(item.id)}
                          className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 transition cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
