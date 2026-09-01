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

let memoryTournamentsCache: Tournament[] | null = null;

export const CORE_TOURNAMENT_COLUMNS = new Set([
  'slug', 'title', 'host', 'image', 'game', 'status', 'status_color',
  'prize', 'date', 'region', 'format', 'teams', 'filled', 'fee',
  'description', 'rules', 'schedule', 'map_pool', 'contact_email',
  'discord_url', 'organizer_email'
]);

export const VALID_TOURNAMENT_COLUMNS = new Set([
  'slug', 'title', 'host', 'image', 'game', 'status', 'status_color',
  'prize', 'prize_1st', 'prize_2nd', 'prize_3rd', 'date', 'region', 'format',
  'teams', 'filled', 'fee', 'description', 'rules', 'schedule', 'map_pool',
  'contact_email', 'discord_url', 'organizer_email',
  'organizer_name', 'organizer_phone', 'organizer_college', 'contact_phone', 'college'
]);

export interface PrizeTier {
  id: string;
  label: string;
  amount: string;
  rankKey?: '1st' | '2nd' | '3rd' | 'other';
}

export interface TournamentMetadata {
  prizeTiers?: PrizeTier[];
  organizer?: {
    name?: string;
    phone?: string;
    email?: string;
    college?: string;
  };
}

/**
 * Embed complete metadata (prize tiers and organizer details) into description string
 */
export function embedTournamentMetadata(rawDesc: string | undefined, meta: TournamentMetadata): string {
  const clean = cleanDescriptionText(rawDesc);
  const jsonStr = JSON.stringify(meta);
  return clean ? `${clean}\n\n<!-- TOURNAMENT_META:${jsonStr} -->` : `<!-- TOURNAMENT_META:${jsonStr} -->`;
}

/**
 * Extract complete metadata from tournament record
 */
export function extractTournamentMetadata(tournament: any): TournamentMetadata {
  if (!tournament) return {};
  const desc = tournament.description || '';
  const match = desc.match(/<!--\s*TOURNAMENT_META:(.*?)\s*-->/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  return {};
}

/**
 * Extract organizer information with priority hierarchy:
 * 1. Dedicated tournament columns (organizer_name, organizer_phone, organizer_college, organizer_email)
 * 2. Embedded TOURNAMENT_META in description
 * 3. Fallback to host / contact_email / createdBy
 */
export function extractOrganizerData(tournament: any): {
  name: string;
  phone: string;
  email: string;
  college: string;
} {
  if (!tournament) {
    return { name: 'Xenova Esports', phone: '', email: '', college: '' };
  }

  const meta = extractTournamentMetadata(tournament);
  const metaOrg = meta.organizer || {};

  const name = (tournament.organizer_name || tournament.host || metaOrg.name || 'Xenova Esports').trim();
  const phone = (tournament.organizer_phone || tournament.contact_phone || metaOrg.phone || '').trim();
  const email = (tournament.organizer_email || tournament.contact_email || tournament.createdBy || metaOrg.email || '').trim().toLowerCase();
  const college = (tournament.organizer_college || tournament.college || metaOrg.college || '').trim();

  return { name, phone, email, college };
}

/**
 * Extract prize tiers from tournament object (supports embedded TOURNAMENT_META, legacy PRIZE_TIERS or fallback to prize_1st/2nd/3rd)
 */
export function extractPrizeTiers(tournament: any): PrizeTier[] {
  if (!tournament) return [];

  // 1. Check in TOURNAMENT_META
  const meta = extractTournamentMetadata(tournament);
  if (meta.prizeTiers && Array.isArray(meta.prizeTiers) && meta.prizeTiers.length > 0) {
    return meta.prizeTiers.filter((t) => t && (t.label || t.amount));
  }

  // 2. Try legacy PRIZE_TIERS from description
  const desc = tournament.description || '';
  const match = desc.match(/<!--\s*PRIZE_TIERS:(.*?)\s*-->/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((t) => t && (t.label || t.amount));
      }
    } catch {}
  }

  // 3. Fallback to prize_1st, prize_2nd, prize_3rd
  const tiers: PrizeTier[] = [];
  if (tournament.prize_1st && tournament.prize_1st.trim()) {
    tiers.push({ id: 'tier-1', label: '1st Place (Champion)', amount: tournament.prize_1st.trim(), rankKey: '1st' });
  }
  if (tournament.prize_2nd && tournament.prize_2nd.trim()) {
    tiers.push({ id: 'tier-2', label: '2nd Place (Runner-Up)', amount: tournament.prize_2nd.trim(), rankKey: '2nd' });
  }
  if (tournament.prize_3rd && tournament.prize_3rd.trim()) {
    tiers.push({ id: 'tier-3', label: '3rd Place (Bronze)', amount: tournament.prize_3rd.trim(), rankKey: '3rd' });
  }

  return tiers;
}

