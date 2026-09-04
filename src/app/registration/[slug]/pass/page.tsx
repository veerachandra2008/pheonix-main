'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  CheckCircle2,
  Trophy,
  CalendarDays,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Zap,
  Download,
  ExternalLink,
} from 'lucide-react';
import { QRCodeComponent } from '@/components/QRCodeComponent';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';

interface PageProps {
  params?: Promise<{ slug: string }>;
}

const GAME_IMAGES: Record<string, string> = {
  Valorant: '/valorant.jpg',
  VALORANT: '/valorant.jpg',
  BGMI: '/bgmi.jpg',
  'Free Fire': '/freefire.jpg',
  CS2: '/cs2.jpg',
  'Apex Legends': '/apex.jpg',
  'FC / FIFA': '/fc.jpg',
  default: '/hero-arena.jpg',
};

export default function RegistrationPass({ params: paramsPromise }: PageProps) {
  const urlParams = useParams();
  const rawSlug = (urlParams?.slug as string) || '';
  const [slug, setSlug] = useState(rawSlug);
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketPassId = searchParams.get('passId');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [origin, setOrigin] = useState('https://xenova.gg');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (paramsPromise) {
      paramsPromise.then((p) => {
        if (p?.slug) setSlug(p.slug);
      }).catch(() => {});
    }
  }, [paramsPromise]);

  useEffect(() => {
    async function fetchTicket() {
      const apiBase = getApiBaseUrl();

      let resolvedPassId = ticketPassId;

      // 1. If no passId in URL search params, check sessionStorage
      if (!resolvedPassId) {
        try {
          const rawSession = sessionStorage.getItem('reg_selection');
          if (rawSession) {
            const data = JSON.parse(rawSession);
            if (data.passId) {
              resolvedPassId = data.passId;
            }
          }
        } catch {}
      }

      // 2. If still no passId, check logged in user session and lookup registered pass
      if (!resolvedPassId) {
        try {
          const rawUser = localStorage.getItem('xenova_session');
          if (rawUser) {
            const user = JSON.parse(rawUser);
            if (user?.email) {
              const res = await fetch(`${apiBase}/registrations?email=${encodeURIComponent(user.email.trim().toLowerCase())}`, { cache: 'no-store' });
              if (res.ok) {
                const result = await res.json();
                if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                  // Find registration matching this tournament slug, or get latest
                  const match = result.data.find((r: any) => {
                    const rSlug = (r.tournament_slug || r.tournamentSlug || '').toLowerCase();
                    return rSlug === slug.toLowerCase();
                  }) || result.data[0];

                  if (match) {
                    resolvedPassId = match.pass_id || match.passId;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('User session registration lookup notice:', e);
        }
      }

      if (!resolvedPassId) {
        setErrorMsg('No pass ID provided. Please complete registration to view your ticket.');
        setLoading(false);
        return;
      }

      // 3. Fetch from Backend API (/api/registrations/:passId)
      try {
        const res = await fetch(`${apiBase}/registrations/${resolvedPassId}`, { cache: 'no-store' });
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            setTicketData(result.data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend API pass lookup warning:', err);
      }

      // 4. Supabase Direct Query Fallback
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('pass_id', resolvedPassId);

        if (!error && data && data.length > 0) {
          const item = data[0];
          let userBio = item.bio || '';
          if (!userBio && item.email) {
            try {
              const { data: uData } = await supabase.from('users').select('bio, role, tag').eq('email', item.email).maybeSingle();
              if (uData?.bio) userBio = uData.bio;
            } catch {}
          }

          const { data: rosterRows } = await supabase
            .from('tournament_rosters')
            .select('*')
            .eq('pass_id', resolvedPassId)
            .order('slot');

          const players = (rosterRows || []).map((p: any) => ({
            slot: p.slot,
            name: p.player_name,
            inGameTag: p.in_game_tag,
            email: p.email,
            phone: p.phone || '',
            isCaptain: p.is_captain ?? (p.slot === 1)
          }));

          setTicketData({
            passId: item.pass_id,
            pass_id: item.pass_id,
            tournamentSlug: item.tournament_slug || slug,
            tournamentTitle: item.tournament_title || 'Esports Championship',
            teamName: item.team_name,
            college: item.college,
            captainName: item.captain_name,
            email: item.email,
            bio: userBio || 'Compete with honor, dominate with strategy. Verified Collegiate Athlete.',
            paymentStatus: item.payment_status || 'SUCCESS',
            registeredAt: item.registered_at || new Date().toISOString(),
            players
          });
          setLoading(false);
          return;
        }
      } catch (sbErr) {
        console.warn('Direct Supabase pass query notice:', sbErr);
      }

      setErrorMsg(`No authentic registration found for Pass ID: ${resolvedPassId}`);
      setLoading(false);
    }

    fetchTicket();
  }, [ticketPassId, slug]);

  const handleDownloadPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-emerald-500 animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm font-medium">Fetching verified ticket from database...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !ticketData) {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md bg-white/[0.04] border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
          <p className="text-sm text-zinc-400">{errorMsg}</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition"
          >
            Browse Tournaments
          </Link>
        </div>
      </main>
    );
  }

  const gameImage = GAME_IMAGES[ticketData?.tournamentGame] || GAME_IMAGES.default;
  const verificationUrl = `${origin}/verify/${ticketData?.passId}`;

  return (
    <main className="min-h-screen bg-[#09090b] text-white font-sans">
      {/* ─── STICKY TOP NAV ─── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-black text-white tracking-tight">XENOVA</span>
          </Link>

          {/* Step Indicator — all complete */}
          <div className="hidden sm:flex items-center gap-2">
            {['Select Team', 'Verify Squad', 'Entry Pass'].map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {label}
                </div>
                {i < 2 && <div className="w-4 h-px bg-emerald-500/20" />}
              </React.Fragment>
            ))}
          </div>

          <div className="text-xs text-emerald-500 font-bold">Verified ✓</div>
        </div>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-3 no-print">
          <div className="relative inline-flex">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-40" />
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Registration Complete!</h1>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Your official esports ticket has been generated and recorded in the database. Present this pass at match lobbies.
            </p>
          </div>
        </div>

        {/* ══ ENTRY PASS TICKET CARD (REF FOR HTML2CANVAS) ══ */}
        <div
          ref={ticketRef}
          id="ticket-pass-card"
          className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#111115]"
          style={{ boxShadow: '0 0 60px rgba(16,185,129,0.08), 0 25px 50px rgba(0,0,0,0.8)' }}
        >
          {/* Top banner image */}
          <div className="relative h-40 w-full overflow-hidden">
            <img
              src={gameImage}
              alt={ticketData?.tournamentGame}
              className="w-full h-full object-cover brightness-50 saturate-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-[#111115]" />

            {/* Pass header overlay */}
            <div className="absolute inset-0 flex items-center justify-between px-7">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Official Entry Pass
                </p>
                <p className="text-white font-black text-xl leading-tight">{ticketData?.tournamentTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Game</p>
                <p className="text-emerald-400 font-black text-sm">{ticketData?.tournamentGame}</p>
              </div>
            </div>
          </div>

          {/* Pass body */}
          <div className="bg-[#111115] px-7 py-6 space-y-6">
            {/* Team + status banner */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center font-black text-xl text-emerald-400 shrink-0">
                {ticketData?.teamName?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-black text-white">{ticketData?.teamName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{ticketData?.college}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider inline-block">
                  {ticketData?.paymentStatus || 'VERIFIED'}
                </div>
              </div>
            </div>

            {/* Athlete Bio & Squad Motto */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-start gap-2.5 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    Athlete Bio & Squad Motto
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    VERIFIED
                  </span>
                </div>
                <p className="text-zinc-200 italic font-normal leading-relaxed">
                  “{ticketData?.bio || 'Compete with honor, dominate with strategy. Official collegiate esports athlete.'}”
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-white/[0.1]" />

            {/* Official 4-Player Verified Squad Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Verified Squad Roster
                </p>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {ticketData?.players?.length ? `${ticketData.players.length} Players Registered` : 'Roster Confirmed'}
                </span>
              </div>

              <div className="space-y-2">
                {ticketData?.players && ticketData.players.length > 0 ? (
                  ticketData.players.map((p: any) => (
                    <div
                      key={p.slot || p.email}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          p.isCaptain || p.slot === 1
                            ? 'bg-emerald-500 text-black'
                            : 'bg-white/10 text-zinc-400'
                        }`}>
                          {p.isCaptain || p.slot === 1 ? '👑 Captain' : `P${p.slot}`}
                        </span>
                        <span className="font-bold text-white truncate">{p.name}</span>
                        <span className="font-mono text-emerald-400 text-[11px]">({p.inGameTag || 'IGN'})</span>
                      </div>
                      <span className="font-mono text-zinc-400 text-[11px] truncate max-w-[170px] text-right">{p.email}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Captain: {ticketData?.captainName || ticketData?.captain_name || ticketData?.name || 'Registered'}</span>
                    <span className="font-mono text-zinc-500 text-[11px]">{ticketData?.email || ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-white/[0.1]" />

            {/* Pass ID + Live Scannable QR Code */}
            <div className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unique Pass ID</p>
                <p className="text-xl font-black text-emerald-400 font-mono tracking-widest">{ticketData?.passId}</p>
                <p className="text-[10px] text-zinc-500">Scan QR to verify authentic ticket status on server</p>
              </div>

              {/* Scannable QR Code Component */}
              <div className="p-2 bg-white rounded-2xl shrink-0 shadow-lg border border-white/20">
                <QRCodeComponent value={verificationUrl} size={84} />
              </div>
            </div>

            {/* Footer accent */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified by Xenova Esports Engine
              </span>
              <span>Ref: {ticketData?.passId}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 no-print">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-black font-black text-sm uppercase tracking-wider hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
          >
            <Download className="h-4 w-4" />
            Print / Save Pass (PDF)
          </button>

          <Link
            href={`/verify/${ticketData?.passId}`}
            target="_blank"
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white font-bold text-sm uppercase tracking-wider hover:bg-white/[0.08] transition"
          >
            <ExternalLink className="h-4 w-4" />
            Verify Ticket URL
          </Link>
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 no-print">
          <Link href="/dashboard" className="hover:text-emerald-400 transition flex items-center gap-1">
            Go to My Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/tournaments" className="hover:text-emerald-400 transition">
            Browse All Tournaments
          </Link>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #09090b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          #ticket-pass-card {
            box-shadow: none !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </main>
  );
}
