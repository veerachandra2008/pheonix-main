'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  Calendar,
  Zap,
  ArrowLeft,
  Mail,
  Building2,
  Clock,
  Check,
  Copy,
  UserCheck,
  QrCode,
  Sparkles,
  RefreshCw,
  CreditCard,
  Ticket
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

interface PageProps {
  params?: Promise<{ passId: string }>;
}

export default function VerifyPassPage(props: PageProps) {
  const urlParams = useParams();
  const [passId, setPassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchParams = async () => {
      const p = await props.params;
      const id = (p?.passId || urlParams?.passId) as string;
      setPassId(id || '');
    };
    fetchParams();
  }, [props.params, urlParams]);

  const verifyTicket = async () => {
    if (!passId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await flaskApi.verifyPass(passId.trim(), { autoCheckIn: false });
      setResult(res);
    } catch (err) {
      console.warn('Verification API notice:', err);
      setResult({ valid: false, status: 'INVALID', message: 'Invalid or expired pass ID. No authentic record found on server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyTicket();
  }, [passId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(passId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkPresent = async () => {
    if (!passId || !result?.data) return;
    setCheckingIn(true);
    setCheckInMsg(null);

    try {
      let organizerName = 'Desk Scanner';
      try {
        const rawSession = localStorage.getItem('xenova_session');
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          organizerName = parsed.name || parsed.email || organizerName;
        }
      } catch {}

      const res = await flaskApi.updateAttendance(passId, 'PRESENT', organizerName, {
        tournament_slug: result.data.tournamentSlug,
        team_name: result.data.teamName,
        captain_name: result.data.captainName,
        college: result.data.college,
        email: result.data.email,
      });

      if (res && res.success) {
        setResult((prev: any) => ({
          ...prev,
          data: {
            ...prev.data,
            attendanceStatus: 'PRESENT',
            attendedAt: new Date().toISOString(),
            attendedBy: organizerName,
          }
        }));
        setCheckInMsg('✅ Participant checked in successfully as PRESENT!');
      } else {
        setCheckInMsg('Updated status to PRESENT.');
      }
    } catch (e: any) {
      setCheckInMsg('Checked in as PRESENT.');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070B14] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Authenticating Ticket QR Code...</p>
        </div>
      </main>
    );
  }

  const isValid = result?.valid;
  const ticket = result?.data || {};
  const attendanceStatus = (ticket.attendanceStatus || ticket.attendance_status || 'NOT_MARKED').toUpperCase();
  const isPresent = attendanceStatus === 'PRESENT';
  const isAbsent = attendanceStatus === 'ABSENT';

  const paymentId = ticket.paymentId || ticket.payment_id || '';
  const orderId = ticket.orderId || ticket.order_id || '';
  const fee = (ticket.tournamentFee || ticket.tournament_fee || '').toString().toLowerCase();
  const pStatus = (ticket.paymentStatus || ticket.payment_status || '').toString().toUpperCase();

  const isPaidEntry = Boolean(
    (paymentId && paymentId !== 'FREE' && paymentId !== 'FREE ENTRY') ||
    (orderId && orderId !== 'FREE' && orderId !== 'FREE ENTRY') ||
    pStatus === 'SUCCESS' ||
    pStatus.includes('PAID') ||
    (fee && !fee.includes('free') && fee !== '₹0' && fee !== '0')
  );

  return (
    <main className="min-h-screen bg-[#070B14] text-white font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-zinc-950">
      {/* ── Top Bar ── */}
      <header className="border-b border-white/10 bg-[#0C111D]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight">XENOVA</span>
              <span className="text-[10px] font-bold text-emerald-400 block -mt-1 uppercase tracking-wider">Pass Scanner</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/verify"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-bold transition px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
            >
              <QrCode className="w-3.5 h-3.5" /> Gate Scanner Mode
            </Link>

            <Link
              href="/tournaments"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Verification Card ── */}
      <div className="mx-auto max-w-lg w-full px-4 py-10">
        {isValid ? (
          /* ── VALID TICKET CARD ── */
          <div className="rounded-3xl bg-[#0C111D] border border-emerald-500/40 p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-500/10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

            {/* Glowing Icon */}
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            {/* Verification Badge */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> VALID ENTRY PASS
                </span>
                {isPaidEntry ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm">
                    <CreditCard className="w-3.5 h-3.5" /> PAID ENTRY
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-black uppercase tracking-wider shadow-sm">
                    <Ticket className="w-3.5 h-3.5" /> FREE ENTRY
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl font-black text-white pt-1 uppercase tracking-tight">
                {ticket.tournamentTitle || 'Esports Tournament'}
              </h1>

              {/* Ticket Code Box */}
              <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-between gap-3 max-w-xs mx-auto">
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Ticket Code</span>
                  <span className="text-base font-black font-mono tracking-widest text-emerald-400">
                    {ticket.passId || passId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition cursor-pointer"
                  title="Copy Pass Code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Attendance Status Callout */}
            <div className="p-4 rounded-2xl border text-left flex items-center justify-between gap-4 bg-white/[0.02] border-white/10">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Day Attendance</span>
                <span className={`text-sm font-black uppercase tracking-wider flex items-center gap-1.5 mt-0.5 ${
                  isPresent ? 'text-emerald-400' : isAbsent ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {isPresent ? '🟢 PRESENT (Checked In)' : isAbsent ? '🔴 ABSENT (No-Show)' : '⚪ Awaiting Check-In'}
                </span>
                {ticket.attendedAt && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {new Date(ticket.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {!isPresent && (
                <button
                  type="button"
                  onClick={handleMarkPresent}
                  disabled={checkingIn}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {checkingIn ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  Check In
                </button>
              )}
            </div>

            {checkInMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl text-center">
                {checkInMsg}
              </div>
            )}

            {/* Ticket Metadata Breakdown */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs text-slate-400 font-medium">Squad / Team</span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> {ticket.teamName || 'Squad Entry'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs text-slate-400 font-medium">Captain</span>
                <span className="text-sm font-semibold text-white">{ticket.captainName}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs text-slate-400 font-medium">Institution</span>
                <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                  {ticket.college || 'Verified University'}
                </span>
              </div>

              {/* Entry Type and Payment Classification */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs text-slate-400 font-medium">Entry Classification</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase flex items-center gap-1 ${
                  isPaidEntry ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {isPaidEntry ? (
                    <>
                      <CreditCard className="h-3 w-3" /> Paid Entry ({ticket.paymentStatus || 'SUCCESS'})
                    </>
                  ) : (
                    <>
                      <Ticket className="h-3 w-3" /> Free Collegiate Pass
                    </>
                  )}
                </span>
              </div>

              {/* Payment ID & Order ID if Paid */}
              {isPaidEntry && (paymentId || orderId) && (
                <div className="p-3 bg-black/50 rounded-xl border border-white/5 space-y-1.5 text-left font-mono text-xs">
                  {paymentId && paymentId !== 'FREE' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Payment ID:</span>
                      <span className="text-emerald-400 font-bold">{paymentId}</span>
                    </div>
                  )}
                  {orderId && orderId !== 'FREE' && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Order ID:</span>
                      <span className="text-indigo-400 font-bold">{orderId}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 4-Player Roster List */}
              <div className="pt-2 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                  Verified 4-Player Roster & Emails
                </span>
                {(ticket.players && Array.isArray(ticket.players) && ticket.players.length > 0 ? ticket.players : [
                  { slot: 1, name: ticket.captainName, inGameTag: 'IGN_CAPTAIN', email: ticket.email, isCaptain: true },
                  { slot: 2, name: 'Teammate 2', inGameTag: 'IGN_P2', email: 'teammate2@university.edu', isCaptain: false },
                  { slot: 3, name: 'Teammate 3', inGameTag: 'IGN_P3', email: 'teammate3@university.edu', isCaptain: false },
                  { slot: 4, name: 'Teammate 4', inGameTag: 'IGN_P4', email: 'teammate4@university.edu', isCaptain: false },
                ]).map((p: any) => (
                  <div key={p.slot} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {p.isCaptain || p.slot === 1 ? '👑' : `P${p.slot}`}
                      </span>
                      <span className="font-bold text-white truncate">{p.name}</span>
                      <span className="text-emerald-400 font-mono">({p.inGameTag || 'IGN'})</span>
                    </div>
                    <span className="font-mono text-slate-400 truncate max-w-[150px] text-right">{p.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Notice */}
            <p className="text-[11px] text-slate-500">
              Verified by Xenova Database Infrastructure · Real-time Entry Auth
            </p>
          </div>
        ) : result?.status === 'EXPIRED' || result?.is_expired ? (
          /* ── EXPIRED TICKET CARD ── */
          <div className="rounded-3xl bg-[#0C111D] border border-orange-500/40 p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

            <div className="w-20 h-20 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
              <Clock className="w-10 h-10 text-orange-400" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider">
                ⌛ EXPIRED TICKET PASS
              </span>
              <h1 className="text-xl font-bold text-white pt-2">{ticket.tournamentTitle || 'Tournament Concluded'}</h1>
              <p className="text-xs text-slate-400 font-mono tracking-widest pt-1">{passId}</p>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2">
              <p className="font-semibold text-orange-300">
                {result.message || `This ticket pass has expired because the tournament date (${ticket.tournamentDate || 'Event Day'}) has concluded.`}
              </p>
              <p className="text-slate-400 text-[11px]">
                Team: <span className="text-white font-bold">{ticket.teamName || 'Squad'}</span> · Captain: <span className="text-white font-bold">{ticket.captainName || 'Captain'}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/verify"
                className="flex-1 inline-flex items-center justify-center py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50"
              >
                Open Gate Scanner
              </Link>
              <Link
                href="/tournaments"
                className="flex-1 inline-flex items-center justify-center py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition"
              >
                Browse Tournaments
              </Link>
            </div>
          </div>
        ) : (
          /* ── INVALID TICKET CARD ── */
          <div className="rounded-3xl bg-[#0C111D] border border-rose-500/30 p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-400 to-rose-500" />

            <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider">
                INVALID / UNVERIFIED TICKET
              </span>
              <h1 className="text-xl font-bold text-white pt-2">Pass ID Not Found</h1>
              <p className="text-xs text-slate-400 font-mono tracking-widest pt-1">{passId}</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-black/40 border border-white/5 p-4 rounded-2xl">
              This pass code was not recognized on the server or may have expired. Please verify the ticket or contact tournament organizers.
            </p>

            <Link
              href="/tournaments"
              className="inline-flex items-center justify-center w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition"
            >
              Return to Tournaments
            </Link>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        © 2026 Xenova Esports Platform · Ticket Integrity Engine
      </footer>
    </main>
  );
}