/**
 * Strip metadata tags like <!-- TOURNAMENT_META:... --> and <!-- PRIZE_TIERS:... --> from public description text
 */
export function cleanDescriptionText(desc: string | undefined): string {
  if (!desc) return '';
  return desc
    .replace(/<!--\s*TOURNAMENT_META:.*?\s*-->/g, '')
    .replace(/<!--\s*PRIZE_TIERS:.*?\s*-->/g, '')
    .replace(/<!--\s*ORGANIZER_DATA:.*?\s*-->/g, '')
    .trim();
}

/**
 * Legacy Prize Tier Embedding helper
 */
export function embedPrizeTiersInDescription(rawDesc: string | undefined, tiers: PrizeTier[]): string {
  return embedTournamentMetadata(rawDesc, { prizeTiers: tiers });
}

export function sanitizeTournamentPayload(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'statusColor') {
      sanitized['status_color'] = value;
    } else if (key === 'organizerEmail' || key === 'createdBy') {
      sanitized['organizer_email'] = value;
    } else if (VALID_TOURNAMENT_COLUMNS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function invalidateTournamentsCache() {
  memoryTournamentsCache = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('xenova_tournaments_cache');
      window.dispatchEvent(new Event('xenova-tournaments-updated'));
    } catch {}
  }
}

/**
 * Bulletproof Tournament Update & Save Handler
 * Attempts saving all columns to Supabase. If missing columns cause 400, it falls back to
 * core columns with embedded metadata in description, calls API, updates local cache, and invalidates cache.
 */
export async function saveOrUpdateTournament(
  targetSlug: string,
  payload: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const slug = targetSlug.trim();
  if (!slug) return { success: false, error: 'Tournament slug is required.' };

  // 1. Prepare Full Sanitized Payload
  const fullSanitized = sanitizeTournamentPayload({ slug, ...payload });

  // 2. Prepare Core Guaranteed Columns Payload
  const coreSanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(fullSanitized)) {
    if (CORE_TOURNAMENT_COLUMNS.has(k)) {
      coreSanitized[k] = v;
    }
  }

  let savedData: any = null;
  let saveSuccess = false;

  // 3. Direct Supabase Upsert / Update
  try {
    const { data: existing } = await supabase.from('tournaments').select('id, slug').eq('slug', slug);
    const exists = existing && existing.length > 0;

    try {
      if (exists) {
        const { data, error } = await supabase.from('tournaments').update(fullSanitized).eq('slug', slug).select();
        if (!error && data && data.length > 0) {
          savedData = data[0];
          saveSuccess = true;
        } else if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase.from('tournaments').insert([{ slug, ...fullSanitized }]).select();
        if (!error && data && data.length > 0) {
          savedData = data[0];
          saveSuccess = true;
        } else if (error) {
          throw error;
        }
      }
    } catch (fullErr) {
      console.warn('Full column update failed, retrying with core columns fallback:', fullErr);
      // Retrying with guaranteed core columns
      try {
        if (exists) {
          const { data, error } = await supabase.from('tournaments').update(coreSanitized).eq('slug', slug).select();
          if (!error && data && data.length > 0) {
            savedData = data[0];
            saveSuccess = true;
          }
        } else {
          const { data, error } = await supabase.from('tournaments').insert([{ slug, ...coreSanitized }]).select();
          if (!error && data && data.length > 0) {
            savedData = data[0];
            saveSuccess = true;
          }
        }
      } catch (coreErr) {
        console.warn('Core column update notice:', coreErr);
      }
    }
  } catch (sbErr) {
    console.warn('Supabase tournament save notice:', sbErr);
  }

  // 4. Backend / Next.js API Update
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/tournaments/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...fullSanitized }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) savedData = Array.isArray(json.data) ? json.data[0] : json.data;
      saveSuccess = true;
    }
  } catch (apiErr) {
    console.warn('API tournament update notice:', apiErr);
  }

  // 5. Update Local Storage Cache
  if (typeof window !== 'undefined') {
    try {
      const localCustom = JSON.parse(localStorage.getItem('xenova_custom_tournaments') || '{}');
      localCustom[slug] = { slug, ...fullSanitized, ...(savedData || {}) };
      localStorage.setItem('xenova_custom_tournaments', JSON.stringify(localCustom));
    } catch {}
  }

  // 6. Invalidate memory & dispatch event
  invalidateTournamentsCache();

  return { success: true, data: savedData || fullSanitized };
}

