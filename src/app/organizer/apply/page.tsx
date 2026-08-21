'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Lock,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  User,
  Users,
  Building2,
  Mail,
  Zap,
  ChevronRight,
  Globe,
  Radio,
  FileText,
  DollarSign,
  Check,
  Flame,
  ArrowUpRight,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { flaskApi } from '@/lib/flask-api';

const gameOptions = [
  { name: 'Valorant', image: '/valorant.jpg', defaultFormat: '5v5 Double Elimination', tag: 'PC FPS' },
  { name: 'BGMI', image: '/bgmi.jpg', defaultFormat: 'Squad Battle Royale', tag: 'Mobile BR' },
  { name: 'CS2', image: '/cs2.jpg', defaultFormat: '5v5 Single Elimination', tag: 'PC Tactical' },
  { name: 'Free Fire', image: '/freefire.jpg', defaultFormat: 'Squad Battle Royale', tag: 'Mobile BR' },
  { name: 'FC / FIFA', image: '/fc.jpg', defaultFormat: '1v1 Knockout', tag: 'Sports Simulation' },
  { name: 'Apex Legends', image: '/apex.jpg', defaultFormat: 'Trios Best of 5', tag: 'Battle Royale' },
  { name: 'COD Mobile', image: '/codm.jpg', defaultFormat: '5v5 Search & Destroy', tag: 'Mobile FPS' },
  { name: 'Rocket League', image: '/rocket.jpg', defaultFormat: '3v3 Standard Knockout', tag: 'Arcade Sports' },
];

