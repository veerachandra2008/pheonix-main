'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  X,
  FileText,
  User,
  Users,
  Building,
  Phone,
  Hash,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

export interface RosterPlayer {
  slot?: number;
  name?: string;
  in_game_tag?: string;
  game_id?: string;
  email?: string;
  phone?: string;
  is_captain?: boolean;
}

export interface ManualUpiOrder {
  order_id: string;
  payment_id?: string;
  tournament_slug: string;
  user_id?: string;
  email?: string;
  amount_paise: number;
  currency?: string;
  status: 'PENDING' | 'DUPLICATE_REVIEW' | 'VERIFIED' | 'REJECTED' | string;
  payment_method: 'MANUAL_UPI' | string;
  payment_phone_number?: string;
  utr_id?: string;
  screenshot_path?: string;
  verified_by?: string;
  verified_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  registration_payload?: {
    team_name?: string;
    college?: string;
    captain_name?: string;
    captain_email?: string;
    captain_phone?: string;
    tournament_title?: string;
    tournament_slug?: string;
    players?: RosterPlayer[];
  };
}

interface OrganizerManualUpiVerificationProps {
  session?: any;
  tournaments?: any[];
  onOrderProcessed?: () => void;
}

type FilterTab = 'PENDING' | 'DUPLICATE_REVIEW' | 'VERIFIED' | 'REJECTED' | 'ALL';

const QUICK_REJECTION_REASONS = [
  'Invalid or unreadable screenshot',
  'UTR / Transaction ID not found in bank records',
  'Payment amount does not match tournament fee',
  'Duplicate or reused transaction receipt',
  'Payment reversed or failed',
];

