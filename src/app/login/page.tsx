'use client';

import React, { Suspense } from 'react';
import LoginPage from '@/components/xenova/LoginPage';

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-emerald-400 font-mono text-sm">Loading arena portal...</div>}>
      <LoginPage />
    </Suspense>
  );
}
