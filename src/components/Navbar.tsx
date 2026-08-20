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
  Zap
} from 'lucide-react';

import TicketBookingModal from './TicketBookingModal';

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
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const joinRef = useRef<HTMLDivElement>(null);

  const isLanding = pathname === '/';
  const isLogin = pathname === '/login';
  const isAdmin = pathname?.startsWith('/admin');
  const isHostFlow = pathname === '/host';

  const syncSession = () => {
    try {
      const rawSession = localStorage.getItem('xenova_session');
      setSession(rawSession ? JSON.parse(rawSession) : null);
    } catch (error) {
      setSession(null);
    }
  };

  useEffect(() => {
    syncSession();
    window.addEventListener('storage', syncSession);
    window.addEventListener('xenova-auth-change', syncSession);
    
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
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('xenova-auth-change', syncSession);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const goLogin = () => {
    router.push('/login');
  };

  const logout = () => {
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
                    setIsTicketModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition text-left uppercase tracking-wider nav-menu-link"
                >
                  <Sparkles className="h-4 w-4" />
                  BOOK TICKET
                </button>
                <button
                  onClick={() => {
                    setJoinDropdownOpen(false);
                    router.push('/host');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white rounded-xl transition text-left uppercase tracking-wider nav-menu-link"
                >
                  <Trophy className="h-4 w-4 text-emerald-400" />
                  HOST EVENT
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                className="flex items-center justify-center p-2.5 rounded-full border border-white/15 bg-black/60 backdrop-blur-2xl text-zinc-200 hover:text-white hover:bg-white/10 transition shadow-lg group cursor-pointer"
                title="Gamer Profile"
              >
                <User className="h-4.5 w-4.5 text-emerald-400 group-hover:scale-110 transition-transform" />
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
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{session?.email || 'user@xenova.gg'}</p>
                    </div>

                    {/* Links */}
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white rounded-xl transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-emerald-400" />
                      Account Settings
                    </Link>

                    <Link
                      href={`/players/${encodeURIComponent((session?.tag || session?.name || 'profile').toString().toLowerCase().replace(/\s+/g, '-'))}`}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-white/10 hover:text-white rounded-xl transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User className="h-4 w-4 text-emerald-400" />
                      Gamer Profile
                    </Link>

                    <div className="border-t border-white/10 my-1" />

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition text-left"
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
    <TicketBookingModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} />
    </>
  );
};
