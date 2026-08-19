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
  Eye
} from 'lucide-react';

import { flaskApi } from '@/lib/flask-api';

interface Organizer {
  email: string;
  name: string;
  role: string;
  tag: string;
}

interface Tournament {
  id: string;
  name: string;
  game: string;
  slug: string;
  createdBy: string;
  status: string;
}

export default function AdminOrganizerManagementPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);

  const loadOrganizers = () => {
    try {
      const rawUsers = localStorage.getItem('xenova_users');
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      const org = users.filter((u: Organizer) => u.role === 'organizer');
      setOrganizers(org);

      // Load tournaments
      const rawTournaments = localStorage.getItem('xenova_tournaments');
      const tourn = rawTournaments ? JSON.parse(rawTournaments) : [];
      setTournaments(tourn);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrganizers();
  }, []);

  const removeOrganizer = async (email: string) => {
    if (!confirm(`Remove ${email} as organizer? They will no longer be able to create tournaments.`)) return;

    try {
      // 1. Demote user in Supabase to 'PLAYER'
      await flaskApi.updateUserRole(email, 'PLAYER');

      // 2. Update local state
      const rawUsers = localStorage.getItem('xenova_users');
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      const updated = users.map((u: Organizer) => {
        if (u.email === email) {
          return { ...u, role: 'player' };
        }
        return u;
      });
      localStorage.setItem('xenova_users', JSON.stringify(updated));

      // 3. Demote session if active
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session.email === email && session.role === 'organizer') {
          session.role = 'player';
          localStorage.setItem('xenova_session', JSON.stringify(session));
          window.dispatchEvent(new Event('xenova-auth-change'));
        }
      }

      loadOrganizers();
      alert('Organizer status removed');
    } catch (e) {
      console.error(e);
      alert('Failed to remove organizer');
    }
  };

  const getOrganizerTournaments = (email: string) => {
    return tournaments.filter((t: Tournament) => t.createdBy === email);
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
            Manage approved organizers, view tournaments, and remove host privileges as needed.
          </p>
        </div>
      </header>

      {/* Organizers Grid */}
      {organizers.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-slate-500">
          <Users className="h-10 w-10 mx-auto text-slate-600 mb-4" />
          <p className="text-sm font-bold uppercase tracking-wider">No approved organizers yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {organizers.map((org, idx) => {
              const orgTournaments = getOrganizerTournaments(org.email);
              const isExpanded = selectedOrganizer === org.email;

              return (
                <motion.div
                  key={org.email}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="border border-white/10 bg-[#0C111D] rounded-2xl overflow-hidden"
                >
                  {/* Main Card */}
                  <div
                    onClick={() => setSelectedOrganizer(isExpanded ? null : org.email)}
                    className="w-full text-left p-6 hover:bg-white/[0.02] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">{org.name || 'Unknown'}</h3>
                        <div className="grid gap-2 sm:grid-cols-3 text-xs font-semibold text-slate-400 mt-3">
                          <span className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            {org.email}
                          </span>
                          <span className="flex items-center gap-2">
                            <Trophy className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            {orgTournaments.length} Tournament{orgTournaments.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-md w-fit">
                            ORGANIZER
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap lg:flex-col lg:items-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeOrganizer(org.email);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition text-xs font-bold uppercase tracking-widest text-rose-400 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
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
                      <h4 className="text-lg font-black italic uppercase tracking-tight mb-4 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-indigo-400" />
                        Tournaments ({orgTournaments.length})
                      </h4>

                      {orgTournaments.length === 0 ? (
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">No tournaments created</p>
                      ) : (
                        <div className="space-y-3">
                          {orgTournaments.map((tourn: Tournament) => (
                            <div
                              key={tourn.id}
                              className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.02] rounded-lg hover:border-white/10 transition"
                            >
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-white truncate">{tourn.name}</h5>
                                <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
                                  <span>{tourn.game}</span>
                                  <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${tourn.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                      tourn.status === 'completed' ? 'bg-slate-500/20 text-slate-400' :
                                        'bg-amber-500/20 text-amber-400'
                                    }`}>
                                    {tourn.status}
                                  </span>
                                </div>
                              </div>
                              <Link
                                href={`/tournaments/${tourn.slug}`}
                                className="ml-4 inline-flex items-center gap-2 px-3 py-2 border border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition text-xs font-bold uppercase tracking-widest text-white rounded-lg whitespace-nowrap"
                              >
                                <Eye className="h-4 w-4" />
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
