'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  ArrowLeft, 
  BadgeCheck, 
  Crown, 
  Gamepad2, 
  ShieldCheck, 
  Trophy, 
  Zap,
  Target,
  ChevronRight,
  TrendingUp,
  Building2,
  Users,
  Check,
  Share2,
  Ticket,
  ExternalLink
} from 'lucide-react';
import { playerStandings, type LeaderboardEntry } from '../../leaderboards/data';
import { getUserRegistrations, TournamentRegistrationRecord } from '@/lib/tournaments-db';
import FinalCTA from '@/components/xenova/FinalCTA';

type Props = {
  params?: Promise<{ id: string }>;
};

type Player = {
  id?: string;
  name?: string;
  email?: string;
  tag?: string;
  bio?: string;
  detail?: string;
  profilePic?: string;
  college?: string;
  team?: string;
  followers?: string[];
  following?: string[];
};

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export default function PlayerProfilePage({ params }: Props) {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || '';
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [targetUser, setTargetUser] = useState<Player | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [userPasses, setUserPasses] = useState<TournamentRegistrationRecord[]>([]);

  useEffect(() => {
    let sessionUser: Player | null = null;
    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        sessionUser = JSON.parse(rawSession);
        setCurrentUser(sessionUser);
      } catch (e) {
        console.error(e);
      }
    }

    let foundTarget: Player | null = null;
    const rawUsers = localStorage.getItem('xenova_users');
    if (rawUsers) {
      try {
        const users = JSON.parse(rawUsers);
        const match = users.find((u: Player) => u.id === id || slugify(u.name || '') === id || u.tag?.toLowerCase() === id.toLowerCase());
        if (match) {
          foundTarget = match;
          setTargetUser(match);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Load registered passes for this athlete
    const emailToLookup = foundTarget?.email || (sessionUser && (slugify(sessionUser.name || '') === id || sessionUser.tag?.toLowerCase() === id.toLowerCase() || sessionUser.id === id) ? sessionUser.email : undefined) || sessionUser?.email;
    if (emailToLookup) {
      getUserRegistrations(emailToLookup).then((regs) => {
        setUserPasses(regs || []);
      });
    }
  }, [id]);

  const playerName = targetUser?.name || (currentUser && (slugify(currentUser.name || '') === id || currentUser.tag?.toLowerCase() === id.toLowerCase() || currentUser.id === id) ? currentUser.name : id.replace(/-/g, ' ').toUpperCase()) || 'ATHLETE';
  const playerTag = targetUser?.tag || (currentUser && (slugify(currentUser.name || '') === id || currentUser.tag?.toLowerCase() === id.toLowerCase() || currentUser.id === id) ? `@${currentUser.tag}` : `@${id.toLowerCase()}`);
  const playerCollege = targetUser?.college || (currentUser && (slugify(currentUser.name || '') === id || currentUser.tag?.toLowerCase() === id.toLowerCase() || currentUser.id === id) ? currentUser.college : 'Nexus Institute of Technology');
  const playerTeam = targetUser?.team || (currentUser && (slugify(currentUser.name || '') === id || currentUser.tag?.toLowerCase() === id.toLowerCase() || currentUser.id === id) ? currentUser.team : 'Team Titans');

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <section className="relative min-h-[440px] w-full overflow-hidden border-b border-zinc-900 bg-black flex items-end">
        
        <div className="absolute inset-0 z-0">
          <img
            src="/apex.jpg"
            alt={playerName}
            className="w-full h-full object-cover filter brightness-[0.35] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 w-full">
          
          <div className="flex items-center justify-between gap-4 mb-8">
            <Link
              href="/players"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Players
            </Link>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white transition active:scale-95"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              {copiedLink ? 'Link Copied!' : 'Share Profile'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
            
            {/* Avatar Crest */}
            <div className="relative grid place-items-center h-28 w-28 sm:h-36 sm:w-36 rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/10 font-black text-emerald-400 text-3xl sm:text-4xl shadow-2xl shrink-0">
              {playerName.slice(0, 2).toUpperCase()}
            </div>

            {/* Meta */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified University Student
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase">
                  <Crown className="h-3.5 w-3.5" /> 4,120 ELO Points
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                {playerName}
              </h1>

              <p className="text-xs sm:text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{playerTag}</span>
                <span>•</span>
                <Building2 className="h-4 w-4 text-emerald-400" /> {playerCollege}
                <span>•</span>
                <span className="text-zinc-400">Team: <strong className="text-white">{playerTeam}</strong></span>
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════ STATS & METRICS ═══════════════ */}
      <section className="py-14 sm:py-16 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">K/D Ratio</span>
              <p className="text-3xl font-black text-emerald-400 mt-1">2.48</p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Win Rate</span>
              <p className="text-3xl font-black text-white mt-1">84%</p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tournaments Won</span>
              <p className="text-3xl font-black text-amber-400 mt-1">7 Titles</p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-[#09090b]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Followers</span>
              <p className="text-3xl font-black text-white mt-1">{targetUser?.followers?.length || 142}</p>
            </div>
          </div>

          {/* Registered Tournament Passes */}
          {userPasses.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/20 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5" /> Authenticated Passes
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                    Active Tournament Passes ({userPasses.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPasses.map((pass, idx) => (
                  <div
                    key={pass.passId ? `${pass.passId}-${idx}` : `pass-${idx}`}
                    className="p-5 rounded-2xl bg-black border border-white/10 hover:border-emerald-500/50 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                        {pass.passId}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        {pass.tournamentFormat || 'Tournament'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white truncate">{pass.tournamentTitle}</h4>
                    <p className="text-xs text-zinc-400 truncate">Squad: <span className="text-emerald-400 font-bold">{pass.teamName}</span> • {pass.college}</p>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        {new Date(pass.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <Link
                        href={`/registration/${pass.tournamentSlug}/pass?passId=${pass.passId}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 hover:text-emerald-300 transition uppercase tracking-wider"
                      >
                        View Pass <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-[#09090b] p-8 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black uppercase tracking-tight text-white">Athlete Bio & Competition Specialty</h3>
            <p className="text-sm text-zinc-300 leading-relaxed font-normal">
              {targetUser?.bio || `${playerName} is a competitive collegiate esports athlete specializing in tactical 5v5 FPS tournaments. Holding active student credentials, they lead team communications and site execution.`}
            </p>
          </div>

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
