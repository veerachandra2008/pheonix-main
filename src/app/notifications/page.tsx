'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Trophy,
  Zap,
  CheckCheck,
  Sparkles
} from 'lucide-react';
import FinalCTA from '@/components/xenova/FinalCTA';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'tournament' | 'team' | 'system';
};

const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Tournament Registration Confirmed',
    message: 'Your squad Titans is locked in for VALORANT Collegiate League Season 4.',
    time: '10 mins ago',
    read: false,
    type: 'tournament',
  },
  {
    id: 'n2',
    title: 'Squad Roster Update',
    message: 'Nisha "Blaze" Menon updated team captain handle for Team Phoenix.',
    time: '1 hour ago',
    read: false,
    type: 'team',
  },
  {
    id: 'n3',
    title: 'Anti-Cheat Client Update',
    message: 'Xenova Anti-Cheat v4.2 client is required for tomorrow match lobbies.',
    time: '3 hours ago',
    read: true,
    type: 'system',
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  useEffect(() => {
    const raw = localStorage.getItem('xenova_notifications');
    if (raw) {
      try {
        setNotifications(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('xenova_notifications', JSON.stringify(updated));
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500 selection:text-zinc-950">
      
      <section className="relative overflow-hidden border-b border-zinc-900 bg-black py-12 sm:py-16">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-arena.jpg"
            alt="Activity Notifications"
            className="w-full h-full object-cover filter brightness-[0.3] saturate-150 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 backdrop-blur-2xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                Activity <span className="text-emerald-400">Notifications</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal mt-1">
                Real-time match alerts, squad invitations, and tournament dispatches.
              </p>
            </div>

            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-400 transition cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" /> Mark All Read
            </button>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-black">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">
          
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-3xl border transition ${
                item.read ? 'border-white/10 bg-[#09090b]' : 'border-emerald-500/40 bg-emerald-500/10 shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{item.message}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">{item.time}</span>
              </div>
            </div>
          ))}

        </div>
      </section>

      <FinalCTA />
    </main>
  );
}