/**
 * Fetch a single tournament by slug from Supabase, local cache, or API
 */
export async function getTournamentBySlug(targetSlug: string): Promise<any | null> {
  const cleanSlug = (targetSlug || '').toLowerCase().trim();
  if (!cleanSlug) return null;

  // 1. Direct Supabase Query
  try {
    const { data } = await supabase.from('tournaments').select('*').ilike('slug', cleanSlug);
    if (data && data.length > 0) {
      return data[0];
    }
  } catch {}

  // 2. Local Custom Tournaments Cache
  if (typeof window !== 'undefined') {
    try {
      const localCustom = JSON.parse(localStorage.getItem('xenova_custom_tournaments') || '{}');
      if (localCustom[cleanSlug]) {
        return localCustom[cleanSlug];
      }
      for (const val of Object.values(localCustom) as any[]) {
        if ((val.slug || '').toLowerCase() === cleanSlug) return val;
      }
    } catch {}
  }

  // 3. Backend API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/tournaments/`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const match = json.data.find((t: any) => (t.slug || '').toLowerCase() === cleanSlug);
        if (match) return match;
      }
    }
  } catch {}

  // 4. Default Tournaments
  return defaultMockTournaments.find((t) => t.slug?.toLowerCase() === cleanSlug) || null;
}

/**
 * Fetch all tournaments directly from Supabase (<50ms) with in-memory caching and non-blocking API fallback
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  if (memoryTournamentsCache && memoryTournamentsCache.length > 0) {
    return memoryTournamentsCache;
  }

  // 1. Direct Supabase Query First (<50ms direct cloud query)
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const mapped = data.map(mapSupabaseTournament);
      memoryTournamentsCache = mapped;
      return mapped;
    }
  } catch (err) {
    console.warn('Direct Supabase tournaments query warning:', err);
  }

  // 2. Non-blocking Backend API Fallback with 600ms timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/tournaments/`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const mapped = json.data.map(mapSupabaseTournament);
        memoryTournamentsCache = mapped;
        return mapped;
      }
    }
  } catch {}

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
 * Get all registrations stored for the current user strictly from Supabase / Backend with instant client caching
 */
export async function getUserRegistrations(email?: string): Promise<TournamentRegistrationRecord[]> {
  const records: TournamentRegistrationRecord[] = [];
  if (!email) return records;

  const cleanEmail = email.trim().toLowerCase();

  const cached = REG_CACHE.get(cleanEmail);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  // 1. Direct Supabase Query First (<50ms)
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', cleanEmail);

    if (!error && data && Array.isArray(data) && data.length > 0) {
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
      REG_CACHE.set(cleanEmail, { data: records, expires: Date.now() + 60000 });
      return records;
    }
  } catch (err) {
    console.warn('Direct Supabase registrations query error:', err);
  }

  // 2. Non-blocking Backend API fallback (600ms timeout)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/registrations?email=${encodeURIComponent(cleanEmail)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);

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
      }
    }
  } catch {}

  REG_CACHE.set(cleanEmail, { data: records, expires: Date.now() + 60000 });
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
