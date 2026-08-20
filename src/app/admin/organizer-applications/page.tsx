'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  Mail, 
  Building2, 
  Gamepad2,
  CalendarCheck,
  Trophy,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

type CategoryType = 'organizers' | 'teams' | 'colleges' | 'tournaments';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminApplicationsMasterPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('organizers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [applicationsData, setApplicationsData] = useState<{
    organizers: any[];
    teams: any[];
    colleges: any[];
    tournaments: any[];
    stats: {
      pending_organizers: number;
      pending_teams: number;
      pending_colleges: number;
      pending_tournaments: number;
      total_pending: number;
    };
  }>({
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
    },
  });

  const loadAllApplications = async () => {
    setLoading(true);
    try {
      const res = await flaskApi.getApplications();
      if (res.success && res.data) {
        setApplicationsData(res.data);
      }
    } catch (e) {
      console.error('Failed to load applications from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllApplications();
  }, []);

  // Action Handlers
  const handleOrganizerApproval = async (email: string, action: 'approve' | 'reject') => {
    setActionLoading(email);
    try {
      const res = await flaskApi.handleOrganizerAction(email, action);
      if (res.success) {
        // Sync local session if logged in as this user
        try {
          const rawSession = localStorage.getItem('xenova_session');
          if (rawSession) {
            const user = JSON.parse(rawSession);
            if (user.email?.toLowerCase() === email.toLowerCase()) {
              user.role = action === 'approve' ? 'organizer' : 'player';
              localStorage.setItem('xenova_session', JSON.stringify(user));
              window.dispatchEvent(new Event('xenova-auth-change'));
            }
          }
        } catch {}
        await loadAllApplications();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process organizer action.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTeamApproval = async (team: any, action: 'approve' | 'reject') => {
    const identifier = team.slug || team.name;
    setActionLoading(identifier);
    try {
      const res = await flaskApi.handleTeamAction({ slug: team.slug, name: team.name }, action);
      if (res.success) {
        await loadAllApplications();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process team approval.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollegeApproval = async (college: any, action: 'approve' | 'reject') => {
    const identifier = college.slug || college.name;
    setActionLoading(identifier);
    try {
      const res = await flaskApi.handleCollegeAction({ slug: college.slug, name: college.name }, action);
      if (res.success) {
        await loadAllApplications();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process college approval.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTournamentApproval = async (tournament: any, action: 'approve' | 'reject') => {
    setActionLoading(tournament.slug);
    try {
      const res = await flaskApi.handleTournamentAction(tournament.slug, action);
      if (res.success) {
        await loadAllApplications();
      } else {
        alert(res.message || 'Action failed.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process tournament approval.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter Items based on active category, status, and search
  const getCurrentItems = () => {
    const list = applicationsData[activeCategory] || [];
    return list.filter((item: any) => {
      let status = 'approved';
      if (activeCategory === 'organizers') {
        status = item.status || 'pending';
      } else if (activeCategory === 'teams' || activeCategory === 'colleges') {
        status = item.verification_status || item.verificationStatus || (item.verified ? 'approved' : 'pending');
      } else if (activeCategory === 'tournaments') {
        status = (item.status || '').toLowerCase() === 'pending' ? 'pending' : (item.status || '').toLowerCase() === 'rejected' ? 'rejected' : 'approved';
      }

      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      const searchContent = JSON.stringify(item).toLowerCase();
      const matchesSearch = !searchQuery || searchContent.includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  };

  const items = getCurrentItems();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Clearance Headquarters</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Applications & Approvals
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Real-time audit console for approving Organizers, Varsity Teams, Collegiate Institutions, and Event Lobbies.
          </p>
        </div>

        <button
          onClick={loadAllApplications}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          Sync Database
        </button>
      </header>

      {/* Primary Category Selector Tabs with Live Counter Badges */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            key: 'organizers' as CategoryType,
            label: 'Organizer Requests',
            icon: Users,
            count: applicationsData.stats.pending_organizers,
            color: '#f43f5e',
          },
          {
            key: 'teams' as CategoryType,
            label: 'Team Approvals',
            icon: ShieldCheck,
            count: applicationsData.stats.pending_teams,
            color: '#22d3ee',
          },
          {
            key: 'colleges' as CategoryType,
            label: 'College Registrations',
            icon: Building2,
            count: applicationsData.stats.pending_colleges,
            color: '#fbbf24',
          },
          {
            key: 'tournaments' as CategoryType,
            label: 'Tournament Proposals',
            icon: Trophy,
            count: applicationsData.stats.pending_tournaments,
            color: '#a855f7',
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isActive
                  ? 'border-rose-500/50 bg-[#0F1626] shadow-xl shadow-rose-500/10 ring-1 ring-rose-500/30'
                  : 'border-white/10 bg-[#0C111D] hover:border-white/20 hover:bg-[#0E1422]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="h-5 w-5" style={{ color: tab.color }} />
                {tab.count > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                    {tab.count} Pending
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-slate-500">
                    All Clear
                  </span>
                )}
              </div>
              <h3 className="font-bold text-sm text-white">{tab.label}</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {applicationsData[tab.key]?.length || 0} total registered
              </p>
            </button>
          );
        })}
      </section>

      {/* Filter HUD & Search */}
      <section className="grid gap-4 sm:grid-cols-[2fr_1fr] bg-[#0C111D] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeCategory} by title, identity, email, game...`}
            className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-rose-500/50 focus:bg-white/[0.08] transition text-white"
          />
        </div>
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition rounded-lg ${
                statusFilter === status
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* Main Applications Content List */}
      <section className="space-y-4">
        {loading ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent mx-auto mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading records from backend database...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center text-slate-500 space-y-3">
            <Users className="h-10 w-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">No applications found under this status</p>
            <p className="text-xs text-slate-600">Switch filter tabs or check back when new entries are submitted.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item: any, idx: number) => {
              // Extract status for item
              let status = 'approved';
              if (activeCategory === 'organizers') {
                status = item.status || 'pending';
              } else if (activeCategory === 'teams' || activeCategory === 'colleges') {
                status = item.verification_status || item.verificationStatus || (item.verified ? 'approved' : 'pending');
              } else if (activeCategory === 'tournaments') {
                status = (item.status || '').toLowerCase() === 'pending' ? 'pending' : (item.status || '').toLowerCase() === 'rejected' ? 'rejected' : 'approved';
              }

              const isPending = status === 'pending';
              const identifier = item.email || item.slug || item.id || `item_${idx}`;
              const isActioning = actionLoading === identifier;

              return (
                <motion.article
                  key={identifier + idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl grid gap-6 md:grid-cols-[1.8fr_1fr] hover:border-white/20 transition-all"
                >
                  {/* Category-Specific Item Details */}
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                        status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                        {status === 'rejected' && <X className="h-3 w-3" />}
                        {status === 'pending' && <Clock className="h-3 w-3 animate-pulse" />}
                        {status}
                      </span>

                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {activeCategory.toUpperCase()}
                      </span>
                    </div>

                    {/* Content: Organizers */}
                    {activeCategory === 'organizers' && (
                      <>
                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
                          {item.hostName || item.host_name || 'Organizer Candidate'}
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-2 truncate">
                            <Mail className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            {item.email}
                          </span>
                          <span className="flex items-center gap-2 truncate">
                            <Building2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            {item.college}
                          </span>
                          <span className="flex items-center gap-2">
                            <Gamepad2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            Game Focus: {item.preferredGame || item.preferred_game || 'Valorant'}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarCheck className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            Experience: {item.experience || 'Intermediate'}
                          </span>
                        </div>
                        {item.details && (
                          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-sm leading-relaxed text-slate-300">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Intent & Credentials</p>
                            "{item.details}"
                          </div>
                        )}
                      </>
                    )}

                    {/* Content: Teams */}
                    {activeCategory === 'teams' && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl border flex items-center justify-center font-black text-xs italic text-white"
                               style={{ borderColor: `${item.accent || '#6366f1'}40`, background: `linear-gradient(135deg, ${item.accent || '#6366f1'}33, transparent)` }}>
                            {(item.name || 'TM').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">{item.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rank #{item.rank || 1} • {item.members || 5} Members</p>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-2 truncate">
                            <Building2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            {item.college}
                          </span>
                          <span className="flex items-center gap-2">
                            <Gamepad2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            Game: {item.game}
                          </span>
                          <span className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            Captain: {item.captain || 'Lead'}
                          </span>
                          <span className="flex items-center gap-2">
                            <Trophy className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            Win Rate: {item.win_rate || 50}%
                          </span>
                        </div>
                      </>
                    )}

                    {/* Content: Colleges */}
                    {activeCategory === 'colleges' && (
                      <>
                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">{item.name}</h3>
                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-2 truncate">
                            <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            {item.location || item.state || 'India'}
                          </span>
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            Category: {item.type || 'University'}
                          </span>
                          <span className="flex items-center gap-2 truncate">
                            <Mail className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            Domain: {item.website || 'campus.edu'}
                          </span>
                          <span className="flex items-center gap-2">
                            <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            National Rank #{item.national_rank || 99}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Content: Tournaments */}
                    {activeCategory === 'tournaments' && (
                      <>
                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">{item.title}</h3>
                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-2">
                            <Gamepad2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            Game: {item.game}
                          </span>
                          <span className="flex items-center gap-2">
                            <Trophy className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            Prize: {item.prize}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            Date: {item.date} • {item.region}
                          </span>
                          <span className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            Format: {item.format} ({item.teams})
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions & Timestamps Panel */}
                  <div className="flex flex-col justify-between items-end gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic shrink-0">
                      Logged: {item.appliedAt || item.created_at || 'Database Record'}
                    </span>

                    {/* Interactive Approve & Reject Buttons */}
                    <div className="flex gap-3 w-full sm:w-auto flex-wrap justify-end">
                      {activeCategory === 'organizers' && (
                        <>
                          <button
                            disabled={isActioning || status === 'rejected'}
                            onClick={() => handleOrganizerApproval(item.email, 'reject')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'rejected'
                                ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-500'
                                : 'border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            disabled={isActioning || status === 'approved'}
                            onClick={() => handleOrganizerApproval(item.email, 'approve')}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'approved'
                                ? 'opacity-40 cursor-not-allowed bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 shadow-lg shadow-emerald-500/10'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {status === 'approved' ? 'Approved Organizer' : 'Authorize Organizer'}
                          </button>
                        </>
                      )}

                      {activeCategory === 'teams' && (
                        <>
                          <button
                            disabled={isActioning || status === 'rejected'}
                            onClick={() => handleTeamApproval(item, 'reject')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'rejected'
                                ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-500'
                                : 'border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            disabled={isActioning || status === 'approved'}
                            onClick={() => handleTeamApproval(item, 'approve')}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'approved'
                                ? 'opacity-40 cursor-not-allowed bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-300 shadow-lg shadow-cyan-500/10'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {status === 'approved' ? 'Verified Squad' : 'Verify Squad'}
                          </button>
                        </>
                      )}

                      {activeCategory === 'colleges' && (
                        <>
                          <button
                            disabled={isActioning || status === 'rejected'}
                            onClick={() => handleCollegeApproval(item, 'reject')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'rejected'
                                ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-500'
                                : 'border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            disabled={isActioning || status === 'approved'}
                            onClick={() => handleCollegeApproval(item, 'approve')}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'approved'
                                ? 'opacity-40 cursor-not-allowed bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-300 shadow-lg shadow-amber-500/10'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {status === 'approved' ? 'Verified Campus' : 'Verify Campus'}
                          </button>
                        </>
                      )}

                      {activeCategory === 'tournaments' && (
                        <>
                          <button
                            disabled={isActioning || status === 'rejected'}
                            onClick={() => handleTournamentApproval(item, 'reject')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'rejected'
                                ? 'opacity-40 cursor-not-allowed bg-white/5 text-slate-500'
                                : 'border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            disabled={isActioning || status === 'approved'}
                            onClick={() => handleTournamentApproval(item, 'approve')}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition ${
                              status === 'approved'
                                ? 'opacity-40 cursor-not-allowed bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-300 shadow-lg shadow-purple-500/10'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {status === 'approved' ? 'Event Live' : 'Launch Event'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}
