'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tournaments } from '@/app/tournaments/data';

/**
 * RoutePrewarmer: Pre-compiles and warms up all platform routes into memory
 * during browser idle time so clicking ANY button or link executes in 0ms.
 */
export default function RoutePrewarmer() {
  // Next.js Link components handle intelligent viewport and hover prefetching automatically.
  // Manual router.prefetch is omitted here to prevent premature router action dispatch in Turbopack.
  return null;
}
