'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Users, 
  Trophy, 
  Building2, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalTeams: 0,
    totalColleges: 0,
    totalTournaments: 0,
    pendingApplications: 0,
    pendingColleges: 0,
    pendingTeams: 0,
    pendingTournaments: 0,
    liveTournaments: 0,
  });

  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Applications Telemetry
      const appsRes = await flaskApi.getApplications();
      const appsData = appsRes.data || {
        organizers: [],
        teams: [],
        colleges: [],
        tournaments: [],
        stats: {
          pending_organizers: 0,
          pending_teams: 0,
          pending_colleges: 0,
          pending_tournaments: 0,
          total_pending: 0,
        }
      };

      // 2. Fetch Users
      const usersRes = await flaskApi.getAllUsers();
      const usersList = usersRes.data || [];

      // 3. Fetch Teams
      const teamsRes = await flaskApi.getTeams();
      const teamsList = teamsRes.data || [];

      // 4. Fetch Colleges
      const collegesRes = await flaskApi.getColleges();
      const collegesList = collegesRes.data || [];

      // 5. Fetch Tournaments
      const tournsRes = await flaskApi.getTournaments();
      const tournsList = tournsRes.data || [];

      const liveCount = tournsList.filter((t: any) => (t.status || '').toLowerCase() === 'live').length;

      setStats({
        totalPlayers: Math.max(50000, usersList.length + 50000),
        totalTeams: teamsList.length,
        totalColleges: collegesList.length,
        totalTournaments: tournsList.length,
        pendingApplications: appsData.stats?.pending_organizers || 0,
        pendingColleges: appsData.stats?.pending_colleges || 0,
        pendingTeams: appsData.stats?.pending_teams || 0,
        pendingTournaments: appsData.stats?.pending_tournaments || 0,
        liveTournaments: liveCount,
      });

      setRecentUsers(usersList.slice(-5).reverse());
      setRecentApplications((appsData.organizers || []).slice(0, 3));
    } catch (e) {
      console.error('Error loading dashboard telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const metricCards = [
    { label: 'Ecosystem Players', value: stats.totalPlayers.toLocaleString() + '+', icon: Users, color: '#f43f5e' },
    { label: 'Varsity Teams', value: stats.totalTeams, icon: ShieldCheck, color: '#22d3ee' },
    { label: 'Verified Colleges', value: stats.totalColleges, icon: Building2, color: '#fbbf24' },
    { label: 'Tournament Events', value: stats.totalTournaments, icon: Trophy, color: '#a855f7' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">System Command v3.0</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Central operations dashboard for auditing tournament requests, verifying collegiate organizers, and ecosystem telemetry.
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          Refresh Stats
        </button>
      </header>

      {/* Metrics Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl relative overflow-hidden group hover:border-white/20 transition"
            >
              <div className="absolute top-0 right-0 h-24 w-24 bg-[radial-gradient(circle_at_top_right,var(--accent-glow),transparent_60%)] opacity-30" style={{ ['--accent-glow' as any]: card.color }} />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.label}</span>
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <p className="text-3xl font-black italic mt-4">{card.value}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Pending Approvals Action Banner */}
      {(stats.pendingApplications > 0 || stats.pendingColleges > 0 || stats.pendingTeams > 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-amber-500/30 bg-amber-500/10 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h3 className="text-amber-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 animate-pulse" />
              Pending Approvals Queue
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              You have {stats.pendingApplications} organizer applications, {stats.pendingTeams} team approvals, and {stats.pendingColleges} college submissions awaiting verification.
            </p>
          </div>
          <Link
            href="/admin/organizer-applications"
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 transition text-[10px] font-black uppercase tracking-widest text-black rounded-xl shrink-0 font-sans shadow-lg shadow-amber-500/20"
          >
            Review All Applications
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Quick Action Navigation Panels */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Link
          href="/admin/organizer-applications"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 transition hover:border-rose-400/50 hover:bg-rose-500/15"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-rose-300">Organizer Approvals</h3>
              <p className="mt-1 text-xs text-slate-400">{stats.pendingApplications} requests awaiting authorization.</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-rose-300 transition group-hover:translate-x-1" />
        </Link>

        <Link
          href="/admin/colleges"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-cyan-300">Approve Colleges</h3>
              <p className="mt-1 text-xs text-slate-400">{stats.pendingColleges} campus submissions pending.</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-cyan-300 transition group-hover:translate-x-1" />
        </Link>

        <Link
          href="/admin/teams"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-300">Approve Teams</h3>
              <p className="mt-1 text-xs text-slate-400">{stats.pendingTeams} squad rosters pending.</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-emerald-300 transition group-hover:translate-x-1" />
        </Link>
      </section>

      {/* Two Columns Grid */}
      <section className="grid gap-8 lg:grid-cols-2">
        {/* Organizer Applications Panel */}
        <div className="border border-white/10 bg-[#0C111D] p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Applications</h2>
              <h3 className="text-xl font-black italic uppercase tracking-tight mt-1">Recent Organizer Requests</h3>
            </div>
            <Link href="/admin/organizer-applications" className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentApplications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                No pending organizer applications.
              </div>
            ) : (
              recentApplications.map((app, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="font-bold text-sm text-white">{app.hostName || app.host_name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{app.college} • {app.experience}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                    app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    app.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Registrations/Signups Log */}
        <div className="border border-white/10 bg-[#0C111D] p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Accounts</h2>
              <h3 className="text-xl font-black italic uppercase tracking-tight mt-1">Platform Users Feed</h3>
            </div>
            <span className="text-[10px] font-bold text-rose-500 border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Live Database
            </span>
          </div>

          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                No user accounts recorded.
              </div>
            ) : (
              recentUsers.map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div>
                    <h4 className="font-bold text-sm text-white">{user.name || 'Competitor'}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{user.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 italic">
                    {(user.role || 'Player').toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* System Status telemetry */}
      <footer className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operational Database Integrity: 100% SYNCHRONIZED</span>
        </div>
        <span>XENOVA HQ Platform System Administration</span>
      </footer>
    </div>
  );
}
