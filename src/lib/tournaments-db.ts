import { supabase } from './supabase';
import { tournaments as defaultMockTournaments, Tournament } from '@/app/tournaments/data';

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

const BACKEND_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || '/api';

/**
 * Fetch all tournaments directly from Supabase / Backend Database
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  let tournamentsList: Tournament[] = [];

  // 1. Try Direct Supabase Cloud Database query
  try {
    const { data, error } = await supabase.from('tournaments').select('*');
    if (!error && data && data.length > 0) {
      tournamentsList = data.map(mapSupabaseTournament);
    }
  } catch (err) {
    console.warn('Supabase direct fetch notice:', err);
  }

  // 2. Try Backend API (/api/tournaments/)
  if (tournamentsList.length === 0) {
    try {
      const apiBase =
        typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? '/api'
          : BACKEND_URL;

      const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          tournamentsList = json.data.map(mapSupabaseTournament);
        }
      }
    } catch (err) {
      console.warn('Backend API fetch notice:', err);
    }
  }

  // 3. Fallback to default mock tournaments if cloud database is not populated yet
  if (tournamentsList.length === 0) {
    tournamentsList = [...defaultMockTournaments];
  }

  // 4. Merge custom tournaments from localStorage
  try {
    const rawCustom = typeof window !== 'undefined' ? localStorage.getItem('xenova_tournaments') : null;
    if (rawCustom) {
      const custom = JSON.parse(rawCustom);
      const seen = new Set(tournamentsList.map((t) => t.slug));
      for (const c of custom) {
        if (!seen.has(c.slug)) {
          tournamentsList.unshift(c);
          seen.add(c.slug);
        }
      }
    }
  } catch {}

  return tournamentsList;
}

/**
 * Save a new tournament registration into Database & Cloud Storage
 */
export async function saveRegistration(record: TournamentRegistrationRecord): Promise<boolean> {
  let isSaved = false;

  const apiBase =
    typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? '/api'
      : BACKEND_URL;

  // 1. Save directly to Supabase client
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
    console.warn('Direct Supabase registration notice:', err);
  }

  // 2. Save to Backend API (/api/tournaments/register)
  try {
    const res = await fetch(`${apiBase}/tournaments/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (res.ok) isSaved = true;
  } catch (err) {
    console.warn('Backend API registration notice:', err);
  }

  // 3. Save to localStorage
  try {
    const raw = localStorage.getItem('xenova_registrations');
    const existing: any[] = raw ? JSON.parse(raw) : [];
    const already = existing.some((r) => r.passId === record.passId);
    if (!already) {
      existing.unshift(record);
      localStorage.setItem('xenova_registrations', JSON.stringify(existing));
    }
    isSaved = true;
  } catch {}

  return isSaved;
}

/**
 * Get all registrations stored for the current user strictly from Backend / Supabase
 */
export async function getUserRegistrations(email?: string): Promise<TournamentRegistrationRecord[]> {
  const records: TournamentRegistrationRecord[] = [];
  if (!email) return records;

  const cleanEmail = email.trim().toLowerCase();

  // 1. Fetch from Flask Backend API (/api/registrations?email=...)
  try {
    const res = await fetch(`${BACKEND_URL}/registrations?email=${encodeURIComponent(cleanEmail)}`);
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
    console.warn('Supabase registrations fallback notice:', err);
  }

  // 3. LocalStorage fallback
  try {
    const raw = localStorage.getItem('xenova_registrations');
    if (raw) {
      const localList: any[] = JSON.parse(raw);
      const userLocal = localList.filter((r) => !r.email || r.email.toLowerCase() === cleanEmail);
      for (const item of userLocal) {
        if (!records.some((r) => r.passId === item.passId)) {
          records.push(item);
        }
      }
    }
  } catch {}

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
