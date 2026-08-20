'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Trash2,
  Trophy,
  Mail,
  Building2,
  Edit3,
  Eye,
  RefreshCw,
  ShieldCheck,
  Award
} from 'lucide-react';

import { flaskApi } from '@/lib/flask-api';

interface Organizer {
  id?: string | number;
  email: string;
  name: string;
  college?: string;
  role: string;
  tag?: string;
}

interface Tournament {
  id?: string | number;
  title?: string;
  name?: string;
  game: string;
  slug: string;
  host?: string;
  createdBy?: string;
  status: string;
}

export default function AdminOrganizerManagementPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch organizers from backend API
      const orgRes = await flaskApi.getOrganizers();
      let orgList: Organizer[] = [];
      if (orgRes.success && Array.isArray(orgRes.data)) {
        orgList = orgRes.data;
      }

      // Also check applications that were approved
      const appsRes = await flaskApi.getApplications();
      if (appsRes.success && appsRes.data?.organizers) {
        const approvedApps = appsRes.data.organizers.filter((a: any) => a.status === 'approved');
        const seen = new Set(orgList.map(o => o.email.toLowerCase()));
        for (const app of approvedApps) {
          if (app.email && !seen.has(app.email.toLowerCase())) {
            seen.add(app.email.toLowerCase());
            orgList.push({
              email: app.email,
              name: app.hostName || app.host_name || 'Verified Host',
              college: app.college,
              role: 'ORGANIZER',
              tag: 'ORGANIZER#1337',
            });
          }
        }
      }

      setOrganizers(orgList);

      // 2. Fetch tournaments from backend
      const tournRes = await flaskApi.getTournaments();
      if (tournRes.success && Array.isArray(tournRes.data)) {
        setTournaments(tournRes.data);
      }
    } catch (e) {
      console.error('Failed to load organizer data from server:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeOrganizer = async (email: string) => {
    if (!confirm(`Revoke organizer privileges from ${email}? They will be converted to a regular player.`)) return;

    try {
      // 1. Demote user in backend database
      await flaskApi.updateUserRole(email, 'PLAYER');
      await flaskApi.handleOrganizerAction(email, 'reject');

      // 2. Demote session if currently active
      try {
        const rawSession = localStorage.getItem('xenova_session');
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session.email?.toLowerCase() === email.toLowerCase() && session.role === 'organizer') {
            session.role = 'player';
            localStorage.setItem('xenova_session', JSON.stringify(session));
            window.dispatchEvent(new Event('xenova-auth-change'));
          }
        }
      } catch {}

      await loadData();
      alert(`Organizer privileges revoked for ${email}.`);
    } catch (e) {
      console.error(e);
      alert('Failed to remove organizer privileges.');
    }
  };

  const getOrganizerTournaments = (email: string) => {
    return tournaments.filter((t: Tournament) => 
      (t.createdBy && t.createdBy.toLowerCase() === email.toLowerCase()) ||
      (t.host && t.host.toLowerCase().includes(email.toLowerCase()))
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Host Management</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Organizer Control Panel
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Audit approved platform organizers, monitor hosted event lobbies, and manage hosting clearance.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          Refresh List
        </button>
      </header>

      {/* Organizers List */}
      {loading ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading approved organizers from database...</p>
        </div>
      ) : organizers.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-slate-500 space-y-3">
          <Users className="h-10 w-10 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-bold uppercase tracking-wider text-slate-400">No approved organizers yet</p>
          <p className="text-xs text-slate-600">Go to the Applications tab to approve pending organizer submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {organizers.map((org) => {
              const orgTournaments = getOrganizerTournaments(org.email);
              const isExpanded = selectedOrganizer === org.email;

              return (
                <motion.div
                  key={org.email}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="border border-white/10 bg-[#0C111D] rounded-2xl overflow-hidden hover:border-white/20 transition-all"
                >
                  {/* Main Card */}
                  <div
                    onClick={() => setSelectedOrganizer(isExpanded ? null : org.email)}
                    className="w-full text-left p-6 hover:bg-white/[0.02] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">{org.name || 'Verified Organizer'}</h3>
                          <span className="text-indigo-400 font-bold uppercase tracking-widest text-[9px] bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {org.role.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 text-xs font-semibold text-slate-400 mt-3">
                          <span className="flex items-center gap-2 truncate">
                            <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            {org.email}
                          </span>
                          <span className="flex items-center gap-2 truncate">
                            <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            {org.college || 'Collegiate Host'}
                          </span>
                          <span className="flex items-center gap-2">
                            <Trophy className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            {orgTournaments.length} Event Lobbies
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeOrganizer(org.email);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition text-xs font-bold uppercase tracking-widest text-rose-400 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Tournament List */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 bg-white/[0.02] p-6"
                    >
                      <h4 className="text-sm font-black uppercase tracking-wider text-indigo-300 mb-4 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-indigo-400" />
                        Tournaments Linked to Host ({orgTournaments.length})
                      </h4>

                      {orgTournaments.length === 0 ? (
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No tournaments published yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {orgTournaments.map((tourn: Tournament, idx: number) => (
                            <div
                              key={tourn.slug || idx}
                              className="flex items-center justify-between p-3.5 border border-white/5 bg-white/[0.02] rounded-xl hover:border-white/10 transition"
                            >
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-sm text-white truncate">{tourn.title || tourn.name}</h5>
                                <div className="text-[10px] text-slate-400 mt-1 flex gap-3 flex-wrap font-semibold">
                                  <span>{tourn.game}</span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                                    (tourn.status || '').toLowerCase() === 'live' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                    (tourn.status || '').toLowerCase() === 'registering' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                  }`}>
                                    {tourn.status}
                                  </span>
                                </div>
                              </div>
                              <Link
                                href={`/tournaments/${tourn.slug}`}
                                className="ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition text-xs font-bold uppercase tracking-widest text-white rounded-lg whitespace-nowrap"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
