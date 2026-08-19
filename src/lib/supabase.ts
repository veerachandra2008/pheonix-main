import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://icgqikmzhtynpatntglw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_sQWzFPxv9l96ukwIeukySg_v53vTIfc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
