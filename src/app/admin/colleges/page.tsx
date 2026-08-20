'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Building2, Search, ShieldCheck, Trash2, XCircle, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

export default function AdminCollegesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [loading, setLoading] = useState(true);

  const loadColleges = async () => {
    setLoading(true);
    try {
      const res = await flaskApi.getColleges();
      if (res.success && Array.isArray(res.data)) {
        setColleges(res.data);
      }
    } catch (e) {
      console.error('Failed to load colleges from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, []);

  const updateCollegeStatus = async (slug: string, action: 'approved' | 'rejected') => {
    try {
      await flaskApi.handleCollegeAction({ slug }, action === 'approved' ? 'approve' : 'reject');
      await flaskApi.updateCollege(slug, {
        verification_status: action,
        verificationStatus: action,
        verified: action === 'approved',
      });
      await loadColleges();
    } catch (e) {
      console.error(e);
      alert('Failed to update college status.');
    }
  };

  const deleteCollege = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this college from the database?')) return;
    try {
      await flaskApi.deleteCollege(slug);
      await loadColleges();
    } catch (e) {
      console.error(e);
      alert('Failed to delete college.');
    }
  };

  const filteredColleges = useMemo(() => {
    return colleges.filter((college) => {
      const status = college.verification_status || college.verificationStatus || (college.verified ? 'approved' : 'pending');
      const matchesStatus = statusFilter === 'All Status' || status.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch = [college.name, college.location, college.state, college.type, college.website]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [colleges, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const pending = colleges.filter((c) => (c.verification_status || c.verificationStatus) === 'pending').length;
    const verified = colleges.filter((c) => (c.verification_status || c.verificationStatus) === 'approved' || c.verified).length;
    const rejected = colleges.filter((c) => (c.verification_status || c.verificationStatus) === 'rejected').length;
    return { pending, verified, rejected, total: colleges.length };
  }, [colleges]);

  const metricCards = [
    { label: 'Total Colleges', value: stats.total, icon: Building2, color: '#22d3ee' },
    { label: 'Verified Campuses', value: stats.verified, icon: BadgeCheck, color: '#10b981' },
    { label: 'Pending Review', value: stats.pending, icon: ShieldCheck, color: '#fbbf24' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px w-8 bg-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Institution Control</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">College Verification</h1>
          <p className="mt-2 text-sm text-slate-400">
            Audit and verify college affiliations to make them selectable across tournaments and team rosters.
          </p>
        </div>

        <button
          onClick={loadColleges}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Sync Database
        </button>
      </header>

      {/* Metric Cards */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0C111D] p-6 transition hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.label}</span>
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <p className="mt-4 text-3xl font-black italic">{card.value}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Filter HUD */}
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-[#0C111D] p-4 sm:grid-cols-[2fr_1fr]">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-slate-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by college name, state, campus type, website..."
            className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-cyan-500/50 focus:bg-white/[0.08] text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-cyan-500/50 focus:bg-white/[0.08] text-white"
        >
          {['All Status', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <option key={status} value={status} className="bg-[#0c111d] text-white">{status}</option>
          ))}
        </select>
      </section>

      {/* Colleges Table */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C111D] shadow-2xl">
        <div className="grid grid-cols-[1.6fr_1.3fr_0.9fr_0.9fr_1fr] gap-4 border-b border-white/10 bg-white/5 px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>College / Institution</span>
          <span>Location</span>
          <span>Category</span>
          <span>Verification Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="space-y-1 p-2">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 uppercase tracking-widest">
              Loading colleges from database...
            </div>
          ) : filteredColleges.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 uppercase tracking-widest">
              No matching colleges found.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredColleges.map((college, index) => {
                const status = college.verification_status || college.verificationStatus || (college.verified ? 'approved' : 'pending');
                return (
                  <motion.div
                    key={`${college.slug}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="grid grid-cols-[1.6fr_1.3fr_0.9fr_0.9fr_1fr] items-center gap-4 rounded-xl px-6 py-4 transition hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-white">{college.name}</h4>
                      <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-widest text-slate-500">{college.website || 'campus.edu'}</p>
                    </div>
                    <span className="truncate pr-4 text-xs font-semibold text-slate-300">{college.location || college.state || 'India'}</span>
                    <span className="text-xs font-bold text-slate-300">{college.type || 'University'}</span>
                    <span className={`inline-flex w-fit rounded border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                      status === 'pending'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        : status === 'rejected'
                          ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {status}
                    </span>
                    <div className="flex justify-end gap-2">
                      {status !== 'approved' && (
                        <button 
                          onClick={() => updateCollegeStatus(college.slug, 'approved')} 
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-600 hover:text-white" 
                          title="Verify College"
                        >
                          <BadgeCheck className="h-4.5 w-4.5" />
                        </button>
                      )}
                      {status !== 'rejected' && (
                        <button 
                          onClick={() => updateCollegeStatus(college.slug, 'rejected')} 
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition hover:bg-amber-600 hover:text-white" 
                          title="Reject College"
                        >
                          <XCircle className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => deleteCollege(college.slug)} 
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-600 hover:text-white" 
                        title="Delete College"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
