'use client';

import Link from 'next/link';
import { ArrowLeft, Gamepad2, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#070B14] px-4 text-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mb-6">
        <Gamepad2 className="h-8 w-8" />
      </div>

      <h1 className="text-6xl font-black uppercase tracking-tight text-white sm:text-8xl">404</h1>
      <p className="mt-3 text-lg font-semibold text-zinc-300">Match Out of Bounds</p>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        The tournament, player, or page you are looking for does not exist or has been moved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-950 hover:bg-emerald-400 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Arena
        </Link>
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
        >
          <Search className="h-4 w-4" /> Browse Tournaments
        </Link>
      </div>
    </main>
  );
}
