'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Calendar,
  MapPin,
  Gamepad2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Trophy,
  Activity,
  UserCheck
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { tournaments as defaultTournaments } from '@/app/tournaments/data';
import { getApiBaseUrl } from '@/lib/api-config';

export default function OrganizerAttendanceHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function checkAuthAndLoad() {
      const rawSession = localStorage.getItem('xenova_session');
      if (!rawSession) {
        router.replace('/login');
        return;
      }

      try {
        const user = JSON.parse(rawSession);
        setSession(user);
        setAuthLoading(false);

        // Load tournaments and registrations
        const apiBase = getApiBaseUrl();

        let tournsList: any[] = defaultTournaments;
        try {
          const res = await fetch(`${apiBase}/tournaments/`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              tournsList = data.data;
            }
          }
        } catch { }

        let regsList: any[] = [];
        try {
          const res = await flaskApi.getRegistrationsByTournament();
          if (res.success && Array.isArray(res.data)) {
            regsList = res.data;
          }
        } catch { }

        setTournaments(tournsList);
        setRegistrations(regsList);
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndLoad();
  }, [router]);

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (t.title || t.name || '').toLowerCase().includes(q) ||
      (t.game || '').toLowerCase().includes(q) ||
      (t.region || '').toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#070B14] text-white selection:bg-emerald-500 selection:text-zinc-950 font-sans pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">

        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6">
          <Link
            href="/organizer/dashboard"
            className="inline-flex items-center gap-1 hover:text-white transition px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="text-emerald-400 font-black">Event Day Attendance Hub</span>
        </div>

        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0C111D] p-6 sm:p-8 shadow-2xl mb-8">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                Live Event Day Operations
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
              Event Attendance Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
              Select an active tournament to open the live check-in desk, mark teams as Present, track no-shows, and close event attendance.
            </p>
          </div>
        </section>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament name, game, or region..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#0C111D] border border-white/10 focus:border-emerald-500 rounded-2xl text-white text-sm outline-none font-medium placeholder:text-slate-500"
          />
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Tournaments...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => {
              const slug = tournament.slug || tournament.id;
              const tournRegs = registrations.filter(
                (r) => (r.tournament_slug || r.tournamentSlug || '').toLowerCase() === (slug || '').toLowerCase()
              );
              const presentCount = tournRegs.filter((r) => r.attendance_status === 'PRESENT').length;
              const absentCount = tournRegs.filter((r) => r.attendance_status === 'ABSENT').length;
              const notMarkedCount = tournRegs.filter((r) => !r.attendance_status || r.attendance_status === 'NOT_MARKED').length;

              return (
                <motion.div
                  key={slug}
                  whileHover={{ y: -4 }}
                  className="rounded-3xl border border-white/10 bg-[#0C111D] overflow-hidden flex flex-col justify-between shadow-xl transition"
                >
                  <div>
                    {/* Image Banner */}
                    <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                      <img
                        src={tournament.image || '/hero-arena.jpg'}
                        alt={tournament.title || tournament.name}
                        className="h-full w-full object-cover filter brightness-75 transition duration-500 hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/hero-arena.jpg'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0C111D] via-transparent to-transparent" />

                      <div className="absolute top-3 left-3">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-white shadow"
                          style={{ backgroundColor: tournament.status_color || '#10B981' }}
                        >
                          {tournament.status || 'Active'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white">
                        <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                          {tournament.game}
                        </span>
                        <span className="text-emerald-400 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                          {tournament.prize || '₹50,000'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      <h3 className="text-lg font-black uppercase tracking-tight text-white line-clamp-1">
                        {tournament.title || tournament.name}
                      </h3>

                      {/* Attendance Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-black/40 rounded-xl border border-white/5 text-center">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-emerald-400">Present</div>
                          <div className="text-base font-black text-white">{presentCount}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-rose-400">Absent</div>
                          <div className="text-base font-black text-white">{absentCount}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-amber-400">Awaiting</div>
                          <div className="text-base font-black text-white">{notMarkedCount || (tournRegs.length > 0 ? notMarkedCount : 5)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="p-6 pt-0">
                    <Link
                      href={`/organizer/tournament/${slug}/attendance`}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4" />
                      Open Event Attendance
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
