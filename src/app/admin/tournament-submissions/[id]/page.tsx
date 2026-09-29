'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Globe2, 
  Clock, 
  FileText, 
  Download, 
  Send, 
  History, 
  Users, 
  Gamepad2, 
  Scale, 
  Lock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

export default function AdminSubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const subId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches' | 'rules' | 'audit'>('leaderboard');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Action Modals State
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadDetails = async () => {
    if (!subId) return;
    try {
      const res = await flaskApi.getAdminTournamentSubmissionDetails(subId);
      if (res && res.success) {
        setData(res);
      } else {
        showToast('error', res?.message || 'Failed to load submission details.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error fetching submission details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [subId]);

  // Request Changes Handler
  const handleConfirmRequestChanges = async () => {
    if (!changeReason.trim()) {
      showToast('error', 'Please provide a clear reason or instructions for the organizer.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await flaskApi.adminRequestChanges(subId, changeReason.trim());
      if (res && res.success) {
        showToast('success', 'Changes requested successfully! Organizer notified.');
        setShowRequestChangesModal(false);
        setChangeReason('');
        await loadDetails();
      } else {
        showToast('error', res?.message || 'Failed to request changes.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error requesting changes.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Results Handler
  const handleConfirmApprove = async () => {
    setActionLoading(true);
    try {
      const res = await flaskApi.adminApproveSubmission(subId);
      if (res && res.success) {
        showToast('success', 'Tournament results approved successfully! You can now publish to the public leaderboard.');
        setShowApproveModal(false);
        await loadDetails();
      } else {
        showToast('error', res?.message || 'Failed to approve submission.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error approving submission.');
    } finally {
      setActionLoading(false);
    }
  };

  // Publish Results Handler
  const handleConfirmPublish = async () => {
    setActionLoading(true);
    try {
      const res = await flaskApi.adminPublishSubmission(subId);
      if (res && res.success) {
        showToast('success', 'Tournament leaderboard successfully published to the public leaderboard!');
        setShowPublishModal(false);
        await loadDetails();
      } else {
        showToast('error', res?.message || 'Failed to publish results.');
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Error publishing results.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Submission Snapshot...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.submission) {
    return (
      <div className="p-10 text-center space-y-4 font-sans">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black uppercase text-white">Submission Not Found</h2>
        <p className="text-xs text-slate-400">The requested tournament submission could not be retrieved.</p>
        <Link
          href="/admin/tournament-submissions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Submissions
        </Link>
      </div>
    );
  }

  const { submission, tournament, audit_history = [], scoring_rules = [], frozen_snapshot = {} } = data;
  const status = (submission.status || tournament.status || 'SUBMITTED').toUpperCase();

  const standings: any[] = frozen_snapshot.standings || [];
  const matches: any[] = frozen_snapshot.matches || [];
  const columns: any[] = frozen_snapshot.columns || [];

  return (
    <div className="space-y-8 p-6 lg:p-10 font-sans relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-300'
                : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin/tournament-submissions"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-rose-400 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>

        {/* Action Controls for Admin */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Request Changes Button */}
          {status !== 'PUBLISHED' && (
            <button
              onClick={() => setShowRequestChangesModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              <AlertCircle className="h-4 w-4" />
              Request Changes
            </button>
          )}

          {/* 2. Approve Results Button */}
          {status === 'SUBMITTED' && (
            <button
              onClick={() => setShowApproveModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-950/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Results
            </button>
          )}

          {/* 3. Publish Results Button */}
          {status === 'APPROVED' && (
            <button
              onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              <Globe2 className="h-4 w-4" />
              Publish Results Publicly
            </button>
          )}

          {/* 4. Already Published Indicator */}
          {status === 'PUBLISHED' && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Globe2 className="h-4 w-4" /> Published to Public Leaderboard
            </span>
          )}
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0C111D] p-6 lg:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="h-3 w-3" /> {tournament.game || 'Free Fire'}
              </span>

              {status === 'SUBMITTED' && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Awaiting Review
                </span>
              )}

              {status === 'CHANGES_REQUESTED' && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" /> Changes Requested
                </span>
              )}

              {status === 'APPROVED' && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> Approved by Admin
                </span>
              )}

              {status === 'PUBLISHED' && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 className="h-3 w-3" /> Published Publicly
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              {tournament.title}
            </h1>

            <p className="text-xs text-slate-400">
              Submitted by <span className="text-slate-200 font-bold">{submission.submitted_by}</span> on{' '}
              <span className="text-slate-300 font-mono">
                {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}
              </span>
            </p>

            {submission.notes && (
              <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300">
                <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Organizer Submission Note:</span>
                "{submission.notes}"
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[90px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teams</p>
              <p className="text-2xl font-black text-white">{standings.length}</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center min-w-[90px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Matches</p>
              <p className="text-2xl font-black text-amber-300">{matches.length}</p>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-center min-w-[90px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Rules</p>
              <p className="text-2xl font-black text-indigo-300">{columns.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Changes Requested Banner if applicable */}
      {status === 'CHANGES_REQUESTED' && submission.change_request_reason && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-start gap-3 shadow-xl">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-rose-200">
              Changes Requested From Organizer
            </p>
            <p className="text-xs text-rose-200/90 font-mono">
              "{submission.change_request_reason}"
            </p>
            <p className="text-[10px] text-rose-300/70 mt-1">
              Tournament is currently unlocked for the organizer to correct scores and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/30'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Final Leaderboard Snapshot
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/30'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Gamepad2 className="h-4 w-4" />
          Match Breakdown ({matches.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/30'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Scale className="h-4 w-4" />
          Scoring Rules ({columns.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/30'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <History className="h-4 w-4" />
          Audit Trail ({audit_history.length})
        </button>
      </div>

      {/* ══════════════ TAB 1: FINAL FROZEN LEADERBOARD SNAPSHOT ══════════════ */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Server-Calculated Frozen Cumulative Standings
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Read-Only Snapshot (Immutable)
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C111D] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">Team & ID</th>
                    <th className="py-4 px-4">Captain Name</th>
                    <th className="py-4 px-4">Captain In-Game Name</th>
                    {matches.map((m: any, idx: number) => (
                      <th key={m.id} className="py-4 px-3 text-center">
                        {m.title || `Match ${m.match_number || idx + 1}`}
                      </th>
                    ))}
                    <th className="py-4 px-6 text-right font-black text-rose-400">Overall Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {standings.map((row: any) => {
                    const isExpanded = expandedTeamId === row.team_id;

                    return (
                      <React.Fragment key={row.team_id}>
                        <tr 
                          onClick={() => setExpandedTeamId(isExpanded ? null : row.team_id)}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center justify-center h-7 w-7 rounded-xl font-black text-xs ${
                              row.rank === 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : row.rank === 2
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                                : row.rank === 3
                                ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                                : 'bg-white/5 text-slate-400'
                            }`}>
                              #{row.rank}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <p className="font-bold text-white text-sm">{row.team_name}</p>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{row.team_id}</p>
                          </td>

                          <td className="py-4 px-4 text-slate-300">
                            {row.captain_name || '—'}
                          </td>

                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-bold font-mono text-[11px]">
                              {row.captain_in_game_name || '—'}
                            </span>
                          </td>

                          {matches.map((m: any) => {
                            const score = row.match_scores ? row.match_scores[m.id] : 0;
                            return (
                              <td key={m.id} className="py-4 px-3 text-center font-bold text-slate-300">
                                {score !== undefined ? score : '—'}
                              </td>
                            );
                          })}

                          <td className="py-4 px-6 text-right">
                            <span className="text-base font-black text-rose-400">
                              {row.overall_total} pts
                            </span>
                          </td>
                        </tr>

                        {/* Match Breakdown Expandable Row */}
                        {isExpanded && row.match_breakdowns && (
                          <tr className="bg-white/[0.01]">
                            <td colSpan={5 + matches.length} className="p-4 bg-[#090D16]/60 border-y border-white/5">
                              <div className="space-y-3 px-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                  Match-by-Match Raw Scores & Calculated Points for {row.team_name}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {matches.map((m: any) => {
                                    const bd = row.match_breakdowns[m.id];
                                    if (!bd) return null;
                                    return (
                                      <div key={m.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                                          <span className="font-bold text-slate-300 text-xs">{bd.match_title}</span>
                                          <span className="font-black text-rose-400 text-xs">{bd.total_points} pts</span>
                                        </div>
                                        <div className="space-y-1">
                                          {columns.map((col: any) => {
                                            const rawVal = bd.raw_scores ? bd.raw_scores[col.id] : 0;
                                            const calcPts = bd.calculated_scores ? bd.calculated_scores[col.id] : 0;
                                            return (
                                              <div key={col.id} className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">{col.name}:</span>
                                                <span className="text-slate-300 font-mono">
                                                  {rawVal} ( <span className="text-emerald-400 font-bold">{calcPts} pts</span> )
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB 2: MATCH-BY-MATCH BREAKDOWN ══════════════ */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          {matches.map((m: any, idx: number) => (
            <div key={m.id} className="rounded-3xl border border-white/10 bg-[#0C111D] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-black uppercase text-white">
                    {m.title || `Match ${m.match_number || idx + 1}`}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Match ID: {m.id}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] font-bold text-slate-300">
                  {standings.length} Teams Scored
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-4">Squad</th>
                      <th className="py-2.5 px-4">Captain IGN</th>
                      {columns.map((c: any) => (
                        <th key={c.id} className="py-2.5 px-3 text-center">{c.name}</th>
                      ))}
                      <th className="py-2.5 px-4 text-right">Match Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {standings.map((s: any) => {
                      const bd = s.match_breakdowns ? s.match_breakdowns[m.id] : null;
                      const rawScores = bd?.raw_scores || {};
                      const totalPts = bd?.total_points || 0;

                      return (
                        <tr key={s.team_id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 font-bold text-white">{s.team_name}</td>
                          <td className="py-2.5 px-4 text-emerald-400 font-mono text-[11px]">{s.captain_in_game_name}</td>
                          {columns.map((c: any) => (
                            <td key={c.id} className="py-2.5 px-3 text-center text-slate-300 font-mono">
                              {rawScores[c.id] !== undefined ? rawScores[c.id] : 0}
                            </td>
                          ))}
                          <td className="py-2.5 px-4 text-right font-black text-rose-400">{totalPts} pts</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ TAB 3: TOURNAMENT SCORING RULES ══════════════ */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {columns.map((rule: any) => (
              <div key={rule.id} className="p-5 rounded-2xl border border-white/10 bg-[#0C111D] space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="font-black uppercase text-sm text-white">{rule.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                    {rule.type}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Points Value:</span>
                    <span className="font-bold text-white">{rule.points_per_unit} pts</span>
                  </div>

                  {rule.type === 'PLACEMENT' && rule.placement_points && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Placement Points Matrix:
                      </span>
                      <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
                        {rule.placement_points.map((p: any) => (
                          <div key={p.placement} className="p-1 rounded bg-white/5 border border-white/5">
                            <span className="block text-slate-400">#{p.placement}</span>
                            <span className="font-bold text-emerald-400">{p.points} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TAB 4: AUDIT TRAIL ══════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0C111D] p-6 shadow-2xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-rose-500" />
              Complete Lifecycle Governance Audit Trail
            </h3>

            {audit_history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No audit records logged yet.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {audit_history.map((item: any, idx: number) => {
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })
                    : '—';

                  return (
                    <div key={item.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            item.action === 'APPROVED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.action === 'PUBLISHED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.action === 'CHANGES_REQUESTED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {item.action}
                          </span>
                          <span className="text-xs font-bold text-white">{item.performed_by}</span>
                        </div>
                        {item.reason && (
                          <p className="text-xs text-slate-400 italic mt-1 font-mono">
                            Reason: "{item.reason}"
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono shrink-0">
                        {dateStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 1: REQUEST CHANGES ══════════════ */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border border-rose-500/40 bg-[#0C111D] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Request Changes</h3>
                <p className="text-xs text-slate-400">Tournament will become editable by the organizer again.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Reason / Actionable Feedback <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Example: Match 2 result for Phoenix needs correction. Re-check fouls."
                rows={4}
                className="w-full p-3 rounded-xl border border-white/10 bg-black/40 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRequestChangesModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRequestChanges}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-black uppercase tracking-wider text-white transition shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                {actionLoading ? 'Transmitting...' : 'Send Changes Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 2: APPROVE SUBMISSION ══════════════ */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border border-amber-500/40 bg-[#0C111D] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Approve Results</h3>
                <p className="text-xs text-slate-400">Verify and officially endorse submitted standings.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to approve results for <strong className="text-white">{tournament.title}</strong>?
              Standings will remain securely frozen and ready for public publishing.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-black uppercase tracking-wider text-zinc-950 transition shadow-lg shadow-amber-950/40 cursor-pointer font-bold"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL 3: PUBLISH RESULTS ══════════════ */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl border border-emerald-500/40 bg-[#0C111D] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Globe2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Publish Results Live</h3>
                <p className="text-xs text-slate-400">Make tournament results public on Xenova Leaderboards.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will publish the approved results for <strong className="text-white">{tournament.title}</strong> to the public leaderboard. All players and spectators will be able to view the final standings, ranks, and match scores.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPublishModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-xs font-black uppercase tracking-wider text-zinc-950 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                {actionLoading ? 'Publishing...' : 'Confirm Public Publishing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
