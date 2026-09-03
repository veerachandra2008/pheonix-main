/**
 * Test all Next.js API endpoints over HTTP:
 * 1. POST /api/auth/register
 * 2. POST /api/auth/login
 * 3. Reject wrong password
 * 4. POST /api/auth/logout
 * 5. POST /api/tournaments/register
 * 6. GET /api/registrations?user_id=...
 * 7. 404 for unhandled endpoint (no fake 200 OK)
 */

async function main() {
  const baseUrl = 'http://127.0.0.1:3000';
  console.log(`Connecting to ${baseUrl}...`);

  // Wait until server responds
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!ready) {
    console.error('❌ Next.js server not responding on port 3000 after 20s');
    process.exit(1);
  }

  console.log('✅ Next.js server is UP and responding!\n');

  const results = [];
  function assert(name, pass, msg) {
    results.push({ name, pass, msg });
    console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${name} (${msg})`);
  }

  const testEmail = `http_test_${Date.now()}@xenova.gg`;
  const testPassword = 'Password!12345';
  let registeredUserId = null;

  // 1. POST /api/auth/register
  try {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'HTTP Test Player',
        email: testEmail,
        password: testPassword,
        college: 'Gaming Tech University',
        role: 'PLAYER',
      }),
    });
    const json = await res.json();
    registeredUserId = json.user?.id;
    assert(
      'HTTP POST /api/auth/register',
      res.status === 201 && json.success && Boolean(registeredUserId),
      `Status: ${res.status}, UUID: ${registeredUserId}`
    );
  } catch (e) {
    assert('HTTP POST /api/auth/register', false, e.message);
  }

  // 2. Reject duplicate registration
  try {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Player',
        email: testEmail,
        password: testPassword,
        college: 'Gaming Tech University',
      }),
    });
    const json = await res.json();
    assert(
      'HTTP POST /api/auth/register duplicate rejection',
      res.status === 400 && !json.success && json.already_registered,
      `Status: ${res.status}, Message: "${json.message}"`
    );
  } catch (e) {
    assert('HTTP POST /api/auth/register duplicate rejection', false, e.message);
  }

  // 3. POST /api/auth/login (valid)
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const json = await res.json();
    assert(
      'HTTP POST /api/auth/login (valid credentials)',
      res.status === 200 && json.success && Boolean(json.session?.access_token),
      `Status: ${res.status}, JWT Token issued for user ${json.user?.id}`
    );
  } catch (e) {
    assert('HTTP POST /api/auth/login (valid credentials)', false, e.message);
  }

  // 4. POST /api/auth/login (wrong password)
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' }),
    });
    const json = await res.json();
    assert(
      'HTTP POST /api/auth/login (invalid credentials rejection)',
      res.status === 401 && !json.success,
      `Status: ${res.status}, Rejected properly with message: "${json.message}"`
    );
  } catch (e) {
    assert('HTTP POST /api/auth/login (invalid credentials rejection)', false, e.message);
  }

  // 5. POST /api/auth/logout
  try {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    const json = await res.json();
    assert(
      'HTTP POST /api/auth/logout',
      res.status === 200 && json.success,
      `Status: ${res.status}`
    );
  } catch (e) {
    assert('HTTP POST /api/auth/logout', false, e.message);
  }

  // 6. POST /api/tournaments/register
  const testPassId = `XPH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  try {
    const res = await fetch(`${baseUrl}/api/tournaments/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournamentSlug: 'valorant-championship-2025',
        tournamentTitle: 'VALORANT Collegiate Championship 2025',
        teamId: 'team-http-1',
        teamName: 'HTTP Legends',
        college: 'Gaming Tech University',
        captainName: 'HTTP Test Player',
        email: testEmail,
        passId: testPassId,
        userId: registeredUserId,
        registeredAt: new Date().toISOString(),
      }),
    });
    const json = await res.json();
    assert(
      'HTTP POST /api/tournaments/register with user_id',
      res.status === 201 && json.success && json.passId === testPassId,
      `Status: ${res.status}, Pass ID: ${json.passId}`
    );
  } catch (e) {
    assert('HTTP POST /api/tournaments/register with user_id', false, e.message);
  }

  // 7. GET /api/registrations?user_id=...
  try {
    const res = await fetch(`${baseUrl}/api/registrations?user_id=${registeredUserId}`);
    const json = await res.json();
    const found = json.success && Array.isArray(json.data) && json.data.some((r) => r.pass_id === testPassId);
    assert(
      'HTTP GET /api/registrations by user_id',
      res.status === 200 && found,
      `Found registration for user_id: ${registeredUserId}`
    );
  } catch (e) {
    assert('HTTP GET /api/registrations by user_id', false, e.message);
  }

  // 8. Strict 404 for unhandled API endpoints
  try {
    const res = await fetch(`${baseUrl}/api/non_existent_endpoint_xyz`);
    assert(
      'Strict 404 for unhandled API route (fake 200 removed)',
      res.status === 404,
      `Status: ${res.status}`
    );
  } catch (e) {
    assert('Strict 404 for unhandled API route (fake 200 removed)', false, e.message);
  }

  console.log('\n====================================================');
  console.log('📊 HTTP ENDPOINTS TEST SUMMARY:');
  console.log('====================================================');
  const passCount = results.filter((r) => r.pass).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${results.length - passCount}`);

  // Cleanup test user and registration
  const { createClient } = require('@supabase/supabase-js');
  const envPath = require('path').resolve(__dirname, '..', '.env.local');
  const envContent = require('fs').readFileSync(envPath, 'utf8');
  let serviceKey = '';
  let sbUrl = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) sbUrl = line.split('=')[1].trim();
  }
  if (serviceKey && sbUrl && registeredUserId) {
    const admin = createClient(sbUrl, serviceKey, { auth: { persistSession: false } });
    await admin.from('registrations').delete().eq('pass_id', testPassId);
    await admin.from('users').delete().eq('id', registeredUserId);
    await admin.auth.admin.deleteUser(registeredUserId);
    console.log('🧹 Cleaned up temporary test user and pass.');
  }

  if (passCount !== results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