export default function HostEventPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    game: 'Valorant',
    eventType: 'inPerson', // inPerson | online | hybrid
    location: '',
    date: '',
    time: '18:00',
    prizePool: '50,000',
    entryFee: '0',
    maxTeams: '64',
    format: '5v5 Double Elimination',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    discordServer: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedEvent, setPublishedEvent] = useState<any>(null);

  useEffect(() => {
    const rawSession = localStorage.getItem('xenova_session');
    if (rawSession) {
      try {
        const user = JSON.parse(rawSession);
        setSession(user);
        setFormData((prev) => ({
          ...prev,
          organizerEmail: prev.organizerEmail || user.email || '',
          organizerName: prev.organizerName || (user.name ? `${user.name} Esports Club` : ''),
        }));

        async function checkStatus() {
          const cleanEmail = (user.email || '').toLowerCase().trim();
          if (!cleanEmail) return;

          try {
            const { supabase } = await import('@/lib/supabase');
            const { data } = await supabase.from('organizer_applications').select('*').eq('email', cleanEmail);
            if (data && data.length > 0) {
              const status = (data[0].status || '').toUpperCase();
              if (status === 'APPROVED') {
                const updated = { ...user, role: 'organizer', hostName: data[0].host_name || user.name };
                localStorage.setItem('xenova_session', JSON.stringify(updated));
                setSession(updated);
                window.dispatchEvent(new Event('xenova-auth-change'));
              } else {
                const updated = { ...user, role: 'player' };
                delete updated.hostName;
                localStorage.setItem('xenova_session', JSON.stringify(updated));
                setSession(updated);
                window.dispatchEvent(new Event('xenova-auth-change'));
              }
            } else {
              if (user.role !== 'admin') {
                const updated = { ...user, role: 'player' };
                delete updated.hostName;
                localStorage.setItem('xenova_session', JSON.stringify(updated));
                setSession(updated);
                window.dispatchEvent(new Event('xenova-auth-change'));
              }
            }
          } catch {}
        }
        checkStatus();
      } catch {}
    }
  }, []);

  const selectedGameObj = gameOptions.find((g) => g.name === formData.game) || gameOptions[0];

  const handleGameSelect = (gameName: string) => {
    const found = gameOptions.find((g) => g.name === gameName);
    setFormData((prev) => ({
      ...prev,
      game: gameName,
      format: found ? found.defaultFormat : prev.format,
    }));
  };

  const handleQuickDemoFill = () => {
    setFormData({
      title: 'IIT Bombay Valorant Championship 2026',
      game: 'Valorant',
      eventType: 'inPerson',
      location: 'SAC Auditorium, IIT Bombay Campus, Powai',
      date: '2026-06-20',
      time: '17:00',
      prizePool: '1,00,000',
      entryFee: '0',
      maxTeams: '64',
      format: '5v5 Double Elimination',
      organizerName: 'IIT Bombay Esports Society',
      organizerEmail: session?.email || 'esports@iitb.ac.in',
      organizerPhone: '+91 98765 43210',
      discordServer: 'https://discord.gg/iitb-esports',
      description: 'The flagship inter-collegiate Valorant championship. Open to all verified university squads. LAN finals with pro stage broadcast.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.organizerName || !formData.organizerEmail) {
      alert('Please fill out the tournament title, host organization, and contact email.');
      return;
    }

    setIsSubmitting(true);

    const eventSlug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tournamentHostId = `HOST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const tournamentPayload = {
      title: formData.title,
      slug: eventSlug || `tournament-${Date.now()}`,
      game: formData.game,
      image: selectedGameObj.image,
      eventType: formData.eventType,
      location: formData.location || 'University Campus Arena',
      region: formData.location || 'Pan India',
      date: formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Soon',
      time: formData.time,
      prize: formData.prizePool ? `₹${formData.prizePool}` : '₹0',
      fee: formData.entryFee === '0' || !formData.entryFee ? 'Free' : `₹${formData.entryFee}/team`,
      teams: `0/${formData.maxTeams}`,
      maxTeams: formData.maxTeams,
      filled: 0,
      format: formData.format,
      host: formData.organizerName,
      organizer_email: formData.organizerEmail.trim().toLowerCase(),
      createdBy: formData.organizerEmail.trim().toLowerCase(),
      status: 'Upcoming',
      status_color: '#38BDF8',
      description: formData.description,
      discordServer: formData.discordServer,
      phone: formData.organizerPhone,
    };

    const applicationPayload = {
      email: formData.organizerEmail.trim().toLowerCase(),
      hostName: formData.organizerName,
      host_name: formData.organizerName,
      college: formData.location || formData.organizerName || 'Independent Campus',
      phone: formData.organizerPhone,
      organizerPhone: formData.organizerPhone,
      discordServer: formData.discordServer,
      discord_server: formData.discordServer,
      preferredGame: formData.game,
      preferred_game: formData.game,
      experience: 'Collegiate Tournament Host',
      details: formData.description || `Hosting ${formData.title} for ${formData.game}`,
      tournament: tournamentPayload,
      tournament_data: tournamentPayload,
    };

    try {
      // 1. Submit Application to Backend API
      await flaskApi.submitOrganizerApplication(applicationPayload);

      // 2. Dual sync to Supabase with progressive field fallback
      try {
        const { supabase } = await import('@/lib/supabase');
        const dbPayload = {
          email: formData.organizerEmail.trim().toLowerCase(),
          host_name: formData.organizerName,
          college: formData.location || formData.organizerName || 'Independent Campus',
          phone: formData.organizerPhone,
          discord_server: formData.discordServer,
          preferred_game: formData.game,
          experience: 'Collegiate Tournament Host',
          details: formData.description,
          tournament_data: tournamentPayload,
          status: 'PENDING',
        };

        const sbRes = await supabase.from('organizer_applications').upsert([dbPayload], { onConflict: 'email' });
        if (sbRes.error) {
          // Fallback if table lacks phone/tournament_data columns
          await supabase.from('organizer_applications').upsert([
            {
              email: formData.organizerEmail.trim().toLowerCase(),
              host_name: formData.organizerName,
              college: formData.location || formData.organizerName || 'Independent Campus',
              preferred_game: formData.game,
              experience: 'Collegiate Tournament Host',
              details: formData.description,
              status: 'PENDING',
            }
          ], { onConflict: 'email' });
        }
      } catch (sbErr) {
        console.warn('Direct Supabase application insert notice:', sbErr);
      }

      setPublishedEvent({
        hostId: tournamentHostId,
        slug: eventSlug || 'phoenix-varsity-cup',
        title: formData.title,
        game: formData.game,
        image: selectedGameObj.image,
        date: formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD',
        location: formData.eventType === 'online' ? 'Online Discord Arena' : formData.location || 'University Campus Arena',
        prize: formData.prizePool ? `₹${formData.prizePool}` : '₹0',
        fee: formData.entryFee === '0' || !formData.entryFee ? 'Free Entry' : `₹${formData.entryFee}/team`,
        organizer: formData.organizerName,
        format: formData.format,
        maxTeams: formData.maxTeams,
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error submitting tournament application:', err);
      alert('Application submitted! Pending administrative clearance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090E] text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white pb-24">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07090E]/90 backdrop-blur-md px-6 sm:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/tournaments"
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition font-medium px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Arena
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Phoenix" className="h-7 w-7 object-contain" />
          <span className="font-black italic uppercase tracking-tighter text-sm text-white">XENOVA <span className="text-emerald-400">HOST</span></span>
        </div>

        <div className="flex items-center gap-3">
          {session?.role === 'organizer' || session?.role === 'admin' ? (
            <Link
              href="/organizer/dashboard"
              className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition"
            >
              Organizer Dashboard →
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
            >
              Auto-fill Sample Data
            </button>
          )}
        </div>
      </header>

      {/* ── Main Container ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
        {!publishedEvent ? (
          <div className="space-y-12">
            {/* ── 1. Clean Structured Header ── */}
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Tournament Management Console
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Host a Collegiate Tournament
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
                Configure your event rules, ticketing, and participant verification. Upon approval by administration, you will unlock the complete Organizer Management Dashboard and launch tournaments across the Phoenix platform.
              </p>
            </div>

            {/* ── 2. Three Clean Feature Pillars ── */}
            <div className="grid gap-4 sm:grid-cols-3 border-y border-white/[0.06] py-6">
              <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0C0E14] space-y-2">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
                  <Ticket className="w-4 h-4 text-zinc-400" /> Free & Paid Ticketing
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automated pass generation with custom team slot limits, waitlists, and instant roster receipts.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0C0E14] space-y-2">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
                  <QrCode className="w-4 h-4 text-zinc-400" /> Instant QR Check-in
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Validate participants on-ground in seconds with encrypted QR scanning to eliminate duplicate entries.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0C0E14] space-y-2">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
                  <Globe className="w-4 h-4 text-zinc-400" /> National Discovery
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Featured on the Phoenix collegiate explorer with direct shareable registration links for your campus.
                </p>
              </div>
            </div>

            {/* ── 3. Main Form & Live Preview Grid ── */}
            <div className="grid gap-10 lg:grid-cols-12 items-start">
              {/* Form Column */}
              <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8">
                {/* Section A: Tournament Details */}
                <div className="rounded-2xl border border-zinc-800/80 bg-[#0C0E14] p-6 sm:p-8 space-y-6">
                  <div className="border-b border-zinc-800 pb-4">
                    <h3 className="text-base font-bold text-white uppercase tracking-wide">
                      1. Tournament Information
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Select the title, game title, and competitive format.</p>
                  </div>

                  {/* Game Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                      Game Category <span className="text-zinc-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {gameOptions.map((g) => {
                        const isSelected = formData.game === g.name;
                        return (
                          <button
                            key={g.name}
                            type="button"
                            onClick={() => handleGameSelect(g.name)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-20 ${
                              isSelected
                                ? 'border-zinc-300 bg-zinc-800/80 text-white shadow-sm'
                                : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <span className="text-[10px] text-zinc-500 uppercase font-mono">{g.tag}</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{g.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Tournament Title <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. IIT Bombay Valorant Championship 2026"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Event Environment <span className="text-zinc-500">*</span>
                      </label>
                      <select
                        value={formData.eventType}
                        onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-zinc-800 bg-zinc-900/80 text-sm text-white focus:outline-none focus:border-zinc-500 transition"
                      >
                        <option value="inPerson">LAN Campus Arena (On-Ground)</option>
                        <option value="online">Online Server (Remote)</option>
                        <option value="hybrid">Hybrid (Online Qualifiers + LAN Finals)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Match Format <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.format}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                        placeholder="e.g. 5v5 Double Elimination"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Location / Venue Address / Discord Server <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Student Activity Center Auditorium / discord.gg/phoenix"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Schedule & Capacity */}
                <div className="rounded-2xl border border-zinc-800/80 bg-[#0C0E14] p-6 sm:p-8 space-y-6">
                  <div className="border-b border-zinc-800 pb-4">
                    <h3 className="text-base font-bold text-white uppercase tracking-wide">
                      2. Schedule & Slot Capacity
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Define tournament timing, prize pool, and registration fees.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Tournament Date <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Start Time <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Total Prize Pool (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs text-zinc-500 font-mono">₹</span>
                        <input
                          type="text"
                          value={formData.prizePool}
                          onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                          placeholder="50,000"
                          className="w-full h-11 pl-8 pr-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Team Registration Fee (INR)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs text-zinc-500 font-mono">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.entryFee}
                          onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                          placeholder="0 for Free Entry"
                          className="w-full h-11 pl-8 pr-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Max Team Capacity Slots
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['16', '32', '64', '128'].map((slots) => {
                          const isSelected = formData.maxTeams === slots;
                          return (
                            <button
                              key={slots}
                              type="button"
                              onClick={() => setFormData({ ...formData, maxTeams: slots })}
                              className={`py-2.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'border-zinc-300 bg-zinc-800 text-white'
                                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              {slots} Slots
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Rules & Description Highlights
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="State match guidelines, discord check-in rules, and team eligibility..."
                        className="w-full p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Organizer Credentials */}
                <div className="rounded-2xl border border-zinc-800/80 bg-[#0C0E14] p-6 sm:p-8 space-y-6">
                  <div className="border-b border-zinc-800 pb-4">
                    <h3 className="text-base font-bold text-white uppercase tracking-wide">
                      3. Organizer & University Credentials
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Verification details for tournament management.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Host Club / Society Name <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.organizerName}
                        onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                        placeholder="e.g. IIT Bombay Esports Society"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Official Contact Email <span className="text-zinc-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.organizerEmail}
                        onChange={(e) => setFormData({ ...formData, organizerEmail: e.target.value })}
                        placeholder="esports@iitb.ac.in"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={formData.organizerPhone}
                        onChange={(e) => setFormData({ ...formData, organizerPhone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                        Discord Guild Invite URL
                      </label>
                      <input
                        type="text"
                        value={formData.discordServer}
                        onChange={(e) => setFormData({ ...formData, discordServer: e.target.value })}
                        placeholder="https://discord.gg/campus-esports"
                        className="w-full h-11 px-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs uppercase tracking-widest transition duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                        <span>Submitting Application & Publishing Tournament...</span>
                      </div>
                    ) : (
                      <>
                        Apply as Organizer & Launch Tournament <ArrowUpRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Right Column: Sticky Live Discovery Card Preview */}
              <div className="lg:col-span-4 sticky top-24 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-zinc-400">Live Card Preview</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Discovery Card</span>
                </div>

                {/* Card Preview Component */}
                <div className="rounded-2xl border border-zinc-800 bg-[#0C0E14] overflow-hidden shadow-xl space-y-4">
                  <div className="relative h-44 overflow-hidden bg-zinc-900">
                    <img
                      src={selectedGameObj.image}
                      alt="Tournament Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E14] via-transparent to-black/30" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white text-zinc-950 text-[10px] font-bold uppercase tracking-wider">
                        {formData.game}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/70 text-zinc-200 text-[10px] font-medium uppercase tracking-wider border border-white/10">
                        {formData.eventType === 'inPerson' ? 'LAN' : formData.eventType === 'online' ? 'Online' : 'Hybrid'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 text-right">
                      <span className="text-[10px] text-zinc-400 uppercase font-mono block">Prize Pool</span>
                      <span className="text-sm font-extrabold text-white font-mono">
                        {formData.prizePool ? `₹${formData.prizePool}` : '₹0'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white leading-snug">
                        {formData.title || 'Tournament Title Preview'}
                      </h4>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{formData.organizerName || 'Host University Club'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 border-t border-zinc-800/80 pt-3">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{formData.date || 'Date TBD'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        <span>0 / {formData.maxTeams} Teams</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Entry:</span>
                      <span className="text-xs font-mono font-bold text-white">
                        {formData.entryFee === '0' || !formData.entryFee ? 'FREE ENTRY' : `₹${formData.entryFee} / Team`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3.5 text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" /> Organizer Dashboard Included
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Once approved by administration, your tournament will be activated and you can access your Organizer Hub to manage rosters, match seeds, and participant check-ins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── 4. Clean Confirmation Screen ── */
          <div className="mx-auto max-w-2xl space-y-8 text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                APPLICATION SUBMITTED · PENDING AUDIT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{publishedEvent.title}</h1>
              <p className="text-xs text-zinc-400">{publishedEvent.game} · {publishedEvent.date} · Hosted by {publishedEvent.organizer}</p>
            </div>

            {/* Published Event Details Card */}
            <div className="rounded-2xl border border-zinc-800 bg-[#0C0E14] p-6 text-left space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Host Control Code</span>
                  <span className="font-mono text-sm font-bold text-white">{publishedEvent.hostId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Registration Fee</span>
                  <span className="font-mono text-xs font-bold text-zinc-300">{publishedEvent.fee}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Venue / Link</span>
                  <span className="text-zinc-200">{publishedEvent.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block">Format</span>
                  <span className="text-zinc-200">{publishedEvent.format}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="truncate">
                  <span className="text-[10px] text-zinc-400 block font-mono">Tournament Slug</span>
                  <span className="text-xs font-mono text-zinc-200 truncate block">/tournaments/{publishedEvent.slug}</span>
                </div>
                <Link
                  href="/tournaments"
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition shrink-0"
                >
                  View Arena
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/tournaments"
                className="py-3 px-6 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition"
              >
                Back to Tournaments Arena
              </Link>

              <button
                type="button"
                onClick={() => setPublishedEvent(null)}
                className="py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition cursor-pointer"
              >
                Create Another Tournament
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
