'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Building2, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { defaultColleges, getCustomColleges, saveCustomColleges } from '@/lib/xenova-data';

export default function AdminCollegesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customColleges, setCustomColleges] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Status');

  const loadColleges = () => setCustomColleges(getCustomColleges());

  useEffect(() => {
    loadColleges();
    window.addEventListener('xenova-colleges-change', loadColleges);
    return () => window.removeEventListener('xenova-colleges-change', loadColleges);
  }, []);

  const combinedColleges = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const college of customColleges) {
      const key = (college.slug || college.name || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ ...college, isCustom: true });
      }
    }

    for (const college of defaultColleges) {
      const key = (college.slug || college.name || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ ...college, isCustom: false });
      }
    }

    return result;
  }, [customColleges]);

  const filteredColleges = useMemo(() => {
    return combinedColleges.filter((college) => {
      const status = college.verificationStatus || (college.verified ? 'approved' : 'pending');
      const matchesStatus = statusFilter === 'All Status' || status === statusFilter.toLowerCase();
      const matchesSearch = [college.name, college.location, college.state, college.type, college.website]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch && matchesStatus;
    });
  }, [combinedColleges, searchTerm, statusFilter]);

  const updateCollegeStatus = (slug: string, verificationStatus: 'approved' | 'rejected') => {
    const updated = customColleges.map((college) => {
      if (college.slug !== slug) return college;
      return {
        ...college,
        verificationStatus,
        verified: verificationStatus === 'approved',
      };
    });
    saveCustomColleges(updated);
    setCustomColleges(updated);
  };

  const deleteCollege = (slug: string) => {
    if (!confirm('Delete this college submission?')) return;
    const updated = customColleges.filter((college) => college.slug !== slug);
    saveCustomColleges(updated);
    setCustomColleges(updated);
  };

  const stats = useMemo(() => {
    const pending = customColleges.filter((college) => college.verificationStatus === 'pending').length;
    const verified = combinedColleges.filter((college) => college.verificationStatus === 'approved' || college.verified).length;
    const rejected = customColleges.filter((college) => college.verificationStatus === 'rejected').length;
    return { pending, verified, rejected, total: combinedColleges.length };
  }, [combinedColleges, customColleges]);

  const metricCards = [
    { label: 'Total Colleges', value: stats.total, icon: Building2, color: '#22d3ee' },
    { label: 'Verified', value: stats.verified, icon: BadgeCheck, color: '#10b981' },
    { label: 'Pending Review', value: stats.pending, icon: ShieldCheck, color: '#fbbf24' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px w-8 bg-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Institution Control</span>
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">College Verification</h1>
        <p className="mt-2 text-sm text-slate-400">
          Approve colleges before they become selectable for team creation and tournament registration.
        </p>
      </header>

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

      <section className="grid gap-4 rounded-2xl border border-white/10 bg-[#0C111D] p-4 sm:grid-cols-[2fr_1fr]">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-slate-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by college, state, type or website..."
            className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-cyan-500/50 focus:bg-white/[0.08]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-cyan-500/50 focus:bg-white/[0.08]"
        >
          {['All Status', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <option key={status} value={status} className="bg-[#0c111d] text-white">{status}</option>
          ))}
        </select>
      </section>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0C111D] shadow-2xl">
        <div className="grid grid-cols-[1.6fr_1.3fr_0.9fr_0.9fr_1fr] gap-4 border-b border-white/10 bg-white/5 px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>College</span>
          <span>Location</span>
          <span>Type</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="space-y-1 p-2">
          <AnimatePresence mode="popLayout">
            {filteredColleges.map((college, index) => (
              <motion.div
                key={`${college.slug}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="grid grid-cols-[1.6fr_1.3fr_0.9fr_0.9fr_1fr] items-center gap-4 rounded-xl px-6 py-4 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-white">{college.name}</h4>
                  <p className="mt-1 truncate text-[9px] font-black uppercase tracking-widest text-slate-500">{college.website}</p>
                </div>
                <span className="truncate pr-4 text-xs font-semibold text-slate-300">{college.location}</span>
                <span className="text-xs font-bold text-slate-300">{college.type}</span>
                <span className={`inline-flex w-fit rounded border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                  college.verificationStatus === 'pending'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    : college.verificationStatus === 'rejected'
                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                }`}>
                  {college.verificationStatus || 'approved'}
                </span>
                <div className="flex justify-end gap-2">
                  {college.isCustom ? (
                    <>
                      {college.verificationStatus !== 'approved' && (
                        <button onClick={() => updateCollegeStatus(college.slug, 'approved')} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition hover:bg-emerald-600 hover:text-white" title="Verify College">
                          <BadgeCheck className="h-4.5 w-4.5" />
                        </button>
                      )}
                      {college.verificationStatus !== 'rejected' && (
                        <button onClick={() => updateCollegeStatus(college.slug, 'rejected')} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition hover:bg-amber-600 hover:text-white" title="Reject College">
                          <XCircle className="h-4.5 w-4.5" />
                        </button>
                      )}
                      <button onClick={() => deleteCollege(college.slug)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-600 hover:text-white" title="Delete College">
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </>
                  ) : (
                    <span className="pr-3 text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Preset</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
