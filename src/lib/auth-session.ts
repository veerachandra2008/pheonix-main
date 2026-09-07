/**
 * Xenova Auth Session Manager
 * 
 * Hardened, minimal client-side session storage for UI state.
 * Supabase Auth remains the authoritative authentication source.
 * 
 * Invariants:
 * 1. Strictly bounded size (MAX_XENOVA_SESSION_BYTES = 2048).
 * 2. Idempotent writes: no storage writes or event dispatches if content is unchanged.
 * 3. Base64 and large payloads are rejected/stripped.
 * 4. Never stores tokens, passwords, service-role keys, payment credentials, or tournament/roster arrays.
 * 5. Safe recovery from existing oversized/corrupted storage and QuotaExceededError.
 */

export const XENOVA_SESSION_KEY = 'xenova_session';
export const MAX_XENOVA_SESSION_BYTES = 2048; // 2 KB ceiling

export type UserRole = 'PLAYER' | 'ORGANIZER' | 'ADMIN';

export interface XenovaUserCore {
  id: string;
  email: string;
  role: UserRole;
}

export interface XenovaSessionData {
  user: XenovaUserCore;
  id: string;
  email: string;
  role: UserRole;
  name: string;
  college: string;
  tag: string;
  avatar: string;
  bio?: string;
  team?: string;
  hostName?: string;
  phone?: string;
}

/**
 * Strips dangerous, sensitive, or oversized keys and retains ONLY minimal UI state.
 * Never allows base64 data URIs, tokens, secrets, or large objects.
 */
export function sanitizeSessionPayload(input: any): XenovaSessionData | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  // Handle either flat structure or nested input.user
  const rawId = input.id || input.user?.id || input.userId || input.user_id;
  const rawEmail = input.email || input.user?.email;

  if (!rawEmail || typeof rawEmail !== 'string') {
    return null;
  }

  const email = rawEmail.trim().toLowerCase();
  const id = typeof rawId === 'string' && rawId.trim().length > 0
    ? rawId.trim()
    : `usr_${Math.abs(hashString(email))}`;

  // Normalize role strictly to PLAYER, ORGANIZER, or ADMIN
  let role: UserRole = 'PLAYER';
  const rawRole = (input.role || input.user?.role || '').toString().trim().toUpperCase();
  if (rawRole === 'ADMIN') {
    role = 'ADMIN';
  } else if (rawRole === 'ORGANIZER') {
    role = 'ORGANIZER';
  } else {
    role = 'PLAYER';
  }

  // Sanitize display name (max 80 chars)
  const defaultName = email.split('@')[0] || 'Player';
  const rawName = typeof input.name === 'string' ? input.name.trim() : (input.user?.name || defaultName);
  const name = (rawName || defaultName).slice(0, 80);

  // Sanitize college (max 80 chars)
  const rawCollege = typeof input.college === 'string' ? input.college.trim() : 'General Campus';
  const college = (rawCollege || 'General Campus').slice(0, 80);

  // Sanitize gamer tag (max 40 chars)
  const defaultTag = `@${name.toUpperCase().replace(/\s+/g, '')}#1337`;
  const rawTag = typeof input.tag === 'string' ? input.tag.trim() : defaultTag;
  const tag = (rawTag || defaultTag).slice(0, 40);

  // Sanitize avatar: NEVER allow base64/data URLs
  let avatar = '/valorant.jpg';
  const rawAvatar = input.avatar || input.avatar_url || input.user?.avatar;
  if (typeof rawAvatar === 'string' && rawAvatar.trim().length > 0) {
    const trimmedAvatar = rawAvatar.trim();
    // Exclude data URIs (base64) or abnormally long URLs (> 256 chars)
    if (!trimmedAvatar.startsWith('data:') && !trimmedAvatar.includes(';base64,') && trimmedAvatar.length <= 256) {
      avatar = trimmedAvatar;
    }
  }

  // Sanitize short bio (max 120 chars)
  let bio: string | undefined = undefined;
  if (typeof input.bio === 'string' && input.bio.trim().length > 0) {
    bio = input.bio.trim().slice(0, 120);
  }

  // Sanitize team name (max 80 chars)
  let team: string | undefined = undefined;
  if (typeof input.team === 'string' && input.team.trim().length > 0) {
    team = input.team.trim().slice(0, 80);
  }

  // Sanitize organizer specific fields (only if role is ORGANIZER)
  let hostName: string | undefined = undefined;
  let phone: string | undefined = undefined;
  if (role === 'ORGANIZER') {
    if (typeof input.hostName === 'string' && input.hostName.trim().length > 0) {
      hostName = input.hostName.trim().slice(0, 80);
    }
    if (typeof input.phone === 'string' && input.phone.trim().length > 0) {
      phone = input.phone.trim().slice(0, 30);
    }
  }

  const result: XenovaSessionData = {
    user: {
      id,
      email,
      role,
    },
    id,
    email,
    role,
    name,
    college,
    tag,
    avatar,
    ...(bio ? { bio } : {}),
    ...(team ? { team } : {}),
    ...(hostName ? { hostName } : {}),
    ...(phone ? { phone } : {}),
  };

  return result;
}

