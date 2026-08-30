'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  ScanLine,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Vibrate,
  UserCheck,
  CreditCard,
  Ticket,
  Users,
  Building2,
  Clock,
  RefreshCw,
  Sparkles,
  Zap,
  Check,
  History,
  X
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { extractPassId, playScanSound, triggerScanHaptic } from '@/lib/qr-scanner-engine';

// Lazy-load the heavy camera scanner component only when scanner mode is activated
const ContinuousQRScanner = dynamic(
  () => import('@/components/xenova/ContinuousQRScanner').then((mod) => mod.ContinuousQRScanner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] sm:aspect-video rounded-3xl bg-black border border-white/10 flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Optical Scanner Engine...</p>
      </div>
    ),
  }
);

interface ScanHistoryItem {
  id: string;
  passId: string;
  teamName: string;
  captainName: string;
  status: 'VERIFIED' | 'ALREADY_CHECKED_IN' | 'INVALID';
  timestamp: string;
  paymentStatus?: string;
  isPaid?: boolean;
}

export default function EntranceGateVerificationPage() {
  // Mode selection: 'scanner' (camera) vs 'manual' (text input)
  const [activeMode, setActiveMode] = useState<'scanner' | 'manual'>('scanner');

  // Manual input state
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');

  // Scanner settings
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Active verification result state
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    valid: boolean;
    status: 'VERIFIED' | 'ALREADY_CHECKED_IN' | 'INVALID';
    passId: string;
    message?: string;
    data?: any;
    scannedAt: string;
  } | null>(null);

  // Auto-advance progress timer (3.0 seconds)
  const [countdownPercent, setCountdownPercent] = useState(100);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Shift scan session history
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Active organizer info
  const [organizerName, setOrganizerName] = useState('Gate Marshal');

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        setOrganizerName(parsed.name || parsed.email || 'Gate Marshal');
      }
    } catch {}
  }, []);

  // Clear auto-advance timer on unmount or manual advance
  const clearAutoAdvanceTimers = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Dismiss result and immediately return to active scanning
  const handleDismissResult = useCallback(() => {
    clearAutoAdvanceTimers();
    setCurrentResult(null);
    setCountdownPercent(100);
  }, [clearAutoAdvanceTimers]);

  // Start smooth auto-advance countdown (3.0 seconds)
  const startAutoAdvanceCountdown = useCallback((durationMs: number = 3200) => {
    clearAutoAdvanceTimers();
    const startTime = Date.now();
    setCountdownPercent(100);

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingRatio = Math.max(0, 1 - elapsed / durationMs);
      setCountdownPercent(remainingRatio * 100);

      if (remainingRatio <= 0) {
        clearAutoAdvanceTimers();
      }
    }, 50);

    autoAdvanceTimerRef.current = setTimeout(() => {
      setCurrentResult(null);
      setCountdownPercent(100);
    }, durationMs);
  }, [clearAutoAdvanceTimers]);

  // ----------------------------------------------------
  // CORE VERIFICATION HANDLER (Single Lightweight Request)
  // ----------------------------------------------------
  const processPassVerification = async (rawCode: string) => {
    const passId = extractPassId(rawCode);
    if (!passId) {
      if (activeMode === 'manual') {
        setManualError('Please enter a valid Ticket Pass ID (e.g. XNV-8F42K1 or XPH-EC07E3ED)');
      }
      return;
    }

    // Ignore if currently processing
    if (isVerifying) return;

    clearAutoAdvanceTimers();
    setIsVerifying(true);
    setManualError('');

    try {
      const result = await flaskApi.verifyPass(passId, {
        autoCheckIn: autoCheckIn,
        attendedBy: organizerName,
      });

      const nowIso = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const status = result.status;
      const ticketData = result.data || {};

      // Play Sound & Haptic Feedback based on exact status
      if (soundEnabled) {
        if (status === 'VERIFIED') playScanSound('success');
        else if (status === 'ALREADY_CHECKED_IN') playScanSound('warning');
        else playScanSound('error');
      }

      if (hapticsEnabled) {
        if (status === 'VERIFIED') triggerScanHaptic('success');
        else if (status === 'ALREADY_CHECKED_IN') triggerScanHaptic('warning');
        else triggerScanHaptic('error');
      }

      // Record in session scan history
      const paymentStatus = (ticketData.paymentStatus || ticketData.payment_status || '').toString().toUpperCase();
      const pId = ticketData.paymentId || ticketData.payment_id || '';
      const isPaid = paymentStatus === 'SUCCESS' || paymentStatus.includes('PAID') || (pId && pId !== 'FREE');

      setScanHistory((prev) => [
        {
          id: `${passId}-${Date.now()}`,
          passId: passId,
          teamName: ticketData.teamName || ticketData.team_name || 'Squad Entry',
          captainName: ticketData.captainName || ticketData.captain_name || 'Player',
          status: status,
          timestamp: nowIso,
          paymentStatus: paymentStatus || (result.valid ? 'VERIFIED' : 'INVALID'),
          isPaid,
        },
        ...prev.slice(0, 49), // Keep latest 50 scans
      ]);

      // Set active result card
      setCurrentResult({
        valid: result.valid,
        status: status,
        passId: passId,
        message: result.message,
        data: ticketData,
        scannedAt: nowIso,
      });

      // Start auto-advance countdown (3.2s for VERIFIED, 3.5s for ALREADY_CHECKED_IN, 3.0s for INVALID)
      const duration = status === 'ALREADY_CHECKED_IN' ? 3800 : 3200;
      startAutoAdvanceCountdown(duration);
    } catch (err: any) {
      console.warn('Verification execution error:', err);
      if (soundEnabled) playScanSound('error');
      if (hapticsEnabled) triggerScanHaptic('error');

      setCurrentResult({
        valid: false,
        status: 'INVALID',
        passId: passId,
        message: err.message || 'Verification request failed. Please check network connection.',
        scannedAt: new Date().toLocaleTimeString(),
      });
      startAutoAdvanceCountdown(3500);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Manual Form Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setManualError('Please enter a ticket code');
      return;
    }
    processPassVerification(manualInput.trim());
  };

  // Keyboard shortcut: Press Escape or Space to advance to next scan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentResult && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) {
        handleDismissResult();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentResult, handleDismissResult]);

  // Session Statistics
  const totalScanned = scanHistory.length;
  const verifiedCount = scanHistory.filter((s) => s.status === 'VERIFIED').length;
  const alreadyCount = scanHistory.filter((s) => s.status === 'ALREADY_CHECKED_IN').length;
  const invalidCount = scanHistory.filter((s) => s.status === 'INVALID').length;

  return (
    <main className="min-h-screen bg-[#070B14] text-white font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-zinc-950">
      {/* ── Top Header Bar ── */}
      <header className="border-b border-white/10 bg-[#0C111D]/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                  XENOVA <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">GATE</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 block -mt-0.5 uppercase tracking-wider">
                  Entrance QR Scanner
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Shift History Log Button */}
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition font-semibold cursor-pointer"
              title="View shift scan log"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Shift Log</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                {totalScanned}
              </span>
            </button>

            <Link
              href="/tournaments"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition px-3 py-1.5 rounded-xl bg-white/5 border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Scanner Workspace ── */}
      <div className="mx-auto max-w-xl w-full px-4 py-6 sm:py-8 flex-1 flex flex-col justify-start">
        {/* ── Mode Toggle Tabs: Camera Scanner vs Manual Input ── */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#0C111D] rounded-2xl border border-white/10 mb-5 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setActiveMode('scanner');
              setManualError('');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMode === 'scanner'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Camera className="w-4 h-4" />
            Live Camera Scanner
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              setManualError('');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual Ticket ID
          </button>
        </div>

        {/* ── Scanner Options Strip (Auto-Check-In, Audio, Vibration) ── */}
        <div className="flex items-center justify-between p-3 bg-[#0C111D] border border-white/10 rounded-2xl mb-4 text-xs">
          {/* Auto Check-in Toggle */}
          <button
            type="button"
            onClick={() => setAutoCheckIn(!autoCheckIn)}
            className="flex items-center gap-2 cursor-pointer text-left select-none"
          >
            <div
              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                autoCheckIn ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  autoCheckIn ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </div>
            <div>
              <span className="font-bold text-white block text-[11px]">Auto Check-In</span>
              <span className="text-[9px] text-slate-400 font-medium">Mark PRESENT on valid scan</span>
            </div>
          </button>

          {/* Sound & Haptic Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
              title={soundEnabled ? 'Sound alert enabled' : 'Sound alert muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                hapticsEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
              title={hapticsEnabled ? 'Haptic vibration enabled' : 'Haptic vibration disabled'}
            >
              <Vibrate className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Active Scanning View / Fallback Input ── */}
        <div className="relative">
          {activeMode === 'scanner' ? (
            /* ── PERSISTENT CONTINUOUS CAMERA SCANNER ── */
            <div className="space-y-4">
              <ContinuousQRScanner
                onScan={processPassVerification}
                isProcessing={isVerifying}
                activePassId={currentResult?.passId}
                onSwitchToManual={() => setActiveMode('manual')}
                cooldownMs={3500}
              />
            </div>
          ) : (
            /* ── MANUAL TICKET ID INPUT FALLBACK ── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-[#0C111D] border border-white/10 space-y-5 shadow-2xl"
            >
              <div className="text-left space-y-1">
                <h2 className="text-base font-black uppercase tracking-wider text-white">Manual Pass Lookup</h2>
                <p className="text-xs text-slate-400 font-medium">
                  Enter participant ticket pass ID (e.g. XNV-8F42K1 or XPH-EC07E3ED)
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value);
                      setManualError('');
                    }}
                    placeholder="Enter Ticket ID (e.g. XPH-EC07E3ED)"
                    autoFocus
                    className="w-full px-4 py-3.5 bg-black/60 border border-white/15 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl text-white text-sm font-mono tracking-widest placeholder:text-slate-600 outline-none uppercase font-bold"
                  />
                </div>

                {manualError && (
                  <p className="text-xs text-rose-400 font-semibold">{manualError}</p>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || !manualInput.trim()}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Verifying Pass...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Verify Ticket ID
                    </>
                  )}
                </button>
              </form>

              {/* Quick Desk Test Buttons */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-left space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Test Passes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['XPH-EC07E3ED', 'XPH-A101', 'XPH-B204', 'XPH-C309'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setManualInput(code);
                        processPassVerification(code);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-emerald-400 transition cursor-pointer"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LIVE VERIFICATION RESULT MODAL / OVERLAY CARD ── */}
          <AnimatePresence>
            {currentResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-3xl overflow-hidden shadow-2xl border relative z-20"
                style={{
                  backgroundColor: '#0C111D',
                  borderColor:
                    currentResult.status === 'VERIFIED'
                      ? 'rgba(16, 185, 129, 0.5)'
                      : currentResult.status === 'ALREADY_CHECKED_IN'
                      ? 'rgba(245, 158, 11, 0.5)'
                      : 'rgba(244, 63, 94, 0.5)',
                }}
              >
                {/* Glowing Top Stripe */}
                <div
                  className="h-1.5 w-full"
                  style={{
                    backgroundColor:
                      currentResult.status === 'VERIFIED'
                        ? '#10b981'
                        : currentResult.status === 'ALREADY_CHECKED_IN'
                        ? '#f59e0b'
                        : '#f43f5e',
                  }}
                />

                {/* Auto-Advance Countdown Progress Bar */}
                <div className="h-1 bg-white/10 w-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-75 ease-linear"
                    style={{
                      width: `${countdownPercent}%`,
                      backgroundColor:
                        currentResult.status === 'VERIFIED'
                          ? '#10b981'
                          : currentResult.status === 'ALREADY_CHECKED_IN'
                          ? '#f59e0b'
                          : '#f43f5e',
                    }}
                  />
                </div>

                <div className="p-6 sm:p-7 text-center space-y-5">
                  {/* Status Glowing Icon Badge */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
                      style={{
                        backgroundColor:
                          currentResult.status === 'VERIFIED'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : currentResult.status === 'ALREADY_CHECKED_IN'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(244, 63, 94, 0.15)',
                        border:
                          currentResult.status === 'VERIFIED'
                            ? '1px solid rgba(16, 185, 129, 0.4)'
                            : currentResult.status === 'ALREADY_CHECKED_IN'
                            ? '1px solid rgba(245, 158, 11, 0.4)'
                            : '1px solid rgba(244, 63, 94, 0.4)',
                        color:
                          currentResult.status === 'VERIFIED'
                            ? '#34d399'
                            : currentResult.status === 'ALREADY_CHECKED_IN'
                            ? '#fbbf24'
                            : '#fb7185',
                      }}
                    >
                      {currentResult.status === 'VERIFIED' && <CheckCircle2 className="w-9 h-9" />}
                      {currentResult.status === 'ALREADY_CHECKED_IN' && <AlertTriangle className="w-9 h-9" />}
                      {currentResult.status === 'INVALID' && <XCircle className="w-9 h-9" />}
                    </div>

                    {/* Status Title Banner */}
                    <div className="space-y-1">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            currentResult.status === 'VERIFIED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : currentResult.status === 'ALREADY_CHECKED_IN'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(244, 63, 94, 0.15)',
                          color:
                            currentResult.status === 'VERIFIED'
                              ? '#34d399'
                              : currentResult.status === 'ALREADY_CHECKED_IN'
                              ? '#fbbf24'
                              : '#fb7185',
                        }}
                      >
                        {currentResult.status === 'VERIFIED' && '✅ VERIFIED ENTRY PASS'}
                        {currentResult.status === 'ALREADY_CHECKED_IN' && '⚠️ ALREADY CHECKED IN'}
                        {currentResult.status === 'INVALID' && '❌ INVALID / UNKNOWN PASS'}
                      </span>

                      {/* Pass ID Display */}
                      <div className="pt-1">
                        <span className="font-mono text-lg sm:text-xl font-black text-white tracking-widest">
                          {currentResult.passId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Details Breakdown */}
                  {currentResult.valid && currentResult.data && (
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                      {/* Team & Captain */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-slate-400 font-medium">Team Squad:</span>
                        <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          {currentResult.data.teamName || currentResult.data.team_name || 'Squad Entry'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-slate-400 font-medium">Captain:</span>
                        <span className="font-semibold text-white">
                          {currentResult.data.captainName || currentResult.data.captain_name || 'Squad Captain'}
                        </span>
                      </div>

                      {/* Tournament & College */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-slate-400 font-medium">Tournament:</span>
                        <span className="font-semibold text-white truncate max-w-[200px]">
                          {currentResult.data.tournamentTitle || currentResult.data.tournament_title || 'Championship'}
                        </span>
                      </div>

                      {/* Attendance Status Badge */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400 font-medium">Attendance:</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[11px] flex items-center gap-1 ${
                            currentResult.status === 'ALREADY_CHECKED_IN'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          <Check className="w-3 h-3" /> PRESENT (Checked In)
                        </span>
                      </div>

                      {/* Check-in Timestamp / Marshal */}
                      {currentResult.status === 'ALREADY_CHECKED_IN' && currentResult.data.attendedAt && (
                        <div className="p-2.5 bg-amber-950/30 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] text-center font-medium mt-1">
                          Checked in previously at {new Date(currentResult.data.attendedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invalid Reason */}
                  {!currentResult.valid && (
                    <div className="p-4 bg-rose-950/30 border border-rose-500/20 rounded-2xl text-rose-300 text-xs font-medium text-center">
                      {currentResult.message || 'Pass ID not found on database. Ticket may be expired or invalid.'}
                    </div>
                  )}

                  {/* ── BIG PROMINENT [ NEXT SCAN ] ACTION BUTTON ── */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDismissResult}
                      autoFocus
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition shadow-xl shadow-emerald-950/80 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
                    >
                      <ScanLine className="w-5 h-5" />
                      NEXT SCAN (Space / Tap)
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-slate-500 font-medium mt-2">
                      Auto-rearming in a moment or tap above to scan immediately
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Entrance Shift Quick Summary Counters ── */}
        <div className="grid grid-cols-4 gap-2 pt-6">
          <div className="p-3 bg-[#0C111D] border border-white/10 rounded-2xl text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Scans</span>
            <span className="text-base font-black font-mono text-white">{totalScanned}</span>
          </div>

          <div className="p-3 bg-[#0C111D] border border-emerald-500/20 rounded-2xl text-center">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Checked In</span>
            <span className="text-base font-black font-mono text-emerald-400">{verifiedCount}</span>
          </div>

          <div className="p-3 bg-[#0C111D] border border-amber-500/20 rounded-2xl text-center">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Already In</span>
            <span className="text-base font-black font-mono text-amber-400">{alreadyCount}</span>
          </div>

          <div className="p-3 bg-[#0C111D] border border-rose-500/20 rounded-2xl text-center">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Invalid</span>
            <span className="text-base font-black font-mono text-rose-400">{invalidCount}</span>
          </div>
        </div>
      </div>

      {/* ── Shift Scan Log Modal ── */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[#0C111D] border border-white/15 p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black uppercase text-white tracking-wider">Gate Session Log</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* History Table */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {scanHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No tickets scanned in this session yet.
                  </div>
                ) : (
                  scanHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{item.passId}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                              item.status === 'VERIFIED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : item.status === 'ALREADY_CHECKED_IN'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.teamName} · {item.captainName}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                        {item.timestamp}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Close Log
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © 2026 Xenova Esports Platform · High-Speed Gate Check-In Engine
      </footer>
    </main>
  );
}
