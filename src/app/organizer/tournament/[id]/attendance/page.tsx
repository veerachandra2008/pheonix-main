'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  AlertTriangle,
  UserCheck,
  Building2,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Trophy,
  Calendar,
  MapPin,
  ChevronRight,
  UserX,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  CreditCard,
  Ticket
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { tournaments as defaultTournaments } from '@/app/tournaments/data';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

interface RegistrationItem {
  id: string;
  pass_id: string;
  passId?: string;
  tournament_slug: string;
  tournament_title?: string;
  team_name: string;
  college?: string;
  captain_name: string;
  email: string;
  phone?: string;
  payment_status: string;
  payment_id?: string | null;
  paymentId?: string | null;
  order_id?: string | null;
  orderId?: string | null;
  tournament_fee?: string | null;
  tournamentFee?: string | null;
  attendance_status: 'NOT_MARKED' | 'PRESENT' | 'ABSENT';
  attended_at?: string | null;
  attended_by?: string | null;
  registered_at?: string;
  members_count?: number;
  players?: any[];
}

export default function TournamentAttendancePage() {
  const router = useRouter();
  const routeParams = useParams();
  const rawId = (routeParams?.id as string) || '';

  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_MARKED' | 'PRESENT' | 'ABSENT'>('ALL');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'ALL' | 'PAID' | 'FREE'>('ALL');
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);

  // Batch absent confirmation modal
  const [showBatchAbsentModal, setShowBatchAbsentModal] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Helper to determine if registration is Paid or Free
  const checkIsPaid = (r: RegistrationItem) => {
    const pId = r.payment_id || r.paymentId;
    const oId = r.order_id || r.orderId;
    const fee = (r.tournament_fee || r.tournamentFee || '').toString().toLowerCase();
    const pStatus = (r.payment_status || '').toString().toUpperCase();
    return (
      (pId && pId !== 'FREE' && pId !== 'FREE ENTRY') ||
      (oId && oId !== 'FREE' && oId !== 'FREE ENTRY') ||
      pStatus === 'SUCCESS' ||
      pStatus.includes('PAID') ||
      (fee && !fee.includes('free') && fee !== '₹0' && fee !== '0')
    );
  };

  // 1. Authentication & Authorization Check
  useEffect(() => {
    async function checkAuthAndLoad() {
      const rawSession = localStorage.getItem('xenova_session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }

      try {
        const user = JSON.parse(rawSession);
        setSession(user);

        // Fetch tournament details to check organizer ownership
        const apiBase = getApiBaseUrl();
        let foundTournament: any = null;

        // 1. Direct Supabase Query
        try {
          const { data: sbTourn } = await supabase
            .from('tournaments')
            .select('*')
            .or(`slug.eq.${rawId},id.eq.${rawId}`)
            .maybeSingle();
          if (sbTourn) foundTournament = sbTourn;
        } catch {}

        // 2. Fallback to API
        if (!foundTournament) {
          try {
            const tournRes = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
            if (tournRes.ok) {
              const tournData = await tournRes.json();
              if (tournData.success && Array.isArray(tournData.data)) {
                foundTournament = tournData.data.find(
                  (t: any) =>
                    t.slug === rawId ||
                    t.id?.toString() === rawId ||
                    t.slug?.toLowerCase().includes(rawId.toLowerCase())
                );
              }
            }
          } catch {}
        }

        // 3. Fallback to defaultTournaments
        if (!foundTournament) {
          foundTournament = defaultTournaments.find(
            (t) => t.slug === rawId || t.slug.toLowerCase().includes(rawId.toLowerCase())
          );
        }

        if (!foundTournament) {
          foundTournament = {
            slug: rawId,
            title: rawId.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
            game: 'Competitive Esports',
            format: 'Tournament',
            region: 'Main Arena',
            date: 'Event Day',
            prize: '₹1,00,000',
            image: '/valorant.jpg',
            host: user.name || 'Organizer',
            createdBy: user.email
          };
        }

        setTournament(foundTournament);

        // Check if user is authorized to manage THIS tournament desk
        const userRole = (user.role || '').toLowerCase();
        const isAdmin = userRole === 'admin' || user.email === 'admin@xenova.gg';

        if (!isAdmin) {
          const cleanEmail = (user.email || '').trim().toLowerCase();
          const cleanName = (user.name || user.hostName || '').trim().toLowerCase();
          const createdBy = (foundTournament.createdBy || foundTournament.organizer_email || foundTournament.organizerEmail || '').trim().toLowerCase();
          const host = (foundTournament.host || foundTournament.hostName || '').trim().toLowerCase();

          const isOwner = (cleanEmail && (createdBy === cleanEmail || host.includes(cleanEmail))) ||
                          (cleanName && (host === cleanName || host.includes(cleanName)));

          if (!isOwner) {
            setIsAuthorized(false);
            setAuthLoading(false);
            setLoading(false);
            return;
          }
        }

        setIsAuthorized(true);
        setAuthLoading(false);

        // Load Registrations
        await fetchRegistrationsData(foundTournament.slug || rawId, foundTournament.title);
      } catch {
        router.replace('/login');
      }
    }

    checkAuthAndLoad();
  }, [rawId, router]);

  // Load Registrations & Event Attendance
  const fetchRegistrationsData = async (targetSlug: string, tournTitle?: string) => {
    setLoading(true);
    try {
      let items: RegistrationItem[] = [];

      // 1. Direct Supabase Query
      try {
        const [sbRegRes, sbAttRes] = await Promise.all([
          supabase.from('registrations').select('*').ilike('tournament_slug', targetSlug),
          supabase.from('event_attendance').select('*').ilike('tournament_slug', targetSlug),
        ]);

        const attMap: Record<string, any> = {};
        if (sbAttRes.data && Array.isArray(sbAttRes.data)) {
          for (const a of sbAttRes.data) {
            if (a.pass_id) attMap[a.pass_id] = a;
          }
        }

        if (sbRegRes.data && Array.isArray(sbRegRes.data) && sbRegRes.data.length > 0) {
          items = sbRegRes.data.map((r: any) => {
            const pid = r.pass_id || r.passId || r.id;
            const att = attMap[pid] || {};
            return {
              id: pid,
              pass_id: pid,
              passId: pid,
              tournament_slug: r.tournament_slug || targetSlug,
              tournament_title: r.tournament_title || tournTitle,
              team_name: r.team_name || r.teamName || 'Squad Entry',
              college: r.college || 'Collegiate Campus',
              captain_name: r.captain_name || r.captainName || 'Team Captain',
              email: r.email || 'competitor@campus.edu',
              phone: r.phone || '',
              payment_status: r.payment_status || r.paymentStatus || 'FREE ENTRY',
              payment_id: r.payment_id || r.paymentId || null,
              paymentId: r.payment_id || r.paymentId || null,
              order_id: r.order_id || r.orderId || null,
              orderId: r.order_id || r.orderId || null,
              tournament_fee: r.tournament_fee || r.tournamentFee || null,
              attendance_status: (att.attendance_status || r.attendance_status || 'NOT_MARKED').toUpperCase() as any,
              attended_at: att.attended_at || r.attended_at || null,
              attended_by: att.attended_by || r.attended_by || null,
              registered_at: r.registered_at || r.created_at,
              members_count: 5,
              players: r.players || [],
            };
          });
        }
      } catch (sbErr) {
        console.warn('Supabase attendance load notice:', sbErr);
      }

      // 2. Fallback to Flask API
      if (items.length === 0) {
        try {
          const attRes = await flaskApi.getEventAttendance(targetSlug);
          if (attRes && attRes.success && Array.isArray(attRes.data)) {
            items = attRes.data.map((r: any) => ({
              id: r.id || r.pass_id || r.passId,
              pass_id: r.pass_id || r.passId,
              passId: r.pass_id || r.passId,
              tournament_slug: r.tournament_slug || targetSlug,
              tournament_title: r.tournament_title || tournTitle,
              team_name: r.team_name || r.teamName || 'Squad Entry',
              college: r.college || 'Collegiate Campus',
              captain_name: r.captain_name || r.captainName || 'Team Captain',
              email: r.email || 'competitor@campus.edu',
              phone: r.phone || '',
              payment_status: r.payment_status || r.paymentStatus || 'FREE ENTRY',
              payment_id: r.payment_id || r.paymentId || null,
              paymentId: r.payment_id || r.paymentId || null,
              order_id: r.order_id || r.orderId || null,
              orderId: r.order_id || r.orderId || null,
              tournament_fee: r.tournament_fee || r.tournamentFee || null,
              attendance_status: (r.attendance_status || r.attendanceStatus || 'NOT_MARKED').toUpperCase() as any,
              attended_at: r.attended_at || r.attendedAt || null,
              attended_by: r.attended_by || r.attendedBy || null,
              registered_at: r.registered_at || r.registeredAt,
              members_count: 5,
              players: r.players || [],
            }));
          }
        } catch {}
      }

      setRegistrations(items);
    } catch (e) {
      console.error('Failed to fetch attendance data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadData = () => {
    if (tournament) {
      fetchRegistrationsData(tournament.slug || rawId, tournament.title);
    }
  };

  // Attendance Quick Stats
  const stats = useMemo(() => {
    const total = registrations.length;
    const present = registrations.filter((r) => r.attendance_status === 'PRESENT').length;
    const absent = registrations.filter((r) => r.attendance_status === 'ABSENT').length;
    const notMarked = registrations.filter((r) => r.attendance_status === 'NOT_MARKED').length;
    const paid = registrations.filter(checkIsPaid).length;
    const free = total - paid;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, notMarked, paid, free, rate };
  }, [registrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && r.attendance_status !== statusFilter) {
        return false;
      }

      // 2. Entry Type Filter
      if (entryTypeFilter !== 'ALL') {
        const isPaid = checkIsPaid(r);
        if (entryTypeFilter === 'PAID' && !isPaid) return false;
        if (entryTypeFilter === 'FREE' && isPaid) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const passMatch = (r.pass_id || '').toLowerCase().includes(q);
        const teamMatch = (r.team_name || '').toLowerCase().includes(q);
        const capMatch = (r.captain_name || '').toLowerCase().includes(q);
        const colMatch = (r.college || '').toLowerCase().includes(q);
        const emailMatch = (r.email || '').toLowerCase().includes(q);
        const payIdMatch = ((r.payment_id || r.paymentId || '').toLowerCase()).includes(q);
        const orderIdMatch = ((r.order_id || r.orderId || '').toLowerCase()).includes(q);
        return passMatch || teamMatch || capMatch || colMatch || emailMatch || payIdMatch || orderIdMatch;
      }

      return true;
    });
  }, [registrations, statusFilter, entryTypeFilter, searchQuery]);

  // Action: Mark Individual Attendance Status
  const handleMarkStatus = async (
    item: RegistrationItem,
    newStatus: 'PRESENT' | 'ABSENT' | 'NOT_MARKED'
  ) => {
    setActionLoadingId(item.pass_id);
    const organizerName = session?.name || session?.email || 'Organizer Desk';

    try {
      const nowIso = new Date().toISOString();
      const updatedItem: RegistrationItem = {
        ...item,
        attendance_status: newStatus,
        attended_at: newStatus === 'NOT_MARKED' ? null : nowIso,
        attended_by: newStatus === 'NOT_MARKED' ? null : organizerName,
      };

      // 1. Optimistic UI update
      setRegistrations((prev) =>
        prev.map((r) => (r.pass_id === item.pass_id ? updatedItem : r))
      );

      // 2. Sync to Backend Database
      await flaskApi.updateAttendance(
        item.pass_id,
        newStatus,
        organizerName,
        { tournament_slug: tournament?.slug || rawId }
      );

      setToastMessage({
        type: newStatus === 'PRESENT' ? 'success' : newStatus === 'ABSENT' ? 'error' : 'info',
        text: `Updated ${item.team_name} to ${newStatus === 'PRESENT' ? 'PRESENT (Checked In)' : newStatus === 'ABSENT' ? 'ABSENT' : 'NOT MARKED'}.`,
      });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: `Failed to update status: ${err?.message || 'Server connection error'}`,
      });
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Batch Mark Remaining Unchecked Teams as Absent
  const handleBatchMarkRemainingAbsent = async () => {
    setBatchLoading(true);
    const organizerName = session?.name || session?.email || 'Organizer Desk';
    const targetSlug = tournament?.slug || rawId;

    try {
      const nowIso = new Date().toISOString();

      // Optimistic UI update
      setRegistrations((prev) =>
        prev.map((r) =>
          r.attendance_status === 'NOT_MARKED'
            ? { ...r, attendance_status: 'ABSENT', attended_at: nowIso, attended_by: organizerName }
            : r
        )
      );

      await flaskApi.markRemainingAbsent(targetSlug, organizerName);

      setShowBatchAbsentModal(false);
      setToastMessage({
        type: 'info',
        text: `Marked all remaining teams as ABSENT for ${tournament?.title || 'tournament'}.`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: `Batch update error: ${err?.message || 'Failed to update database'}`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setBatchLoading(false);
    }
  };

  // Copy Pass ID
  const handleCopyPassId = (passId: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(passId);
      setCopiedPassId(passId);
      setTimeout(() => setCopiedPassId(null), 2000);
    }
  };

  // Format Date/Time
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Export Attendance CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      'Pass ID',
      'Team Name',
      'Captain Name',
      'College',
      'Email',
      'Entry Type',
      'Payment ID',
      'Order ID',
      'Payment Status',
      'Attendance Status',
      'Check-in Time',
      'Marked By',
    ];

    const rows = registrations.map((r) => {
      const isPaid = checkIsPaid(r);
      return [
        `"${r.pass_id}"`,
        `"${r.team_name}"`,
        `"${r.captain_name}"`,
        `"${r.college || ''}"`,
        `"${r.email}"`,
        `"${isPaid ? 'PAID ENTRY' : 'FREE ENTRY'}"`,
        `"${r.payment_id || r.paymentId || 'N/A'}"`,
        `"${r.order_id || r.orderId || 'N/A'}"`,
        `"${r.payment_status}"`,
        `"${r.attendance_status}"`,
        `"${r.attended_at ? new Date(r.attended_at).toLocaleString() : ''}"`,
        `"${r.attended_by || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${tournament?.slug || 'Tournament'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14] text-white">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto" />
          <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Authorizing Event Organizer...</p>
        </div>
      </div>
    );
  }

  // Unauthorized Access Screen
  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-[#0C111D] p-8 text-center space-y-6 shadow-2xl shadow-rose-950/30">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Attendance Desk Restricted</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              You can only access and handle the attendance desk for tournaments that you organize. You do not have organizer permissions for <strong className="text-white">{tournament?.title || rawId}</strong>.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/organizer/attendance"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg text-center"
            >
              My Attendance Desks
            </Link>
            <Link
              href="/organizer/dashboard"
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition text-center"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white selection:bg-emerald-500 selection:text-zinc-950 font-sans pb-20">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-xl ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-emerald-900/30'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-300 shadow-rose-900/30'
                : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300 shadow-indigo-900/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            ) : (
              <UserCheck className="h-5 w-5 text-indigo-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link
              href="/organizer/dashboard"
              className="inline-flex items-center gap-1 hover:text-white transition px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <Link
              href="/organizer/attendance"
              className="hover:text-white transition"
            >
              Attendance Desks
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-emerald-400 font-black">{tournament?.title || 'Event Desk'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={registrations.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export Sheet
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ═══════════════ 1. EVENT DAY HEADER BANNER ═══════════════ */}
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0C111D] p-6 sm:p-8 shadow-2xl mb-8">
          <div className="absolute inset-0 z-0 opacity-20">
            <img
              src={tournament?.image || '/hero-arena.jpg'}
              alt="Backdrop"
              className="h-full w-full object-cover filter blur-sm"
              onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C111D] via-[#0C111D]/90 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Organizer Attendance Desk
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {tournament?.game || 'Esports'} • {tournament?.format || 'Tournament'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
                {tournament?.title || 'Tournament'} — Live Attendance
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                Verify team check-ins, validate Paid &amp; Free entry passes by Payment/Order IDs, and track live match attendance.
              </p>
            </div>

            {/* Quick Batch Absent CTA */}
            {stats.notMarked > 0 && (
              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowBatchAbsentModal(true)}
                  className="px-5 py-3.5 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-300 hover:text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserX className="h-4 w-4" />
                  Mark Remaining as Absent ({stats.notMarked})
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════ 2. ATTENDANCE STATISTICS CARDS ═══════════════ */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          
          {/* Total Registered */}
          <div className="rounded-2xl border border-white/10 bg-[#0C111D] p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Total Registered</span>
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black italic text-white">{stats.total}</span>
              <span className="text-[11px] text-slate-500 font-bold">Teams</span>
            </div>
          </div>

          {/* Paid Entries */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400">Paid Entries</span>
              <CreditCard className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black italic text-emerald-300">{stats.paid}</span>
              <span className="text-[11px] text-emerald-500/70 font-bold">Verified</span>
            </div>
          </div>

          {/* Free Entries */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-950/15 p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-blue-400">Free Passes</span>
              <Ticket className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black italic text-blue-300">{stats.free}</span>
              <span className="text-[11px] text-blue-500/70 font-bold">Passes</span>
            </div>
          </div>

          {/* Present */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400">Present</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black italic text-emerald-400">{stats.present}</span>
              <span className="text-[11px] text-emerald-500/70 font-bold">Arrived</span>
            </div>
          </div>

          {/* Absent */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/15 p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-400">Absent</span>
              <XCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black italic text-rose-400">{stats.absent}</span>
              <span className="text-[11px] text-rose-500/70 font-bold">No-Show</span>
            </div>
          </div>

          {/* Not Marked */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/15 p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-400">Awaiting</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black italic text-amber-400">{stats.notMarked}</span>
              <span className="text-[11px] text-amber-500/70 font-bold">Pending</span>
            </div>
          </div>

        </section>

        {/* ═══════════════ 3. SEARCH & DUAL FILTERS (STATUS & ENTRY TYPE) ═══════════════ */}
        <section className="rounded-2xl border border-white/10 bg-[#0C111D] p-4 sm:p-5 mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Large Instant Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Pass ID (XPH-...), Payment ID (pay_...), Team, Captain, or College..."
                className="w-full pl-12 pr-10 py-3.5 bg-black/50 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm placeholder:text-slate-500 transition outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Entry Type Filter Tabs (Paid vs Free) */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setEntryTypeFilter('ALL')}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition cursor-pointer ${
                  entryTypeFilter === 'ALL'
                    ? 'bg-white/15 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Entries ({stats.total})
              </button>

              <button
                type="button"
                onClick={() => setEntryTypeFilter('PAID')}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  entryTypeFilter === 'PAID'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <CreditCard className="h-3 w-3" /> Paid ({stats.paid})
              </button>

              <button
                type="button"
                onClick={() => setEntryTypeFilter('FREE')}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  entryTypeFilter === 'FREE'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow'
                    : 'text-slate-400 hover:text-blue-400'
                }`}
              >
                <Ticket className="h-3 w-3" /> Free ({stats.free})
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white/15 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Status
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('PRESENT')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === 'PRESENT'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Present ({stats.present})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('NOT_MARKED')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === 'NOT_MARKED'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Awaiting Check-in ({stats.notMarked})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ABSENT')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === 'ABSENT'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              Absent ({stats.absent})
            </button>
          </div>
        </section>

        {/* ═══════════════ 4. REGISTRATIONS & ATTENDANCE ROSTER LIST ═══════════════ */}
        <section className="space-y-4">
          
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Attendance Roster...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#0C111D] p-12 text-center space-y-3">
              <Users className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight">No Teams Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tournament participants match your current search and filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegistrations.map((item) => {
                const isPresent = item.attendance_status === 'PRESENT';
                const isAbsent = item.attendance_status === 'ABSENT';
                const isNotMarked = item.attendance_status === 'NOT_MARKED';
                const isActionLoading = actionLoadingId === item.pass_id;
                const isPaid = checkIsPaid(item);
                const paymentId = item.payment_id || item.paymentId;
                const orderId = item.order_id || item.orderId;

                return (
                  <motion.div
                    key={item.pass_id}
                    layout
                    className={`rounded-2xl border p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isPresent
                        ? 'bg-[#0C111D] border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                        : isAbsent
                        ? 'bg-[#0C111D] border-rose-500/30 opacity-80'
                        : 'bg-[#0C111D] border-white/10 hover:border-white/20'
                    }`}
                  >
                    
                    {/* Left: Status Icon & Team Details */}
                    <div className="flex items-start gap-4 flex-1">
                      
                      {/* Status Icon Indicator */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${
                          isPresent
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : isAbsent
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        {isPresent ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : isAbsent ? (
                          <XCircle className="h-6 w-6" />
                        ) : (
                          <Clock className="h-6 w-6" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2 flex-1">
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                            {item.team_name}
                          </h3>

                          {/* Pass ID with copy */}
                          <button
                            type="button"
                            onClick={() => handleCopyPassId(item.pass_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 transition cursor-pointer"
                            title="Click to copy Pass ID"
                          >
                            <span>{item.pass_id}</span>
                            {copiedPassId === item.pass_id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-500" />
                            )}
                          </button>

                          {/* Paid vs Free Entry Badge based on Payment ID / Order ID */}
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CreditCard className="h-3 w-3" /> PAID ENTRY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              <Ticket className="h-3 w-3" /> FREE ENTRY
                            </span>
                          )}
                        </div>

                        {/* Payment and Order ID Details if Paid */}
                        {isPaid && (paymentId || orderId) && (
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 w-fit">
                            {paymentId && paymentId !== 'FREE' && (
                              <span className="text-slate-400">
                                Payment ID: <strong className="text-emerald-400 font-bold">{paymentId}</strong>
                              </span>
                            )}
                            {orderId && orderId !== 'FREE' && (
                              <span className="text-slate-400">
                                Order ID: <strong className="text-indigo-400 font-bold">{orderId}</strong>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Captain & College */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                          <span className="text-white font-bold">
                            Captain: {item.captain_name}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Building2 className="h-3 w-3 text-indigo-400" /> {item.college || 'Varsity'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Mail className="h-3 w-3 text-slate-500" /> {item.email}
                          </span>
                        </div>

                        {/* 4-Player Roster List in Attendance Desk */}
                        {item.players && Array.isArray(item.players) && item.players.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.players.map((p: any) => (
                              <span
                                key={p.slot || p.email}
                                className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1"
                              >
                                <span className="text-emerald-400 font-bold">{p.isCaptain || p.slot === 1 ? '👑' : `P${p.slot}`}:</span>
                                <span>{p.name || p.playerName}</span>
                                <span className="text-slate-500 font-normal">({p.email})</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Attendance Metadata Stamp */}
                        <div className="pt-0.5">
                          {isPresent && (
                            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              <span>Checked in at {formatTime(item.attended_at)}</span>
                              {item.attended_by && (
                                <span className="text-emerald-500/70">• Marked by: {item.attended_by}</span>
                              )}
                            </div>
                          )}

                          {isAbsent && (
                            <div className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              <span>Marked absent at {formatTime(item.attended_at)}</span>
                              {item.attended_by && (
                                <span className="text-rose-500/70">• Marked by: {item.attended_by}</span>
                              )}
                            </div>
                          )}

                          {isNotMarked && (
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-400/80">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              <span>Awaiting check-in at event</span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Right: Large Event-Day Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                      
                      {isNotMarked && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(item, 'PRESENT')}
                            disabled={isActionLoading}
                            className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark Present
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(item, 'ABSENT')}
                            disabled={isActionLoading}
                            className="px-4 py-3 bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
                          >
                            Mark Absent
                          </button>
                        </>
                      )}

                      {isPresent && (
                        <>
                          <div className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                            <Check className="h-4 w-4" /> Present
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(item, 'ABSENT')}
                            disabled={isActionLoading}
                            className="px-3.5 py-2.5 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
                            title="Change to Absent if participant left"
                          >
                            Mark Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(item, 'NOT_MARKED')}
                            disabled={isActionLoading}
                            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                            title="Reset to Not Marked"
                          >
                            Reset
                          </button>
                        </>
                      )}

                      {isAbsent && (
                        <>
                          <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                            <XCircle className="h-4 w-4" /> Absent
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(item, 'PRESENT')}
                            disabled={isActionLoading}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Arrived late? Click to update to Present"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Late Arrival → Present
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkStatus(item, 'NOT_MARKED')}
                            disabled={isActionLoading}
                            className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                            title="Reset to Not Marked"
                          >
                            Reset
                          </button>
                        </>
                      )}

                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}

        </section>

      </div>

      {/* ═══════════════ BATCH MARK ABSENT CONFIRMATION MODAL ═══════════════ */}
      <AnimatePresence>
        {showBatchAbsentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0C111D] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Mark Remaining Absent?
                  </h3>
                  <p className="text-xs text-slate-400">End of event attendance closure</p>
                </div>
              </div>

              <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-2xl space-y-2">
                <p className="text-xs text-rose-300 font-semibold leading-relaxed">
                  Are you sure you want to mark all remaining un-arrived registrations as <strong className="text-rose-400">ABSENT</strong>?
                </p>
                <div className="flex items-center justify-between text-xs font-black text-white pt-2 border-t border-rose-500/20">
                  <span>Registrations to update:</span>
                  <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-sm">
                    {stats.notMarked} Teams
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Teams already marked <strong className="text-emerald-400">PRESENT</strong> will not be affected. You can still manually change any late arriving team back to Present later.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBatchAbsentModal(false)}
                  disabled={batchLoading}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBatchMarkRemainingAbsent}
                  disabled={batchLoading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {batchLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserX className="h-4 w-4" />
                  )}
                  Confirm Absent ({stats.notMarked})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
