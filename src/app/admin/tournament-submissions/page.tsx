'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  Clock, 
  Users, 
  Gamepad2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Globe2, 
  ShieldAlert,
  Calendar,
  Layers
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

interface SubmissionItem {
  id: string;
  tournament_id: string;
  tournament_name: string;
  game: string;
  organizer: string;
  submitted_at: string;
  num_teams: number;
  num_matches: number;
  status: 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED' | string;
  notes?: string;
  approved_at?: string;
  approved_by?: string;
  published_at?: string;
  published_by?: string;
  change_request_reason?: string;
}

export default function AdminTournamentSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED'>('ALL');

  const loadSubmissions = async () => {
    try {
      const res = await flaskApi.getAdminTournamentSubmissions();
      if (res && res.success && Array.isArray(res.submissions)) {
        setSubmissions(res.submissions);
      }
    } catch (e) {
      console.error('Failed to load submissions:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesSearch = 
        (sub.tournament_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (sub.tournament_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (sub.organizer || '').toLowerCase().includes(search.toLowerCase()) ||
        (sub.game || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || sub.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: submissions.length,
      submitted: submissions.filter((s) => s.status?.toUpperCase() === 'SUBMITTED').length,
      changes_requested: submissions.filter((s) => s.status?.toUpperCase() === 'CHANGES_REQUESTED').length,
      approved: submissions.filter((s) => s.status?.toUpperCase() === 'APPROVED').length,
      published: submissions.filter((s) => s.status?.toUpperCase() === 'PUBLISHED').length,
    };
  }, [submissions]);

  const getStatusBadge = (status: string) => {
    const upper = (status || 'SUBMITTED').toUpperCase();
    switch (upper) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <Clock className="h-3 w-3" /> Awaiting Review
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <AlertCircle className="h-3 w-3" /> Changes Requested
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <CheckCircle2 className="h-3 w-3" /> Approved • Ready to Publish
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Globe2 className="h-3 w-3" /> Published Live
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 border border-white/20 text-slate-300">
            {upper}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/30 text-rose-400">
              Admin Governance
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Trophy className="h-8 w-8 text-rose-500" />
            Tournament Results Review
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Audit, verify, approve, and publicly publish finalized tournament leaderboards submitted by organizers.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider text-slate-200 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
          Refresh Submissions
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg shadow-rose-950/20'
              : 'bg-[#0C111D] border-white/10 hover:border-white/20 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">All Submissions</p>
          <p className="text-2xl font-black text-white mt-1">{counts.all}</p>
        </button>

        <button
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'SUBMITTED'
              ? 'bg-purple-500/10 border-purple-500/40 text-white shadow-lg shadow-purple-950/20'
              : 'bg-[#0C111D] border-white/10 hover:border-white/20 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Awaiting Review</p>
          <p className="text-2xl font-black text-purple-300 mt-1">{counts.submitted}</p>
        </button>

        <button
          onClick={() => setStatusFilter('CHANGES_REQUESTED')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'CHANGES_REQUESTED'
              ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg shadow-rose-950/20'
              : 'bg-[#0C111D] border-white/10 hover:border-white/20 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Changes Requested</p>
          <p className="text-2xl font-black text-rose-300 mt-1">{counts.changes_requested}</p>
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-lg shadow-amber-950/20'
              : 'bg-[#0C111D] border-white/10 hover:border-white/20 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Approved</p>
          <p className="text-2xl font-black text-amber-300 mt-1">{counts.approved}</p>
        </button>

        <button
          onClick={() => setStatusFilter('PUBLISHED')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'PUBLISHED'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-950/20'
              : 'bg-[#0C111D] border-white/10 hover:border-white/20 text-slate-400'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Published Live</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{counts.published}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tournament name, slug, organizer email, or game..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/10 bg-[#0C111D] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500/50 transition"
          />
        </div>
      </div>

      {/* Table of Submissions */}
      <div className="rounded-3xl border border-white/10 bg-[#0C111D] overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShieldAlert className="h-12 w-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-black uppercase tracking-tight text-white">No Submissions Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {statusFilter !== 'ALL'
                ? `There are currently no tournaments with status '${statusFilter}'.`
                : 'No tournament leaderboards have been submitted for admin review yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-4 px-6">Tournament</th>
                  <th className="py-4 px-4">Game</th>
                  <th className="py-4 px-4">Organizer</th>
                  <th className="py-4 px-4">Submitted At</th>
                  <th className="py-4 px-4 text-center">Teams</th>
                  <th className="py-4 px-4 text-center">Matches</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredSubmissions.map((sub) => {
                  const dateStr = sub.submitted_at 
                    ? new Date(sub.submitted_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—';

                  return (
                    <tr 
                      key={sub.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-6">
                        <p className="font-bold text-white text-sm">{sub.tournament_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{sub.tournament_id}</p>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-bold">
                          <Gamepad2 className="h-3 w-3 text-rose-400" />
                          {sub.game || 'Free Fire'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        <span className="block truncate max-w-[180px]" title={sub.organizer}>
                          {sub.organizer}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {dateStr}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black">
                          {sub.num_teams}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-black">
                          {sub.num_matches}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/admin/tournament-submissions/${sub.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white transition font-black uppercase text-[11px] tracking-wider cursor-pointer shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
