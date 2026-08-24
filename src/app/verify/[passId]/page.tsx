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
  Lock,
} from 'lucide-react';

interface PageProps {
  params?: Promise<{ passId: string }>;
}

export default function VerifyPassPage({ params }: PageProps) {
  const routeParams = useParams();
  const passId = (routeParams?.passId as string) || '';
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function verifyTicket() {
      if (!passId) {
        setLoading(false);
        return;
      }

      // 1. Try Backend API
      try {
        setLoading(true);
        const apiBase =
          typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? '/api'
            : process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

        const res = await fetch(`${apiBase}/registrations/verify/${passId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.valid) {
            setResult(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Verification API notice:', err);
      }

      setResult({ valid: false, message: 'Invalid or expired pass ID. No authentic record found on server.' });
      setLoading(false);
    }

    verifyTicket();
  }, [passId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm font-medium">Verifying Ticket Pass ID with Server...</p>
        </div>
      </main>
    );
  }

  const isValid = result?.valid;
  const ticket = result?.data || {};

  return (
    <main className="min-h-screen bg-[#09090b] text-white font-sans flex flex-col justify-between">
      {/* ── Top Bar ── */}
      <header className="border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-black text-white tracking-tight">XENOVA SCANNER</span>
          </Link>

          <Link
            href="/tournaments"
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to App
          </Link>
        </div>
      </header>

      {/* ── Main Verification Card ── */}
      <div className="mx-auto max-w-lg w-full px-4 py-12">
        {isValid ? (
          /* ── VALID TICKET CARD ── */
          <div className="rounded-3xl bg-[#111115] border border-emerald-500/30 p-8 space-y-6 shadow-2xl shadow-emerald-500/10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

            {/* Glowing Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            {/* Verification Badge */}
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> VALID ENTRY PASS
              </span>
              <h1 className="text-2xl font-black text-white pt-2">{ticket.tournamentTitle || 'Esports Tournament'}</h1>
              <p className="text-xs text-zinc-400 font-mono tracking-widest pt-1">ID: {ticket.passId || passId}</p>
            </div>

            {/* Ticket Metadata Breakdown */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-500 font-medium">Squad Name</span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> {ticket.teamName}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-500 font-medium">Captain</span>
                <span className="text-sm font-semibold text-white">{ticket.captainName}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-500 font-medium">Institution</span>
                <span className="text-sm font-semibold text-white truncate max-w-[200px]">
                  {ticket.college || 'Verified University'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-500 font-medium">Email</span>
                <span className="text-xs font-mono text-zinc-300 truncate max-w-[200px]">{ticket.email}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-zinc-500 font-medium">Payment Status</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase">
                  {ticket.paymentStatus || 'VERIFIED'}
                </span>
              </div>
            </div>

            {/* Footer Notice */}
            <p className="text-[11px] text-zinc-500">
              Verified by Xenova Database Infrastructure · Real-time Entry Auth
            </p>
          </div>
        ) : (
          /* ── INVALID TICKET CARD ── */
          <div className="rounded-3xl bg-[#111115] border border-red-500/30 p-8 space-y-6 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-400 to-red-500" />

            <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider">
                INVALID / UNVERIFIED TICKET
              </span>
              <h1 className="text-xl font-bold text-white pt-2">Pass ID Not Found</h1>
              <p className="text-xs text-zinc-400 font-mono tracking-widest pt-1">{passId}</p>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed bg-white/[0.03] border border-white/[0.06] p-4 rounded-2xl">
              This pass ID is not recognized by our server or may have been revoked. Please check the ticket or re-register.
            </p>

            <Link
              href="/tournaments"
              className="inline-flex items-center justify-center w-full py-3.5 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition"
            >
              Return to Tournaments
            </Link>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-zinc-600">
        © 2026 Xenova Esports Platform · Ticket Integrity Engine
      </footer>
    </main>
  );
}
