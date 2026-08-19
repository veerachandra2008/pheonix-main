'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled App Error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#070B14] px-4 text-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400 mb-6">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">System Error Detected</h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">
        Something went wrong while rendering this section. You can try refreshing the page or returning home.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-950 hover:bg-emerald-400 transition"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
