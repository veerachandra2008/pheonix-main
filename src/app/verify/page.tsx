'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  QrCode,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowLeft,
  CheckCircle2,
  ScanLine
} from 'lucide-react';

export default function TicketScannerGatePage() {
  const router = useRouter();
  const [passInput, setPassInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let cleaned = passInput.trim();
    if (!cleaned) {
      setErrorMsg('Please enter or scan a valid Ticket Pass ID');
      return;
    }

    // If a full verification URL was pasted/scanned (e.g. http://localhost:3000/verify/XPH-EC07E3ED)
    if (cleaned.includes('/verify/')) {
      const parts = cleaned.split('/verify/');
      cleaned = parts[parts.length - 1].split('?')[0].trim();
    }

    router.push(`/verify/${encodeURIComponent(cleaned)}`);
  };

  return (
    <main className="min-h-screen bg-[#070B14] text-white font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-zinc-950">
      {/* ── Top Header ── */}
      <header className="border-b border-white/10 bg-[#0C111D]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight">XENOVA</span>
              <span className="text-[10px] font-bold text-emerald-400 block -mt-1 uppercase tracking-wider">QR Scanner Gate</span>
            </div>
          </Link>

          <Link
            href="/tournaments"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to App
          </Link>
        </div>
      </header>

      {/* ── Scanner Card ── */}
      <div className="mx-auto max-w-md w-full px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-[#0C111D] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <ScanLine className="w-8 h-8 animate-pulse" />
            </div>

            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">
              Ticket Pass Scanner
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Scan a participant QR code or enter the unique Pass ID below to verify authentic entry status.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Ticket Pass ID / QR Code Value
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="e.g. XPH-EC07E3ED"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-black/50 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-sm font-mono tracking-widest placeholder:text-slate-600 outline-none uppercase font-bold"
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold mt-1.5">{errorMsg}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify Ticket Code
            </button>
          </form>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Test Codes:
            </span>
            <div className="flex flex-wrap gap-2">
              {['XPH-EC07E3ED', 'XPH-A101', 'XPH-B204'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => { setPassInput(code); router.push(`/verify/${code}`); }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-emerald-400 transition cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

        </motion.div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
        © 2026 Xenova Esports Platform · Ticket Integrity Engine
      </footer>
    </main>
  );
}
