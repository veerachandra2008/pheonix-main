import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Server-only administrative Supabase client using Service Role Key.
// MUST NEVER be imported in client components ('use client') or exposed to browser.
if (typeof window !== 'undefined') {
  throw new Error('FATAL: supabase-admin must NEVER be loaded in browser environment!');
}

function getServiceRoleKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  // Fallback to loading .env.local on Node server
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(__dirname, '..', '..', '.env.local'),
      path.resolve(__dirname, '..', '..', '..', '.env.local'),
    ];
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
            const val = trimmed.split('=')[1].trim();
            process.env.SUPABASE_SERVICE_ROLE_KEY = val;
            return val;
          }
        }
      }
    }
  } catch {}
  return '';
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://icgqikmzhtynpatntglw.supabase.co';
const supabaseServiceRoleKey = getServiceRoleKey();

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
