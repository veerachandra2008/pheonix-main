/**
 * Comprehensive Automated Auth Storage Test Suite
 * Validating Scenarios A through O for Xenova Auth Storage Fix.
 */

import {
  XENOVA_SESSION_KEY,
  MAX_XENOVA_SESSION_BYTES,
  sanitizeSessionPayload,
  setXenovaSession,
  getXenovaSession,
  clearXenovaSession,
  type XenovaSessionData,
} from '../src/lib/auth-session';

// Setup Mock Browser Environment
class MockStorage {
  private store: Map<string, string> = new Map();
  public setItemCallCount = 0;
  public throwQuotaErrorOnKey: string | null = null;
  public throwQuotaErrorPermanent = false;

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.setItemCallCount++;
    if (this.throwQuotaErrorOnKey === key) {
      if (!this.throwQuotaErrorPermanent) {
        this.throwQuotaErrorOnKey = null; // one-time failure
      }
      const err = new Error("Failed to execute 'setItem' on 'Storage': Setting the value of 'xenova_session' exceeded the quota.");
      err.name = 'QuotaExceededError';
      (err as any).code = 22;
      throw err;
    }
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.setItemCallCount = 0;
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

const mockLocalStorage = new MockStorage();
const eventListeners: { [type: string]: Array<(e: any) => void> } = {};

class MockEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
}

class MockCustomEvent extends MockEvent {
  detail: any;
  constructor(type: string, init?: any) {
    super(type);
    this.detail = init?.detail;
  }
}

let cookieStore: string[] = [];

(global as any).Event = MockEvent;
(global as any).CustomEvent = MockCustomEvent;

(global as any).window = {
  localStorage: mockLocalStorage,
  dispatchEvent: (event: any) => {
    const list = eventListeners[event.type] || [];
    list.forEach((fn) => fn(event));
    return true;
  },
  addEventListener: (type: string, listener: any) => {
    if (!eventListeners[type]) eventListeners[type] = [];
    eventListeners[type].push(listener);
  },
  removeEventListener: (type: string, listener: any) => {
    if (!eventListeners[type]) return;
    eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
  },
};

(global as any).localStorage = mockLocalStorage;

