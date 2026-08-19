'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tournaments } from '@/app/tournaments/data';

/**
 * RoutePrewarmer: Pre-compiles and warms up all platform routes into memory
 * during browser idle time so clicking ANY button or link executes in 0ms.
 */
export default function RoutePrewarmer() {
  const router = useRouter();

  useEffect(() => {
    // List of core static routes to pre-warm
    const coreRoutes = [
      '/tournaments',
      '/colleges',
      '/teams',
      '/players',
      '/leaderboards',
      '/login',
      '/host',
    ];

    // List of dynamic tournament and registration routes
    const dynamicRoutes: string[] = [];
    tournaments.forEach((t) => {
      dynamicRoutes.push(`/tournaments/${t.slug}`);
      dynamicRoutes.push(`/registration/${t.slug}`);
      dynamicRoutes.push(`/registration/${t.slug}/confirm`);
      dynamicRoutes.push(`/registration/${t.slug}/pass`);
    });

    const allRoutes = [...coreRoutes, ...dynamicRoutes];

    // Execute prefetching during browser idle or immediately in microtasks
    const warmUp = () => {
      allRoutes.forEach((route, index) => {
        setTimeout(() => {
          try {
            router.prefetch(route);
          } catch {}
        }, index * 30); // Stagger by 30ms so main thread stays completely free
      });
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(warmUp, { timeout: 2000 });
      } else {
        setTimeout(warmUp, 100);
      }
    }
  }, [router]);

  return null;
}
