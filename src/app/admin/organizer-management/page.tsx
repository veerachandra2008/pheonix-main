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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export default function AdminOrganizerManagementPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      let orgList: Organizer[] = [];
      const seen = new Set<string>();
      let fetchedFromApi = false;

      // 1. Fetch organizers from backend API (strictly approved only)
      try {
        const orgRes = await flaskApi.getOrganizers();
        if (orgRes.success && Array.isArray(orgRes.data)) {
          fetchedFromApi = true;
          for (const o of orgRes.data) {
            const email = (o.email || '').toLowerCase().trim();
            const status = (o.status || '').toLowerCase();
            const role = (o.role || '').toUpperCase();
            // ONLY include approved organizers or users with ORGANIZER/ADMIN role
            if (email && !seen.has(email) && (status === 'approved' || role === 'ORGANIZER' || role === 'ADMIN')) {
              seen.add(email);
              orgList.push({
                id: o.id,
                email: o.email,
                name: o.name || o.host_name || o.hostName || 'Verified Host',
                college: o.college || 'Independent Campus',
                role: role === 'ADMIN' ? 'ADMIN' : 'ORGANIZER',
                tag: o.tag || `HOST#${Math.abs(hashString(email)) % 9000 + 1000}`,
              });
            }
          }
        }
      } catch (apiErr) {
        console.warn('Flask organizers fetch notice:', apiErr);
      }

      // 2. Direct Supabase Fallback only if API was unreachable
      if (!fetchedFromApi) {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data: appData } = await supabase
            .from('organizer_applications')
            .select('*')
            .ilike('status', 'approved');

          if (appData && Array.isArray(appData)) {
            for (const app of appData) {
              const status = (app.status || '').toLowerCase();
              const email = (app.email || '').toLowerCase().trim();
              if (status === 'approved' && email && !seen.has(email)) {
                seen.add(email);
                orgList.push({
                  id: app.id,
                  email: app.email,
                  name: app.host_name || app.name || 'Verified Host',
                  college: app.college || 'Independent Campus',
                  role: 'ORGANIZER',
                  tag: `HOST#${Math.abs(hashString(email)) % 9000 + 1000}`,
                });
              }
            }
          }
        } catch (sbErr) {
          console.warn('Supabase organizer fetch notice:', sbErr);
        }
      }

      setOrganizers(orgList);

      // 3. Fetch tournaments from Direct Supabase and Backend API
      let tournList: Tournament[] = [];
      const seenTourns = new Set<string>();

      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: sbTourns } = await supabase.from('tournaments').select('*');
        if (sbTourns && Array.isArray(sbTourns)) {
          for (const t of sbTourns) {
            const key = t.slug || String(t.id) || t.title;
            if (key && !seenTourns.has(key)) {
              seenTourns.add(key);
              tournList.push(t);
            }
          }
        }
      } catch (sbErr) {
        console.warn('Supabase tournaments fetch notice:', sbErr);
      }

      try {
        const tournRes = await flaskApi.getTournaments();
        if (tournRes.success && Array.isArray(tournRes.data)) {
          for (const t of tournRes.data) {
            const key = t.slug || String(t.id) || t.title;
            if (key && !seenTourns.has(key)) {
              seenTourns.add(key);
              tournList.push(t);
            }
          }
        }
      } catch (apiErr) {
        console.warn('API tournaments fetch notice:', apiErr);
      }

      setTournaments(tournList);
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
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return;
    if (!confirm(`Revoke organizer privileges from ${cleanEmail}? They will be converted to a regular player.`)) return;

    try {
      // 1. Optimistically update local UI immediately
      setOrganizers((prev) => prev.filter((o) => o.email.toLowerCase() !== cleanEmail));

      // 2. Delete / Revoke organizer in backend database & Supabase
      await flaskApi.deleteOrganizer(cleanEmail);
      await flaskApi.updateUserRole(cleanEmail, 'PLAYER');
      await flaskApi.handleOrganizerAction(cleanEmail, 'reject');

      // 3. Direct Supabase cleanup
      try {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('users').update({ role: 'PLAYER' }).eq('email', cleanEmail);
        await supabase.from('organizer_applications').delete().eq('email', cleanEmail);
      } catch (sbErr) {
        console.warn('Direct Supabase revoke notice:', sbErr);
      }

      // 4. Demote session if currently logged in as this user
      try {
        const rawSession = localStorage.getItem('xenova_session');
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session.email?.toLowerCase() === cleanEmail && session.role === 'organizer') {
            session.role = 'player';
            localStorage.setItem('xenova_session', JSON.stringify(session));
            window.dispatchEvent(new Event('xenova-auth-change'));
          }
        }
      } catch {}

      await loadData();
      alert(`Organizer privileges revoked for ${cleanEmail}.`);
    } catch (e) {
      console.error(e);
      alert('Failed to remove organizer privileges.');
      await loadData();
    }
  };

  const getOrganizerTournaments = (email: string, orgName?: string) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    const emailPrefix = cleanEmail.split('@')[0];
    const cleanName = (orgName || '').toLowerCase().trim();

    return tournaments.filter((t: any) => {
      const createdBy = (t.createdBy || t.organizer_email || '').toLowerCase().trim();
      const host = (t.host || '').toLowerCase().trim();
      const title = (t.title || t.name || '').toLowerCase().trim();

      const emailMatch = cleanEmail && (
        createdBy === cleanEmail ||
        host === cleanEmail ||
        host.includes(cleanEmail) ||
        (emailPrefix && emailPrefix.length > 2 && (host.includes(emailPrefix) || createdBy.includes(emailPrefix)))
      );

      const nameMatch = cleanName && (
        host === cleanName ||
        host.includes(cleanName) ||
        cleanName.includes(host) ||
        (cleanName.length > 3 && host.includes(cleanName.split(' ')[0].toLowerCase())) ||
        (cleanName.length > 3 && title.includes(cleanName.split(' ')[0].toLowerCase()))
      );

      return Boolean(emailMatch || nameMatch);
    });
  };

  // Compute total hosted lobbies across all approved organizers
  const totalHostedLobbies = organizers.reduce((acc, org) => {
    const count = getOrganizerTournaments(org.email, org.name).length;
    return acc + count;
  }, 0);

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

      {/* Top Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-white/10 bg-[#0C111D] rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified Organizers</p>
            <h3 className="text-3xl font-black text-white italic mt-1">{organizers.length}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 border border-white/10 bg-[#0C111D] rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hosted Event Lobbies</p>
            <h3 className="text-3xl font-black text-white italic mt-1">{totalHostedLobbies}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Trophy className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 border border-white/10 bg-[#0C111D] rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Connection</p>
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Synced
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

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
              const orgTournaments = getOrganizerTournaments(org.email, org.name);
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