(global as any).document = {
  get cookie() {
    return cookieStore.join('; ');
  },
  set cookie(val: string) {
    cookieStore.push(val);
  },
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 XENOVA AUTH STORAGE AUTOMATED TEST SUITE');
console.log('======================================================\n');

// -------------------------------------------------------------------
// Scenario A: Normal Login Flow
// -------------------------------------------------------------------
console.log('--- Scenario A: Normal Login Flow ---');
mockLocalStorage.clear();

const validLoginInput = {
  id: 'usr_abc123',
  email: 'phoenix_pro@xenova.gg',
  name: 'Phoenix Pro',
  role: 'PLAYER',
  college: 'IIT Bombay',
  tag: '@PHOENIX#1337',
  avatar: '/valorant.jpg',
  bio: 'Competitive Duelist',
  team: 'Team Prime',
};

const setResult = setXenovaSession(validLoginInput);
assert(setResult === true, 'setXenovaSession returns true on successful write');

const rawStorage = mockLocalStorage.getItem(XENOVA_SESSION_KEY);
assert(rawStorage !== null, 'xenova_session exists in storage after login');

let parsed: any = null;
try {
  parsed = JSON.parse(rawStorage || '');
} catch {}
assert(parsed !== null && typeof parsed === 'object', 'xenova_session is valid JSON');
assert(parsed?.email === 'phoenix_pro@xenova.gg', 'Session email matches login email');
assert(parsed?.user?.email === 'phoenix_pro@xenova.gg', 'Nested user.email matches login email');
assert(parsed?.user?.role === 'PLAYER', 'Nested user.role matches login role');

// -------------------------------------------------------------------
// Scenario B: Normal Refresh Flow
// -------------------------------------------------------------------
console.log('\n--- Scenario B: Normal Refresh Flow ---');
const restored = getXenovaSession();
assert(restored !== null, 'getXenovaSession restores session cleanly on simulated page refresh');
assert(restored?.id === 'usr_abc123', 'Restored id matches');
assert(restored?.email === 'phoenix_pro@xenova.gg', 'Restored email matches');
assert(restored?.name === 'Phoenix Pro', 'Restored name matches');
assert(restored?.user?.id === 'usr_abc123', 'Restored user.id matches');
assert(restored?.user?.role === 'PLAYER', 'Restored user.role matches');

// -------------------------------------------------------------------
// Scenario C: Minimal Payload Verification
// -------------------------------------------------------------------
console.log('\n--- Scenario C: Minimal Payload Verification ---');
const byteLength = new TextEncoder().encode(rawStorage || '').length;
console.log(`  📊 Measured session payload byte size: ${byteLength} bytes`);
assert(byteLength < 400, `Payload byte length (${byteLength} B) is < 400 bytes (far below 5MB quota)`);
assert(byteLength <= MAX_XENOVA_SESSION_BYTES, `Payload is within ${MAX_XENOVA_SESSION_BYTES} byte ceiling`);

// Check allowed fields whitelist
const allowedFields = new Set([
  'user', 'id', 'email', 'role', 'name', 'college', 'tag', 'avatar', 'bio', 'team', 'hostName', 'phone'
]);
const actualKeys = Object.keys(parsed || {});
const illegalKeys = actualKeys.filter((k) => !allowedFields.has(k));
assert(illegalKeys.length === 0, `Payload contains only whitelisted fields (no illegal keys: ${illegalKeys.join(', ')})`);

const userKeys = Object.keys(parsed?.user || {});
const illegalUserKeys = userKeys.filter((k) => !['id', 'email', 'role'].includes(k));
assert(illegalUserKeys.length === 0, `Nested user object contains strictly id, email, role (illegal: ${illegalUserKeys.join(', ')})`);

// -------------------------------------------------------------------
// Scenario D: Large Payload Prevention (Arrays, Objects, Base64)
// -------------------------------------------------------------------
console.log('\n--- Scenario D: Large Payload Prevention ---');
const largeBase64String = 'data:image/png;base64,' + 'A'.repeat(500000); // 500 KB base64
const bloatedPayload = {
  id: 'usr_bloated',
  email: 'bloated@xenova.gg',
  name: 'Bloated Gamer',
  role: 'PLAYER',
  avatar: largeBase64String, // Massive base64
  avatar_url: largeBase64String,
  // Simulated huge tournament history and database bloat
  tournaments: Array.from({ length: 500 }, (_, i) => ({
    id: `tourn_${i}`,
    name: `Championship ${i}`,
    brackets: Array(20).fill('match_data'),
    rosters: Array(10).fill({ player: 'sample' }),
  })),
  raw_token: 'secret_jwt_token_that_should_never_be_stored',
  sensitive_pass: 'password123',
};

const sanitized = sanitizeSessionPayload(bloatedPayload);
assert(sanitized !== null, 'sanitizeSessionPayload returns non-null for valid email');
assert(sanitized?.avatar === '/valorant.jpg', 'Massive base64 avatar was stripped and replaced with safe default');
assert((sanitized as any).tournaments === undefined, 'Unbounded tournaments array was completely stripped');
assert((sanitized as any).raw_token === undefined, 'Sensitive token was completely stripped');
assert((sanitized as any).sensitive_pass === undefined, 'Sensitive password was completely stripped');

mockLocalStorage.clear();
setXenovaSession(bloatedPayload);
const storedBloated = mockLocalStorage.getItem(XENOVA_SESSION_KEY);
const bloatedSize = new TextEncoder().encode(storedBloated || '').length;
console.log(`  📊 Size of stored bloated payload after sanitization: ${bloatedSize} bytes`);
assert(bloatedSize < 400, `Bloated input was compressed to ${bloatedSize} bytes (< 400 bytes)`);

// -------------------------------------------------------------------
// Scenario E: Event Loop / Repeated Write Storm (Idempotency)
// -------------------------------------------------------------------
console.log('\n--- Scenario E: Repeated Write Storm (Idempotency) ---');
mockLocalStorage.clear();
let dispatchedEventsCount = 0;
const testListener = () => { dispatchedEventsCount++; };
window.addEventListener('xenova-auth-change', testListener);

const stablePayload = {
  id: 'usr_stable',
  email: 'stable@xenova.gg',
  role: 'PLAYER',
  name: 'Stable Player',
};

// First write
setXenovaSession(stablePayload);
const writesAfterFirst = mockLocalStorage.setItemCallCount;
const eventsAfterFirst = dispatchedEventsCount;
assert(writesAfterFirst === 1, 'First setXenovaSession triggered 1 storage write');
assert(eventsAfterFirst === 1, 'First setXenovaSession triggered 1 event dispatch');

// Repeated identical writes (simulate rapid component renders / hook updates)
for (let i = 0; i < 10; i++) {
  setXenovaSession(stablePayload);
}
assert(mockLocalStorage.setItemCallCount === 1, `10 repeated identical writes made 0 additional storage writes (total: ${mockLocalStorage.setItemCallCount})`);
assert(dispatchedEventsCount === 1, `10 repeated identical writes made 0 additional event dispatches (total: ${dispatchedEventsCount})`);

window.removeEventListener('xenova-auth-change', testListener);

// -------------------------------------------------------------------
// Scenario F: Existing Oversized Storage Recovery
// -------------------------------------------------------------------
console.log('\n--- Scenario F: Existing Oversized Storage Recovery ---');
// Inject a corrupt oversized string left by old legacy code (> 2KB)
const corruptedOversizedString = JSON.stringify({
  user: { id: 'usr_legacy', email: 'legacy@xenova.gg', role: 'PLAYER' },
  massive_bloat: 'Z'.repeat(4000),
});
mockLocalStorage.setItem(XENOVA_SESSION_KEY, corruptedOversizedString);
assert(mockLocalStorage.getItem(XENOVA_SESSION_KEY)?.length! > MAX_XENOVA_SESSION_BYTES, 'Injected oversized session into storage');

// Reading it should detect corruption, purge it, and return null
const recovered = getXenovaSession();
assert(recovered === null, 'getXenovaSession returns null when storage exceeds 2048 bytes');
assert(mockLocalStorage.getItem(XENOVA_SESSION_KEY) === null, 'Oversized storage key was purged from localStorage');

// -------------------------------------------------------------------
// Scenario G: QuotaExceededError Simulation & Safe Recovery
// -------------------------------------------------------------------
console.log('\n--- Scenario G: QuotaExceededError Simulation & Safe Recovery ---');
mockLocalStorage.clear();
// Seed non-critical caches
mockLocalStorage.setItem('xenova_players_directory_v2', 'some_cached_players_data');
mockLocalStorage.setItem('xenova_passes_tourn1', 'cached_pass_data');
mockLocalStorage.setItem('xenova_cache_metadata', 'cached_metadata');

// Configure mock to throw QuotaExceededError once
mockLocalStorage.throwQuotaErrorOnKey = XENOVA_SESSION_KEY;
mockLocalStorage.throwQuotaErrorPermanent = false; // will succeed on retry after cache eviction

let didThrow = false;
let writeSucceeded = false;
try {
  writeSucceeded = setXenovaSession({
    id: 'usr_recovery',
    email: 'recovery@xenova.gg',
    role: 'PLAYER',
    name: 'Recovery Player',
  });
} catch (e) {
  didThrow = true;
}

assert(didThrow === false, 'setXenovaSession NEVER throws unhandled QuotaExceededError');
assert(writeSucceeded === true, 'setXenovaSession succeeded on retry after evicting non-critical caches');
assert(mockLocalStorage.getItem('xenova_players_directory_v2') === null, 'Non-critical players directory cache was evicted');
assert(mockLocalStorage.getItem('xenova_passes_tourn1') === null, 'Non-critical passes cache was evicted');
assert(mockLocalStorage.getItem(XENOVA_SESSION_KEY) !== null, 'xenova_session was successfully written');

// Permanent quota exhaustion (e.g. disk completely full)
mockLocalStorage.throwQuotaErrorOnKey = XENOVA_SESSION_KEY;
mockLocalStorage.throwQuotaErrorPermanent = true;
didThrow = false;
let failSafeResult = false;
try {
  failSafeResult = setXenovaSession({
    id: 'usr_fail',
    email: 'fail@xenova.gg',
    role: 'PLAYER',
    name: 'Fail Player',
  });
} catch (e) {
  didThrow = true;
}
assert(didThrow === false, 'Even under permanent storage quota failure, setXenovaSession does not crash the app');
assert(failSafeResult === false, 'Returns false defensively to indicate storage failure without breaking UI flow');
mockLocalStorage.throwQuotaErrorPermanent = false;
mockLocalStorage.throwQuotaErrorOnKey = null;

// -------------------------------------------------------------------
// Scenario H: Logout Flow
// -------------------------------------------------------------------
console.log('\n--- Scenario H: Logout Flow ---');
// Seed a session first
setXenovaSession(validLoginInput);
assert(getXenovaSession() !== null, 'Session active before logout');

clearXenovaSession();
assert(mockLocalStorage.getItem(XENOVA_SESSION_KEY) === null, 'localStorage xenova_session is null after logout');
assert(getXenovaSession() === null, 'getXenovaSession returns null after logout');
assert(document.cookie.includes('xenova_user_role=;'), 'Role cookie cleared on logout');

// -------------------------------------------------------------------
// Scenario I: Custom Event Contract & Listener
// -------------------------------------------------------------------
console.log('\n--- Scenario I: Custom Event Contract & Listener ---');
let capturedEventDetail: any = null;
const authListener = (e: any) => {
  capturedEventDetail = e.detail;
};
window.addEventListener('xenova-auth-change', authListener);

setXenovaSession(validLoginInput);
assert(capturedEventDetail !== null, 'xenova-auth-change event dispatched with detail');
assert(capturedEventDetail?.action === 'login', 'Event detail action is "login"');
assert(capturedEventDetail?.user?.email === validLoginInput.email, 'Event detail contains user object');

clearXenovaSession();
assert(capturedEventDetail?.action === 'logout', 'Logout dispatches event with action "logout"');
assert(capturedEventDetail?.user === null, 'Logout event carries null user');

window.removeEventListener('xenova-auth-change', authListener);

// -------------------------------------------------------------------
// Scenario J, K, L: Role Preservation (PLAYER, ORGANIZER, ADMIN)
// -------------------------------------------------------------------
console.log('\n--- Scenarios J, K, L: Role Preservation ---');
// Player
const playerSess = sanitizeSessionPayload({ email: 'player@xenova.gg', role: 'PLAYER' });
assert(playerSess?.role === 'PLAYER' && playerSess?.user?.role === 'PLAYER', 'PLAYER role strictly preserved');

// Organizer
const orgSess = sanitizeSessionPayload({
  email: 'org@xenova.gg',
  role: 'ORGANIZER',
  hostName: 'Nexus Arena',
  phone: '+91 98765 43210',
});
assert(orgSess?.role === 'ORGANIZER' && orgSess?.user?.role === 'ORGANIZER', 'ORGANIZER role strictly preserved');
assert(orgSess?.hostName === 'Nexus Arena', 'Organizer hostName preserved');
assert(orgSess?.phone === '+91 98765 43210', 'Organizer phone preserved');

// Admin
const adminSess = sanitizeSessionPayload({ email: 'admin@xenova.gg', role: 'ADMIN' });
assert(adminSess?.role === 'ADMIN' && adminSess?.user?.role === 'ADMIN', 'ADMIN role strictly preserved');

// -------------------------------------------------------------------
// Scenario M: Supabase Auth Storage Isolation
// -------------------------------------------------------------------
console.log('\n--- Scenario M: Supabase Auth Storage Isolation ---');
const fakeSupabaseToken = JSON.stringify({
  access_token: 'sb_access_token_123',
  refresh_token: 'sb_refresh_token_456',
  user: { id: 'sb_user_1', email: 'sb@test.com' },
});
mockLocalStorage.setItem('sb-abcdefghij-auth-token', fakeSupabaseToken);

setXenovaSession(validLoginInput);
const preservedSbToken = mockLocalStorage.getItem('sb-abcdefghij-auth-token');
assert(preservedSbToken === fakeSupabaseToken, 'Supabase internal auth token storage was untouched and unaffected');

// -------------------------------------------------------------------
// Summary
// -------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL AUTH STORAGE TEST SCENARIOS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
