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
  CalendarDays,
  Phone,
  MessageSquare,
  Ticket,
  MapPin,
  Calendar,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { flaskApi, getCached } from '@/lib/flask-api';

type CategoryType = 'organizers' | 'teams' | 'colleges' | 'tournaments';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminApplicationsMasterPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('organizers');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
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
  }>(() => {
    const cached = getCached<any>('admin:applications');
    if (cached) return cached;

    return {
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
    };
  });

  const loadAllApplications = async (isManual: any = false) => {
    if (isManual === true) setLoading(true);
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
    const cleanEmail = (email || '').trim().toLowerCase();
    const targetRole = action === 'approve' ? 'ORGANIZER' : 'PLAYER';
    try {
      const res = await flaskApi.handleOrganizerAction(cleanEmail, action);
      await flaskApi.updateUserRole(cleanEmail, targetRole);

      // Direct Supabase synchronization
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // 1. Update application status
        await supabase
          .from('organizer_applications')
          .update({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' })
          .ilike('email', cleanEmail);

        // 2. Update or insert in users table
        const { data: existingUsers } = await supabase.from('users').select('*').ilike('email', cleanEmail);
        if (existingUsers && existingUsers.length > 0) {
          await supabase.from('users').update({ role: targetRole }).ilike('email', cleanEmail);
        } else if (action === 'approve') {
          await supabase.from('users').insert({
            email: cleanEmail,
            name: cleanEmail.split('@')[0],
            college: 'Campus Esports',
            role: 'ORGANIZER',
            tag: `HOST#${Math.floor(1000 + Math.random() * 9000)}`,
          });
        }
      } catch (sbErr) {
        console.warn('Direct Supabase role update notice:', sbErr);
      }

      if (res.success || true) {
        // Sync local session if logged in as this user
        try {
          const rawSession = localStorage.getItem('xenova_session');
          if (rawSession) {
            const user = JSON.parse(rawSession);
            if (user.email?.toLowerCase() === cleanEmail) {
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition shrink-0 cursor-pointer"
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
              className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between h-32 ${
                isActive
                  ? 'border-white/30 bg-[#121827] shadow-xl shadow-black/40 ring-1 ring-white/20'
                  : 'border-white/5 bg-[#0C111D]/80 hover:border-white/15 hover:bg-[#0E1524]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center border border-white/10"
                  style={{ backgroundColor: `${tab.color}15`, color: tab.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {tab.count > 0 && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase tracking-wider text-white"
                    style={{ backgroundColor: tab.color }}
                  >
                    {tab.count} Pending
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{tab.label}</p>
                <p className="text-lg font-black italic uppercase tracking-tight text-white mt-0.5">
                  {tab.key === 'organizers' && `${applicationsData.organizers.length} Requests`}
                  {tab.key === 'teams' && `${applicationsData.teams.length} Squads`}
                  {tab.key === 'colleges' && `${applicationsData.colleges.length} Campuses`}
                  {tab.key === 'tournaments' && `${applicationsData.tournaments.length} Lobbies`}
                </p>
              </div>
            </button>
          );
        })}
      </section>

      {/* Search & Filter Toolbar */}
      <section className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeCategory}...`}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-[#0C111D] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest transition rounded-lg cursor-pointer ${
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
              const proposedTournament = item.tournament || item.tournament_data || null;

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
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
                            {item.hostName || item.host_name || 'Organizer Candidate'}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            {item.college || 'Independent Campus'}
                          </p>
                        </div>

                        {/* Contact & Verification Credentials */}
                        <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold text-slate-300 bg-white/[0.02] border border-white/5 p-3.5 rounded-xl">
                          <span className="flex items-center gap-2 truncate">
                            <Mail className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            {item.email}
                          </span>
                          {item.phone ? (
                            <span className="flex items-center gap-2 truncate">
                              <Phone className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              {item.phone}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-slate-500">
                              <Phone className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                              Phone: Unspecified
                            </span>
                          )}
                          {item.discordServer ? (
                            <span className="flex items-center gap-2 truncate col-span-2 text-indigo-300">
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              Discord: {item.discordServer}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-2">
                            <Gamepad2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            Game Focus: {item.preferredGame || item.preferred_game || 'Valorant'}
                          </span>
                          <span className="flex items-center gap-2">
                            <CalendarCheck className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            Role Intent: {item.experience || 'Collegiate Host'}
                          </span>
                        </div>

                        {/* Proposed Tournament Launch Section */}
                        {proposedTournament && (
                          <div className="border border-emerald-500/30 bg-emerald-950/10 p-4 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5" /> Proposed Tournament (Auto-Launches on Approval)
                              </span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                {proposedTournament.game || 'Esports'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-extrabold text-white">
                                {proposedTournament.title || 'Collegiate Championship'}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                                <div><span className="text-slate-500 block text-[9px] uppercase">Prize</span> {proposedTournament.prize || '₹0'}</div>
                                <div><span className="text-slate-500 block text-[9px] uppercase">Entry Fee</span> {proposedTournament.fee || 'Free'}</div>
                                <div><span className="text-slate-500 block text-[9px] uppercase">Format</span> {proposedTournament.format || 'Standard'}</div>
                                <div><span className="text-slate-500 block text-[9px] uppercase">Slots</span> {proposedTournament.teams || proposedTournament.maxTeams || '64'}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {item.details && (
                          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-xs leading-relaxed text-slate-300">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Host Description / Notes</p>
                            "{item.details}"
                          </div>
                        )}
                      </div>
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
