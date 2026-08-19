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

let memoryTournamentCache: Tournament[] | null = null;

/**
 * Fetch all tournaments from In-Memory Cache / LocalStorage / Backend (Instant 0ms response)
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  // 1. Return in-memory cache immediately if available
  if (memoryTournamentCache && memoryTournamentCache.length > 0) {
    revalidateTournamentsBackground();
    return memoryTournamentCache;
  }

  // 2. Build instant initial list from default mock + custom tournaments (0ms)
  const initialList: Tournament[] = [...defaultMockTournaments];
  try {
    const rawCustom = typeof window !== 'undefined' ? localStorage.getItem('xenova_tournaments') : null;
    if (rawCustom) {
      const custom = JSON.parse(rawCustom);
      const seenSlugs = new Set(initialList.map((t) => t.slug));
      for (const c of custom) {
        if (!seenSlugs.has(c.slug)) {
          initialList.push(c);
          seenSlugs.add(c.slug);
        }
      }
    }
  } catch {}

  memoryTournamentCache = initialList;

  // 3. Fast non-blocking background fetch
  revalidateTournamentsBackground();

  return initialList;
}

/**
 * Fast non-blocking background revalidation
 */
async function revalidateTournamentsBackground() {
  try {
    const res = await fetch(`${BACKEND_URL}/tournaments`, {
      signal: AbortSignal.timeout(1000), // Fast 1-second timeout
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        memoryTournamentCache = json.data.map(mapSupabaseTournament);
      }
    }
  } catch {}
}

/**
 * Save a new tournament registration into Database & LocalStorage
 */
export async function saveRegistration(record: TournamentRegistrationRecord): Promise<boolean> {
  let isSaved = false;

  // 1. Save to LocalStorage
  try {
    const existing: TournamentRegistrationRecord[] = JSON.parse(
      localStorage.getItem('xenova_registrations') || '[]'
    );
    const alreadyExists = existing.some(
      (r) => r.tournamentSlug === record.tournamentSlug && r.teamName === record.teamName
    );

    if (!alreadyExists) {
      existing.unshift(record);
      localStorage.setItem('xenova_registrations', JSON.stringify(existing));
    }
    isSaved = true;
  } catch (err) {
    console.error('Failed to save registration to localStorage:', err);
  }

  // 2. Save to Backend API (/api/tournaments/register)
  try {
    await fetch(`${BACKEND_URL}/tournaments/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.warn('Backend API registration offline.');
  }

  // 3. Save directly to Supabase client
  try {
    await supabase.from('registrations').insert([
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
  } catch (err) {
    console.warn('Direct Supabase registration error:', err);
  }

  // 4. Update tournament filled count
  try {
    const rawTournaments = localStorage.getItem('xenova_tournaments');
    if (rawTournaments) {
      const list: any[] = JSON.parse(rawTournaments);
      const idx = list.findIndex((t) => t.slug === record.tournamentSlug);
      if (idx !== -1) {
        list[idx].filled = Math.min(100, (list[idx].filled || 50) + 2);
        localStorage.setItem('xenova_tournaments', JSON.stringify(list));
      }
    }
  } catch {}

  return isSaved;
}

/**
 * Get all registrations stored for the current user
 */
export async function getUserRegistrations(email?: string): Promise<TournamentRegistrationRecord[]> {
  const records: TournamentRegistrationRecord[] = [];

  // 1. Fetch from LocalStorage
  try {
    const localRecords: TournamentRegistrationRecord[] = JSON.parse(
      localStorage.getItem('xenova_registrations') || '[]'
    );
    for (const r of localRecords) {
      if (!email || r.email?.toLowerCase() === email.toLowerCase()) {
        records.push(r);
      }
    }
  } catch {}

  // 2. Try fetching from Supabase database
  if (email) {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('email', email);

      if (!error && data) {
        const seenPassIds = new Set(records.map((r) => r.passId));
        for (const item of data) {
          if (!seenPassIds.has(item.pass_id)) {
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
              registeredAt: item.registered_at,
            });
            seenPassIds.add(item.pass_id);
          }
        }
      }
    } catch {}
  }

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