export default function OrganizerManualUpiVerification({
  session,
  tournaments = [],
  onOrderProcessed,
}: OrganizerManualUpiVerificationProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('PENDING');
  const [orders, setOrders] = useState<ManualUpiOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTournament, setSelectedTournament] = useState<string>('ALL');

  // Modals state
  const [detailsOrder, setDetailsOrder] = useState<ManualUpiOrder | null>(null);
  const [acceptingOrder, setAcceptingOrder] = useState<ManualUpiOrder | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<ManualUpiOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string>('');

  // Screenshot Lightbox State
  const [screenshotModalOpen, setScreenshotModalOpen] = useState<boolean>(false);
  const [screenshotLoading, setScreenshotLoading] = useState<boolean>(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [currentScreenshotOrderId, setCurrentScreenshotOrderId] = useState<string | null>(null);

  // Action states (prevent double-clicks)
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [generatedPassId, setGeneratedPassId] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);

  // Helper to obtain current Supabase session token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session: sbSession } } = await supabase.auth.getSession();
      return sbSession?.access_token || null;
    } catch (err) {
      console.warn('Error fetching Supabase auth session token:', err);
      return null;
    }
  }, []);

  // Fetch orders from backend API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Query status=ALL so the client has counts for all tabs
      const res = await fetch(`${apiBase}/payments/manual/orders?status=ALL`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Failed to load manual UPI orders:', err);
      setError(err?.message || 'Failed to load payment orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Tab counts based on currently loaded orders
  const counts = useMemo(() => {
    const res = {
      PENDING: 0,
      DUPLICATE_REVIEW: 0,
      VERIFIED: 0,
      REJECTED: 0,
      ALL: orders.length,
    };
    for (const o of orders) {
      const st = (o.status || '').toUpperCase();
      if (st === 'PENDING') res.PENDING++;
      else if (st === 'DUPLICATE_REVIEW') res.DUPLICATE_REVIEW++;
      else if (st === 'VERIFIED') res.VERIFIED++;
      else if (st === 'REJECTED') res.REJECTED++;
    }
    return res;
  }, [orders]);

  // Filtered orders list based on active tab, tournament dropdown, and search query
  const filteredOrders = useMemo(() => {
    let list = orders;

    // Filter by tab
    if (activeTab !== 'ALL') {
      list = list.filter((o) => (o.status || '').toUpperCase() === activeTab);
    }

    // Filter by tournament
    if (selectedTournament !== 'ALL') {
      list = list.filter(
        (o) => (o.tournament_slug || '').toLowerCase() === selectedTournament.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((o) => {
        const team = (o.registration_payload?.team_name || '').toLowerCase();
        const captain = (
          o.registration_payload?.captain_name ||
          o.email ||
          ''
        ).toLowerCase();
        const college = (o.registration_payload?.college || '').toLowerCase();
        const utr = (o.utr_id || '').toLowerCase();
        const phone = (o.payment_phone_number || '').toLowerCase();
        const tourn = (o.tournament_slug || '').toLowerCase();
        const orderId = (o.order_id || '').toLowerCase();

        return (
          team.includes(q) ||
          captain.includes(q) ||
          college.includes(q) ||
          utr.includes(q) ||
          phone.includes(q) ||
          tourn.includes(q) ||
          orderId.includes(q)
        );
      });
    }

    return list;
  }, [orders, activeTab, selectedTournament, searchQuery]);

  // Fetch Screenshot via Phase 4C backend endpoint
  const handleOpenScreenshot = async (paymentId: string) => {
    setCurrentScreenshotOrderId(paymentId);
    setScreenshotModalOpen(true);
    setScreenshotLoading(true);
    setScreenshotUrl(null);
    setScreenshotError(null);

    try {
      const token = await getAuthToken();
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/payments/manual/${paymentId}/screenshot`, {
        method: 'GET',
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.signedUrl) {
        throw new Error(data.message || 'Could not load secure screenshot URL.');
      }

      setScreenshotUrl(data.signedUrl);
    } catch (err: any) {
      console.error('Screenshot fetch error:', err);
      setScreenshotError(err?.message || 'Failed to retrieve payment screenshot.');
    } finally {
      setScreenshotLoading(false);
    }
  };

  // ACCEPT Flow (Calls Phase 4B verification endpoint)
  const handleConfirmAccept = async () => {
    if (!acceptingOrder || isAccepting) return;
    setIsAccepting(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const apiBase = getApiBaseUrl();
      const paymentId = acceptingOrder.order_id;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/payments/manual/${paymentId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Verification failed (HTTP ${res.status}).`);
      }

      // Success
      setGeneratedPassId(data.passId || null);
      setActionSuccessMessage(
        data.message || `Payment ${paymentId} verified and team registered successfully!`
      );
      setAcceptingOrder(null);
      if (detailsOrder?.order_id === paymentId) {
        setDetailsOrder(null);
      }

      // Refresh list
      await fetchOrders();
      if (onOrderProcessed) onOrderProcessed();
    } catch (err: any) {
      console.error('Accept error:', err);
      alert(`Acceptance Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsAccepting(false);
    }
  };

  // REJECT Flow (Calls Phase 4A rejection endpoint)
  const handleConfirmReject = async () => {
    if (!rejectingOrder || isRejecting) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionError('A valid rejection reason is required.');
      return;
    }

    setIsRejecting(true);
    setRejectionError('');

    try {
      const token = await getAuthToken();
      const apiBase = getApiBaseUrl();
      const paymentId = rejectingOrder.order_id;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}/payments/manual/${paymentId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Rejection failed (HTTP ${res.status}).`);
      }

      // Success
      setActionSuccessMessage(`Payment ${paymentId} has been rejected.`);
      setRejectingOrder(null);
      setRejectionReason('');
      if (detailsOrder?.order_id === paymentId) {
        setDetailsOrder(null);
      }

      // Refresh list
      await fetchOrders();
      if (onOrderProcessed) onOrderProcessed();
    } catch (err: any) {
      console.error('Reject error:', err);
      setRejectionError(err?.message || 'Failed to reject payment.');
    } finally {
      setIsRejecting(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="h-3 w-3 animate-pulse" /> Pending Review
          </span>
        );
      case 'DUPLICATE_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> Duplicate UTR
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3 w-3" /> Verified & Pass Issued
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-white/10">
            {st}
          </span>
        );
    }
  };

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-2.5">
              <CreditCard className="h-6 w-6 text-indigo-400" />
              Manual UPI Payment Verification
            </h2>
            {counts.PENDING > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black animate-pulse">
                {counts.PENDING} Action Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted player UTRs, verify payment screenshots, and finalize tournament registrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0C111D] border border-white/10 hover:border-white/20 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh payment submissions"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {actionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start justify-between gap-3 shadow-lg"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">{actionSuccessMessage}</p>
                {generatedPassId && (
                  <div className="mt-2 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-500/40 w-fit">
                    <span className="text-xs text-slate-400">Generated Pass ID:</span>
                    <strong className="text-emerald-300 font-mono text-xs">{generatedPassId}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPassId);
                        setCopiedPass(true);
                        setTimeout(() => setCopiedPass(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white transition p-1"
                      title="Copy Pass ID"
                    >
                      {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionSuccessMessage(null);
                setGeneratedPassId(null);
              }}
              className="text-slate-400 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Bar: Status Tabs, Tournament Filter, Search Box */}
      <div className="space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'PENDING' as FilterTab, label: 'Pending Review', count: counts.PENDING, color: 'text-amber-400' },
            { id: 'DUPLICATE_REVIEW' as FilterTab, label: 'Duplicate Review', count: counts.DUPLICATE_REVIEW, color: 'text-rose-400' },
            { id: 'VERIFIED' as FilterTab, label: 'Verified', count: counts.VERIFIED, color: 'text-emerald-400' },
            { id: 'REJECTED' as FilterTab, label: 'Rejected', count: counts.REJECTED, color: 'text-red-400' },
            { id: 'ALL' as FilterTab, label: 'All Submissions', count: counts.ALL, color: 'text-slate-300' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-[#0C111D] text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls: Tournament Select & Search Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tournament Dropdown */}
          <div className="sm:col-span-1">
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="w-full bg-[#0C111D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={t.slug || t.id} value={t.slug || ''}>
                  {t.title || t.name || t.slug}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by team, player, college, UTR, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C111D] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List / Table */}
      {loading ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center text-slate-500 bg-[#0C111D]/50">
          <Loader2 className="h-8 w-8 animate-spin rounded-full text-indigo-400 mx-auto mb-3" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Loading Manual UPI Submissions...
          </p>
        </div>
      ) : error ? (
        <div className="border border-rose-500/20 bg-rose-500/5 p-8 rounded-2xl text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
          <p className="text-sm font-bold text-rose-300">{error}</p>
          <button
            type="button"
            onClick={fetchOrders}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-dashed border-white/10 bg-[#0C111D] p-12 rounded-3xl text-center space-y-3">
          <CreditCard className="h-10 w-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-black uppercase tracking-wider text-white">
            No Manual UPI Submissions Found
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'All manual payment submissions for your tournaments have been reviewed.'
              : `No orders currently match status "${activeTab}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const regPayload = order.registration_payload || {};
            const captainName =
              regPayload.captain_name ||
              regPayload.players?.[0]?.name ||
              order.email ||
              'Captain';
            const teamName = regPayload.team_name || 'Individual / Squad';
            const college = regPayload.college || order.email || 'N/A';
            const amountFormatted = `₹${(order.amount_paise / 100).toLocaleString('en-IN')}`;
            const isPending = (order.status || '').toUpperCase() === 'PENDING';
            const isDuplicate = (order.status || '').toUpperCase() === 'DUPLICATE_REVIEW';
            const isVerified = (order.status || '').toUpperCase() === 'VERIFIED';
            const isRejected = (order.status || '').toUpperCase() === 'REJECTED';

            return (
              <div
                key={order.order_id}
                className="border border-white/10 bg-[#0C111D] rounded-2xl p-5 hover:border-white/20 transition shadow-lg space-y-4"
              >
                {/* Top Row: Team, Tournament, Amount & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black uppercase tracking-tight text-white">
                        {teamName}
                      </h3>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-indigo-400 font-semibold truncate max-w-xs">
                        {order.tournament_slug}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <strong className="text-slate-200">{captainName}</strong>
                      <span className="text-slate-600">|</span>
                      <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{college}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:text-right">
                    <div>
                      <div className="text-lg font-black italic text-emerald-400 font-mono">
                        {amountFormatted}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Tournament Fee
                      </div>
                    </div>
                    <div>{renderStatusBadge(order.status)}</div>
                  </div>
                </div>

                {/* Middle Row: Payment Metadata (Phone, UTR, Date) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/5">
                    <Phone className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">UPI Phone</span>
                      <span className="font-mono text-slate-200">{order.payment_phone_number || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/5">
                    <Hash className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">UTR / Trans ID</span>
                      <span className="font-mono text-amber-300 font-bold tracking-wide">{order.utr_id || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Submitted At</span>
                      <span className="text-slate-300">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duplicate Review Alert Banner */}
                {isDuplicate && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs font-semibold">
                    <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Requires Duplicate Review:</strong> This UTR was submitted across multiple entries. Normal ACCEPT is strictly blocked until duplicate investigation.
                    </span>
                  </div>
                )}

                {/* Rejection Details Banner if Rejected */}
                {isRejected && order.rejection_reason && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1">
                    <span className="text-red-400 font-bold uppercase tracking-wider text-[10px] block">
                      Rejection Reason
                    </span>
                    <p className="text-slate-300 italic">{order.rejection_reason}</p>
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Details / Roster Button */}
                    <button
                      type="button"
                      onClick={() => setDetailsOrder(order)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                      View Roster ({regPayload.players?.length || 4} Players)
                    </button>

                    {/* View Payment Screenshot Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenScreenshot(order.order_id)}
                      className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-indigo-400" />
                      View Screenshot
                    </button>
                  </div>

                  {/* Verification Decision Buttons (Only for PENDING) */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingOrder(order);
                          setRejectionReason('');
                          setRejectionError('');
                        }}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => setAcceptingOrder(order)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer border border-emerald-400/30"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PAYMENT DETAILS & 4-PLAYER ROSTER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {detailsOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0C111D] border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    Payment & Squad Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Order ID: <span className="font-mono text-slate-200">{detailsOrder.order_id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsOrder(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Team Name</span>
                    <p className="text-white font-bold truncate">
                      {detailsOrder.registration_payload?.team_name || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">College / Univ</span>
                    <p className="text-slate-300 font-semibold truncate">
                      {detailsOrder.registration_payload?.college || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Authoritative Fee</span>
                    <p className="text-emerald-400 font-black font-mono">
                      ₹{(detailsOrder.amount_paise / 100).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">UPI Phone</span>
                    <p className="text-slate-200 font-mono">
                      {detailsOrder.payment_phone_number || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">UTR / Transaction ID</span>
                    <p className="text-amber-300 font-bold font-mono tracking-wider">
                      {detailsOrder.utr_id || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 4-Player Squad Roster Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-400" />
                    Complete 4-Player Squad Roster
                  </h4>

                  <div className="space-y-2">
                    {(() => {
                      const rawPlayers = detailsOrder.registration_payload?.players || [];
                      // Ensure slots 1 to 4 are represented
                      const slots = [1, 2, 3, 4];

                      return slots.map((slotNum) => {
                        const player =
                          rawPlayers.find((p) => p.slot === slotNum) ||
                          rawPlayers[slotNum - 1] ||
                          null;
                        const isCaptain = slotNum === 1;

                        return (
                          <div
                            key={slotNum}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                              isCaptain
                                ? 'bg-indigo-950/20 border-indigo-500/30'
                                : 'bg-black/30 border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                  isCaptain
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/10 text-slate-400'
                                }`}
                              >
                                {slotNum}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-white text-xs font-bold">
                                    {player?.name || `Player ${slotNum}`}
                                  </strong>
                                  {isCaptain && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                      Captain
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  {player?.in_game_tag && (
                                    <span className="text-amber-400 font-mono">
                                      IGN: {player.in_game_tag}
                                    </span>
                                  )}
                                  {player?.email && (
                                    <span className="truncate max-w-[180px]">
                                      {player.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {player?.phone && (
                              <div className="text-right text-[11px] text-slate-400 font-mono">
                                {player.phone}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Screenshot Trigger */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenScreenshot(detailsOrder.order_id)}
                    className="w-full py-3 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="h-4 w-4 text-indigo-400" />
                    View Payment Screenshot
                  </button>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-6 border-t border-white/10 bg-black/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDetailsOrder(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                >
                  Close
                </button>

                {(detailsOrder.status || '').toUpperCase() === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingOrder(detailsOrder);
                        setRejectionReason('');
                        setRejectionError('');
                      }}
                      className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcceptingOrder(detailsOrder)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/40 border border-emerald-400/30 cursor-pointer"
                    >
                      Accept
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. SECURE SCREENSHOT LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {screenshotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0C111D] border border-white/15 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-400" />
                    Payment Screenshot Preview
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentScreenshotOrderId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenshotModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 flex-1 overflow-y-auto flex items-center justify-center min-h-[300px]">
                {screenshotLoading ? (
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin rounded-full text-indigo-400 mx-auto" />
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                      Retrieving Secure Signed URL...
                    </p>
                  </div>
                ) : screenshotError ? (
                  <div className="text-center space-y-3 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-sm">
                    <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
                    <p className="text-xs font-bold text-rose-300">{screenshotError}</p>
                    <button
                      type="button"
                      onClick={() => currentScreenshotOrderId && handleOpenScreenshot(currentScreenshotOrderId)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase rounded-xl transition"
                    >
                      Retry
                    </button>
                  </div>
                ) : screenshotUrl ? (
                  <div className="space-y-3 w-full flex flex-col items-center">
                    <img
                      src={screenshotUrl}
                      alt="UPI Payment Screenshot"
                      className="max-h-[60vh] max-w-full rounded-2xl object-contain border border-white/10 shadow-lg"
                      onError={() => setScreenshotError('Screenshot image could not be loaded or expired.')}
                    />
                    <a
                      href={screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider mt-2 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Full Size in New Tab
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                <button
                  type="button"
                  onClick={() => setScreenshotModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. ACCEPT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {acceptingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0C111D] border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">
                    Confirm Payment Acceptance
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepting will immediately finalize the registration for{' '}
                    <strong className="text-white">
                      {acceptingOrder.registration_payload?.team_name || 'this team'}
                    </strong>
                    , issue an official XPH tournament pass, create the 4-player roster, and dispatch the ticket email.
                  </p>
                </div>
              </div>

              {/* Summary Block */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tournament:</span>
                  <span className="text-white font-bold">{acceptingOrder.tournament_slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR / Trans ID:</span>
                  <span className="text-amber-300 font-mono font-bold">{acceptingOrder.utr_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verified Fee:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ₹{(acceptingOrder.amount_paise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isAccepting}
                  onClick={() => setAcceptingOrder(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isAccepting}
                  onClick={handleConfirmAccept}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirm & Accept
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. REJECT REASON DIALOG MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {rejectingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0C111D] border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">
                    Reject Payment Submission
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide a clear reason for rejecting the submission from{' '}
                    <strong className="text-white">
                      {rejectingOrder.registration_payload?.team_name || 'this team'}
                    </strong>
                    . The player will be notified of the reason.
                  </p>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quick Preset Reasons:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REJECTION_REASONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white transition text-left cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rejection Reason Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rejection Reason (Required):
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError('');
                  }}
                  placeholder="State why this submission was rejected..."
                  className="w-full bg-black/40 border border-white/10 focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none"
                />
                {rejectionError && (
                  <p className="text-xs font-bold text-rose-400">{rejectionError}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={() => {
                    setRejectingOrder(null);
                    setRejectionReason('');
                    setRejectionError('');
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRejecting}
                  onClick={handleConfirmReject}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-rose-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
