"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Gamepad2,
  LogOut,
  Bell,
  Settings,
  Sparkles,
  User,
  ChevronDown,
  Trophy,
  ShieldCheck,
  Zap,
  MessageSquare
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';
import { supabase } from '@/lib/supabase';

const navLinks = [
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/colleges', label: 'Colleges' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
  { href: '/leaderboards', label: 'Leaderboards' },
];

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [joinDropdownOpen, setJoinDropdownOpen] = useState(false);
  const [hasSubmittedTicket, setHasSubmittedTicket] = useState(false);
  const [hasAdminReply, setHasAdminReply] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const joinRef = useRef<HTMLDivElement>(null);

  const isLanding = pathname === '/';
  const isLogin = pathname === '/login';
  const isAdmin = pathname?.startsWith('/admin');
  const isHostFlow = pathname === '/host';

  const checkTicketsStatus = async (userEmail?: string) => {
    try {
      const email = userEmail || (localStorage.getItem('xenova_last_contact_email') || '').trim().toLowerCase();
      const localTickets = JSON.parse(localStorage.getItem('xenova_user_contact_tickets') || '[]');

      if (localTickets.length > 0) {
        setHasSubmittedTicket(true);
      }

      if (email) {
        const res = await flaskApi.getUserContactMessages(email);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setHasSubmittedTicket(true);
          const hasReply = res.data.some((t: any) => Boolean(t.admin_reply));
          setHasAdminReply(hasReply);
          return;
        }
      }

      if (localTickets.length > 0) {
        setHasSubmittedTicket(true);
      } else {
        setHasSubmittedTicket(false);
        setHasAdminReply(false);
      }
    } catch {
      // Ignore
    }
  };

  const syncSession = () => {
    try {
      const rawSession = localStorage.getItem('xenova_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        setSession((prev: any) => {
          if (!prev || prev.avatar !== parsed.avatar || prev.avatar_url !== parsed.avatar_url || prev.name !== parsed.name) {
            return parsed;
          }
          return prev;
        });
        checkTicketsStatus(parsed.email);
      } else {
        setSession(null);
        checkTicketsStatus();
      }
    } catch (error) {
      setSession(null);
      checkTicketsStatus();
    }
  };

  useEffect(() => {
    syncSession();
    checkTicketsStatus();

    const handleTicketSubmitted = () => {
      checkTicketsStatus();
    };

    // Single source of truth: Listen directly to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sbSession) => {
      if (event === 'SIGNED_OUT' || !sbSession) {
        localStorage.removeItem('xenova_session');
        setSession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        syncSession();
      }
    });

    window.addEventListener('storage', syncSession);
    window.addEventListener('xenova-auth-change', syncSession);
    window.addEventListener('xenova-contact-ticket-submitted', handleTicketSubmitted);
    window.addEventListener('focus', syncSession);
    document.addEventListener('visibilitychange', syncSession);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (joinRef.current && !joinRef.current.contains(event.target as Node)) {
        setJoinDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('xenova-auth-change', syncSession);
      window.removeEventListener('xenova-contact-ticket-submitted', handleTicketSubmitted);
      window.removeEventListener('focus', syncSession);
      document.removeEventListener('visibilitychange', syncSession);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Re-sync session immediately whenever the route/page changes
  useEffect(() => {
    syncSession();
  }, [pathname]);

  const goLogin = () => {
    router.push('/login');
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('xenova_session');
    setSession(null);
    window.dispatchEvent(new Event('xenova-auth-change'));
    router.push('/');
  };

  if (isAdmin || isHostFlow) {
    return null;
  }

  const userInitials = session?.name
    ? session.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'XP';

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 pointer-events-none transition-all duration-300">
      
      {/* 1. STANDALONE BRAND LOGO PILL (LEFT) */}
      <div className="pointer-events-auto flex items-center">
        <Link
          href="/"
          className="flex items-center justify-center p-2 sm:p-2.5 rounded-full border border-emerald-500/40 bg-black/60 backdrop-blur-2xl shadow-xl transition duration-200 hover:scale-105 hover:bg-emerald-500/10 group"
          title="XENOVA Home"
        >
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
            <Zap className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-400 fill-emerald-400 group-hover:rotate-12 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 2. STANDALONE FLOATING NAV LINKS PILL (PERFECT DEAD CENTER ALIGNMENT) */}
      <div className="pointer-events-auto hidden md:flex items-center gap-1 bg-black/85 p-1.5 rounded-full border border-white/15 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] absolute left-1/2 -translate-x-1/2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={`nav-menu-link relative px-4 py-2 text-[11px] sm:text-xs font-black uppercase tracking-[0.16em] transition-all duration-300 rounded-full flex items-center gap-1.5 ${
                isActive
                  ? 'text-zinc-950 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] font-bold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-pulse inline-block" />
              )}
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* 3. STANDALONE ACTION PILL (RIGHT) */}
      <div className="pointer-events-auto flex items-center gap-2.5 ml-auto">
        {/* JOIN Button with Blob Hover & Click Dropdown */}
        <div
          className="relative"
          ref={joinRef}
          onMouseEnter={() => setJoinDropdownOpen(true)}
          onMouseLeave={() => setJoinDropdownOpen(false)}
        >
          <button
            onClick={() => setJoinDropdownOpen(!joinDropdownOpen)}
            className="blob-btn inline-flex items-center gap-1.5 bg-emerald-500 px-4.5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-950 rounded-full hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/30 whitespace-nowrap cursor-pointer border border-emerald-400/40"
          >
            <Zap className="h-4 w-4 fill-zinc-950 text-zinc-950" />
            <span className="nav-menu-link tracking-[0.15em]">JOIN</span>
            <ChevronDown className={`h-4 w-4 transition duration-200 ${joinDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {joinDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/15 bg-black/95 p-2 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] z-50"
              >
                <button
                  onClick={() => {
                    setJoinDropdownOpen(false);
                    router.push('/tournaments');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition text-left uppercase tracking-wider nav-menu-link cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  BOOK TICKET
                </button>
                <button
                  onClick={() => {
                    setJoinDropdownOpen(false);
                    router.push('/host');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white rounded-xl transition text-left uppercase tracking-wider nav-menu-link cursor-pointer"
                >
                  <Trophy className="h-4 w-4 text-emerald-400" />
                  HOST EVENT
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User's Support Tickets & Admin Replies Button (ONLY VISIBLE IF USER HAS SUBMITTED A CONTACT FORM) */}
        {hasSubmittedTicket && (
          <Link
            href="/my-tickets"
            className={`inline-flex items-center gap-1.5 backdrop-blur-2xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full transition shadow-lg cursor-pointer shrink-0 border ${
              hasAdminReply
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-emerald-500/25 hover:bg-emerald-500/30'
                : 'bg-zinc-900/90 text-zinc-300 border-white/15 hover:bg-white/10 hover:text-white'
            }`}
            title="View Admin Replies to your submitted tickets"
          >
            <MessageSquare className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${hasAdminReply ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>Admin Reply</span>
            {hasAdminReply ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-pulse" />
            )}
          </Link>
        )}

        {/* Admin Button beside Sign In / Profile */}
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-2xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 rounded-full transition shadow-lg cursor-pointer shrink-0"
          title="Admin Portal"
        >
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <span>Admin</span>
        </Link>

        {isLogin ? (
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 border border-white/15 bg-black/60 backdrop-blur-2xl px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-200 rounded-full hover:bg-white/10 hover:text-white transition shadow-lg cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : session ? (
          <>
            {/* Notification Bell */}
            <Link
              href="/notifications"
              className="p-2.5 text-zinc-300 hover:text-white bg-black/60 backdrop-blur-2xl border border-white/15 hover:bg-white/10 rounded-full transition relative shrink-0 shadow-lg"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            </Link>

            {/* Icon-only Compact Person/Profile Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center h-9 w-9 rounded-full border border-white/15 bg-black/60 backdrop-blur-2xl text-zinc-200 hover:text-white hover:bg-white/10 transition shadow-lg group cursor-pointer overflow-hidden"
                title="Gamer Profile"
              >
                {session?.avatar || session?.avatar_url ? (
                  <img
                    key={session.avatar || session.avatar_url}
                    src={session.avatar || session.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-4.5 w-4.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                )}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/15 bg-black/95 p-2 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] z-50"
                  >
                    {/* User Header */}
                    <div className="px-3.5 py-3 border-b border-white/10 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px]">{session?.name || 'Competitor'}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{session?.email || 'verified_gamer@xenova.gg'}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition"
                    >
                      <Gamepad2 className="h-4 w-4 text-emerald-400" />
                      Dashboard & Pass
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition"
                    >
                      <Settings className="h-4 w-4 text-zinc-400" />
                      Profile Settings
                    </Link>

                    {hasSubmittedTicket && (
                      <Link
                        href="/my-tickets"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="h-4 w-4" />
                          Support & Replies
                        </div>
                        {hasAdminReply && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <button
            onClick={goLogin}
            className="inline-flex items-center gap-2 border border-white/15 bg-black/60 backdrop-blur-2xl px-5 py-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white rounded-full hover:bg-white/10 transition shadow-xl cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
    </>
  );
};
