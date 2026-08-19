'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Users,
  Trophy,
  Activity,
  DollarSign,
  Sparkles,
  Download
} from 'lucide-react';

const COLORS = ['#f43f5e', '#22d3ee', '#fbbf24', '#a855f7', '#10b981'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0C111D] border border-white/10 p-3 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-white mb-1">{label}</p>
        {payload.map((item: any) => (
          <p key={item.name} className="font-semibold" style={{ color: item.color || item.fill }}>
            {item.name}: {item.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  // Visual Telemetry Data sets
  const signupData = [
    { name: 'Jan 26', Players: 8200, Growth: 12 },
    { name: 'Feb 26', Players: 12400, Growth: 51 },
    { name: 'Mar 26', Players: 21900, Growth: 76 },
    { name: 'Apr 26', Players: 34800, Growth: 58 },
    { name: 'May 26', Players: 42800, Growth: 22 },
    { name: 'Jun 26', Players: 50200, Growth: 17 },
  ];

  const gamePopularity = [
    { title: 'Valorant', Players: 18400, Teams: 450, color: '#f43f5e' },
    { title: 'BGMI', Players: 14200, Teams: 380, color: '#fbbf24' },
    { title: 'Free Fire', Players: 7800, Teams: 190, color: '#10b981' },
    { title: 'CS2', Players: 5900, Teams: 140, color: '#22d3ee' },
    { title: 'FC24', Players: 3900, Teams: 90, color: '#a855f7' },
  ];

  const tournamentSplit = [
    { name: 'Championships', value: 35 },
    { name: 'Weekly Cups', value: 25 },
    { name: 'Campus Clashes', value: 20 },
    { name: 'Open Scrims', value: 15 },
    { name: 'LAN Finals', value: 5 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">System Telemetry</span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-5xl">
            Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Global network telemetry, player demographics, activity heatmaps, and ecosystem scale.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting ecosystem report as PDF...')}
          className="inline-flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-widest transition rounded-xl shrink-0"
        >
          <Download className="h-4 w-4 text-rose-500" />
          Export Report
        </button>
      </header>

      {/* Overview Cards */}
      <section className="grid gap-6 sm:grid-cols-3">
        <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Growth</p>
            <p className="text-3xl font-black italic mt-2 text-emerald-400">+17.8%</p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">VS LAST CALENDAR MONTH</p>
          </div>
          <TrendingUp className="h-8 w-8 text-emerald-400/20" />
        </div>

        <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Engagement Index</p>
            <p className="text-3xl font-black italic mt-2 text-cyan-400">92.4%</p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">DAILY ACTIVE PLAYERS RETENTION</p>
          </div>
          <Activity className="h-8 w-8 text-cyan-400/20" />
        </div>

        <div className="border border-white/10 bg-[#0C111D] p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Priority</p>
            <p className="text-3xl font-black italic mt-2 text-rose-500">Clear</p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">0 SECURITY ALERTS RESOLVED</p>
          </div>
          <Sparkles className="h-8 w-8 text-rose-500/20" />
        </div>
      </section>

      {/* Main Charts Area */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1.1fr]">
        {/* User Signups Growth */}
        <div className="border border-white/10 bg-[#0C111D] p-6 rounded-3xl space-y-4">
          <div>
            <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-widest">Telemetry Timeline</h3>
            <h4 className="text-xl font-black italic uppercase tracking-tight text-white mt-1">Ecosystem Signup Velocity</h4>
          </div>

          <div className="h-80 w-full text-slate-400 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Players"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tournament Category Split */}
        <div className="border border-white/10 bg-[#0C111D] p-6 rounded-3xl space-y-4">
          <div>
            <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-widest">Tournament Split</h3>
            <h4 className="text-xl font-black italic uppercase tracking-tight text-white mt-1">Event Categories</h4>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tournamentSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {tournamentSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {tournamentSplit.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{entry.name} ({entry.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Players per Game title */}
      <section className="border border-white/10 bg-[#0C111D] p-6 rounded-3xl space-y-4">
        <div>
          <h3 className="text-rose-400 text-[10px] font-black uppercase tracking-widest">Game Popularity</h3>
          <h4 className="text-xl font-black italic uppercase tracking-tight text-white mt-1">Ecosystem Title Split (Verified Players & Teams)</h4>
        </div>

        <div className="h-80 w-full text-slate-400 text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gamePopularity} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="title" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Players" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Teams" fill="#fbbf24" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
