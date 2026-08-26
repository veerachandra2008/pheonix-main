import { supabase } from './supabase';
import { tournaments as defaultMockTournaments, Tournament } from '@/app/tournaments/data';
import { getApiBaseUrl } from './api-config';

export interface TournamentRegistrationRecord {
  tournamentSlug: string;
  tournamentTitle: string;
  tournamentGame: string;
  tournamentPrize: string;
  tournamentDate: string;
  tournamentFormat: string;
  tournamentRegion: string;
  tournamentFee: string;
  tournamentImage?: string;
  teamId: string;
  teamName: string;
  college: string;
  captainName: string;
  email: string;
  passId: string;
  registeredAt: string;
}

/**
 * Fetch all tournaments directly from Backend Database with direct Supabase fallback
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  // 1. Try Backend API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map(mapSupabaseTournament);
      }
    }
  } catch (err) {
    console.warn('Backend API tournaments fetch error:', err);
  }

  // 2. Direct Supabase Query Fallback (Ensures 100% database data in deployment even if serverless API has cold-start)
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data.map(mapSupabaseTournament);
    }
  } catch (err) {
    console.warn('Direct Supabase tournaments query fallback error:', err);
  }

  return defaultMockTournaments;
}

/**
 * Save a new tournament registration into Database
 */
export async function saveRegistration(record: TournamentRegistrationRecord): Promise<boolean> {
  let isSaved = false;

  // 1. Save to Backend API (/api/tournaments/register)
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/tournaments/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (res.ok) isSaved = true;
  } catch (err) {
    console.warn('Backend API registration offline.');
  }

  // 2. Save directly to Supabase client
  try {
    const { error } = await supabase.from('registrations').insert([
      {
        tournament_slug: record.tournamentSlug,
        tournament_title: record.tournamentTitle,
        team_id: String(record.teamId),
        team_name: record.teamName,
        college: record.college,
        captain_name: record.captainName,
        email: record.email,
        pass_id: record.passId,
        registered_at: record.registeredAt,
      },
    ]);
    if (!error) isSaved = true;
  } catch (err) {
    console.warn('Direct Supabase registration error:', err);
  }

  return isSaved;
}

const REG_CACHE = new Map<string, { data: TournamentRegistrationRecord[]; expires: number }>();

/**
 * Get all registrations stored for the current user strictly from Backend / Supabase with instant client caching
 */
export async function getUserRegistrations(email?: string): Promise<TournamentRegistrationRecord[]> {
  const records: TournamentRegistrationRecord[] = [];
  if (!email) return records;

  const cleanEmail = email.trim().toLowerCase();

  const cached = REG_CACHE.get(cleanEmail);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  // 1. Fetch from Flask Backend API (/api/registrations?email=...)
  try {
    const apiBase = getApiBaseUrl();

    const res = await fetch(`${apiBase}/registrations?email=${encodeURIComponent(cleanEmail)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        for (const item of json.data) {
          records.push({
            tournamentSlug: item.tournament_slug || item.tournamentSlug,
            tournamentTitle: item.tournament_title || item.tournamentTitle || item.tournament_slug,
            tournamentGame: item.tournament_game || item.tournamentGame || 'Esports',
            tournamentPrize: item.tournament_prize || item.tournamentPrize || 'Verified Entry',
            tournamentDate: item.tournament_date || item.tournamentDate || 'Upcoming',
            tournamentFormat: item.tournament_format || item.tournamentFormat || 'Tournament',
            tournamentRegion: item.tournament_region || item.tournamentRegion || 'Pan India',
            tournamentFee: item.tournament_fee || item.tournamentFee || 'Free',
            teamId: item.team_id || item.teamId || 'team-1',
            teamName: item.team_name || item.teamName,
            college: item.college,
            captainName: item.captain_name || item.captainName,
            email: item.email,
            passId: item.pass_id || item.passId,
            registeredAt: item.registered_at || item.registeredAt || new Date().toISOString(),
          });
        }
        if (records.length > 0) {
          REG_CACHE.set(cleanEmail, { data: records, expires: Date.now() + 20000 });
          return records;
        }
      }
    }
  } catch (err) {
    console.warn('Backend API registrations fetch error:', err);
  }

  // 2. Direct Supabase Fallback
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', cleanEmail);

    if (!error && data && Array.isArray(data)) {
      for (const item of data) {
        records.push({
          tournamentSlug: item.tournament_slug,
          tournamentTitle: item.tournament_title || item.tournament_slug,
          tournamentGame: item.tournament_game || 'Esports',
          tournamentPrize: item.tournament_prize || 'Verified Entry',
          tournamentDate: item.tournament_date || 'Upcoming',
          tournamentFormat: item.tournament_format || 'Tournament',
          tournamentRegion: item.tournament_region || 'Pan India',
          tournamentFee: item.tournament_fee || 'Free',
          teamId: item.team_id,
          teamName: item.team_name,
          college: item.college,
          captainName: item.captain_name,
          email: item.email,
          passId: item.pass_id,
          registeredAt: item.registered_at || new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('Supabase registrations fallback error:', err);
  }

  REG_CACHE.set(cleanEmail, { data: records, expires: Date.now() + 20000 });
  return records;
}

function mapSupabaseTournament(item: any): Tournament {
  return {
    slug: item.slug,
    title: item.title || item.name,
    host: item.host || 'Xenova',
    image: item.image || '/hero-arena.jpg',
    game: item.game || 'Esports',
    status: item.status || 'Registering',
    statusColor: item.status_color || item.statusColor || '#22C55E',
    prize: item.prize || '₹50,000',
    date: item.date || 'Soon',
    region: item.region || 'Pan India',
    format: item.format || 'Tournament',
    teams: item.teams || '64/64',
    filled: typeof item.filled === 'number' ? item.filled : 50,
    fee: item.fee || 'Free',
  };
}