/**
 * Fast string hashing utility for fallback deterministic identifiers.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function dispatchAuthChange(action: 'login' | 'logout' | 'update', user: XenovaSessionData | null) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('xenova-auth-change', { detail: { action, user } }));
    } else {
      window.dispatchEvent(new Event('xenova-auth-change'));
    }
  } catch {}
}

/**
 * Safely evicts non-critical cached data if browser storage is constrained.
 * Never touches auth credentials or user tickets needed for verification.
 */
function evictNonCriticalCaches(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    // 1. Remove player directory cache (re-fetchable anytime)
    storage.removeItem('xenova_players_directory_v2');
    storage.removeItem('xenova_following');

    // 2. Remove cached tournament passes (re-fetchable from backend)
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (key.startsWith('xenova_passes_') || key.startsWith('xenova_cache_'))) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      storage.removeItem(k);
    }
  } catch {
    // Ignore storage inspection errors
  }
}

/**
 * Reads and validates xenova_session safely.
 * If the stored item is oversized (> 2KB) or corrupted, it is purged automatically.
 */
export function getXenovaSession(): XenovaSessionData | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(XENOVA_SESSION_KEY);
    if (!raw) {
      return null;
    }

    // Defensive Guard 1: Detect oversized legacy or corrupted sessions
    if (raw.length > MAX_XENOVA_SESSION_BYTES) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Xenova Auth] Purging oversized session payload: ${raw.length} bytes (limit: ${MAX_XENOVA_SESSION_BYTES})`);
      }
      storage.removeItem(XENOVA_SESSION_KEY);
      dispatchAuthChange('logout', null);
      return null;
    }

    // Defensive Guard 2: Safe JSON parse
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSessionPayload(parsed);

    if (!sanitized) {
      storage.removeItem(XENOVA_SESSION_KEY);
      dispatchAuthChange('logout', null);
      return null;
    }

    return sanitized;
  } catch (err) {
    // Corrupted JSON or storage error -> purge safely
    try {
      storage.removeItem(XENOVA_SESSION_KEY);
      dispatchAuthChange('logout', null);
    } catch {}
    return null;
  }
}

/**
 * Stores minimal user session in localStorage.
 * 
 * Guarantees:
 * - Sanitizes payload to strict minimal fields.
 * - Rejects oversized data before writing.
 * - Idempotency: skips write and event if unchanged.
 * - Catches QuotaExceededError, attempts cache eviction, and retries once.
 * - NEVER throws an unhandled error to the caller.
 */
export function setXenovaSession(data: any): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  const sanitized = sanitizeSessionPayload(data);
  if (!sanitized) {
    return false;
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(sanitized);
  } catch {
    return false;
  }

  // Defensive Guard: Size Ceiling Check
  if (serialized.length > MAX_XENOVA_SESSION_BYTES) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Xenova Auth] Blocked oversized session write: ${serialized.length} bytes. Allowed keys:`,
        Object.keys(sanitized)
      );
    }
    return false;
  }

  // Idempotency Check: Do not rewrite identical content to avoid loops & event spam
  try {
    const existingRaw = storage.getItem(XENOVA_SESSION_KEY);
    if (existingRaw === serialized) {
      return true; // Already up-to-date
    }
  } catch {
    // Proceed to set attempt
  }

  // Attempt Write with QuotaExceededError Recovery
  try {
    storage.setItem(XENOVA_SESSION_KEY, serialized);
    dispatchAuthChange('login', sanitized);
    return true;
  } catch (storageError: any) {
    // If quota exceeded, perform safe cache eviction and retry once
    const isQuotaError =
      storageError?.name === 'QuotaExceededError' ||
      storageError?.code === 22 ||
      storageError?.code === 1014 ||
      (storageError?.message && storageError.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[Xenova Auth] QuotaExceededError on '${XENOVA_SESSION_KEY}' (${serialized.length} bytes). Evicting non-critical caches...`
        );
      }

      try {
        evictNonCriticalCaches();
        storage.setItem(XENOVA_SESSION_KEY, serialized);
        dispatchAuthChange('login', sanitized);
        return true;
      } catch (retryError) {
        // Last-ditch: purge only the existing xenova_session so we do not leave corrupted state
        try {
          storage.removeItem(XENOVA_SESSION_KEY);
        } catch {}
        console.error('[Xenova Auth] Storage quota exhausted. Supabase Auth session remains authoritative.');
        return false;
      }
    }

    return false;
  }
}

/**
 * Completely clears custom xenova_session and related cookies on logout.
 */
export function clearXenovaSession(): void {
  if (typeof window === 'undefined') return;

  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(XENOVA_SESSION_KEY);
    } catch {}
  }

  try {
    document.cookie = 'xenova_session=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'xenova_user_role=; path=/; max-age=0; SameSite=Lax';
  } catch {}

  dispatchAuthChange('logout', null);
}
