import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .select('tournament_slug');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    if (Array.isArray(data)) {
      for (const row of data) {
        const slug = (row.tournament_slug || '').trim().toLowerCase();
        if (slug) {
          counts[slug] = (counts[slug] || 0) + 1;
        }
      }
    }

    return NextResponse.json({ success: true, counts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
