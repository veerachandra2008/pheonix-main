'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Share2
} from 'lucide-react';
import { playerStandings, type LeaderboardEntry } from '../../leaderboards/data';
import FinalCTA from '@/components/xenova/FinalCTA';

type Props = {
  params: Promise<{ id: string }>;
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
  const { id } = use(params);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [targetUser, setTargetUser] = useState<Player | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        setCurrentUser(JSON.parse(rawSession));
      } catch (e) {
        console.error(e);
      }
    }

    const rawUsers = localStorage.getItem('xenova_users');
    if (rawUsers) {
      try {
        const users = JSON.parse(rawUsers);
        const match = users.find((u: Player) => u.id === id || slugify(u.name || '') === id || u.tag?.toLowerCase() === id.toLowerCase());
        if (match) setTargetUser(match);
      } catch (e) {
        console.error(e);
      }
    }
  }, [id]);

  const playerName = targetUser?.name || id.replace(/-/g, ' ').toUpperCase();
  const playerTag = targetUser?.tag || `@${id.toLowerCase()}`;
  const playerCollege = targetUser?.college || 'Nexus Institute of Technology';
  const playerTeam = targetUser?.team || 'Team Titans';

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

        {/* Back Button */}
        <div className="absolute top-8 left-0 right-0 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/players"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Athletes
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white shadow-2xl cursor-pointer"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Profile'}
          </button>
        </div>

        {/* Player Identity */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-28">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            
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
