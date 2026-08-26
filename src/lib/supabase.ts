import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://icgqikmzhtynpatntglw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljZ3Fpa216aHR5bnBhdG50Z2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzEwNjEsImV4cCI6MjEwMTc0NzA2MX0.pRIjjUIrPt2n7XMJ5RjCSKxjZeyUcZEKoN8Vgvkt0GY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
