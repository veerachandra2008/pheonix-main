'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Building2,
  CalendarDays, 
  Gamepad2, 
  LayoutDashboard, 
  LogOut, 
  Users,
  ShieldCheck,
  Ticket
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Exclude the login page itself from authentication check
    if (pathname === '/admin/login') {
      setIsAdmin(true);
      return;
    }

    const checkAdminAuth = () => {
      try {
        const adminSession = localStorage.getItem('xenova_admin_session');
        const mainSession = localStorage.getItem('xenova_session');
        const raw = adminSession || mainSession;

        if (!raw) {
          setIsAdmin(false);
          router.replace('/admin/login');
          return;
        }

        const parsed = JSON.parse(raw);
        const role = (parsed?.role || '').toLowerCase();
        const email = (parsed?.email || '').toLowerCase();

        if (role === 'admin' || email === 'admin@xenova.gg') {
          setIsAdmin(true);
          flaskApi.preloadAdminData();
        } else {
          setIsAdmin(false);
          router.replace('/admin/login');
        }
      } catch {
        setIsAdmin(false);
        router.replace('/admin/login');
      }
    };

    checkAdminAuth();
    window.addEventListener('xenova-auth-change', checkAdminAuth);
    return () => window.removeEventListener('xenova-auth-change', checkAdminAuth);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('xenova_admin_session');
    router.replace('/admin/login');
  };

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  // If we are on the admin login page, we don't display the admin sidebar layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/organizer-applications', label: 'Applications', icon: Users },
    { href: '/admin/organizer-management', label: 'Organizers', icon: Users },
    { href: '/admin/colleges', label: 'Colleges', icon: Building2 },
    { href: '/admin/teams', label: 'Teams', icon: ShieldCheck },
    { href: '/admin/event-management', label: 'Event Control', icon: CalendarDays },
    { href: '/admin/registrations', label: 'Registrations', icon: Ticket },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen bg-[#070B14] text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-[#0C111D] p-6 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 mb-10">
            <span className="flex h-10 w-10 items-center justify-center border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]" style={{ borderRadius: 10 }}>
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#EEEEEE]">XENOVA</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500">Admin Control</p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest transition rounded-xl ${
                    active 
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action / Logout */}
        <div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
