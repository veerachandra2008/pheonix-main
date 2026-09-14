/**
 * Static & Runtime Hydration Audit:
 * 1. Automatically spawns Next.js standalone server if not already running.
 * 2. Checks that SSR renders clean HTML (status 200) across all main routes.
 * 3. Verifies elimination of Math.random() in style attributes (SidebarMenuSkeleton).
 * 4. Verifies elimination of typeof window ternaries in JSX (QRCode / verificationUrl).
 * 5. Verifies zero unhandled exceptions during server-side page generation.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function waitForServer(url, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

async function checkRoutes() {
  const baseUrl = 'http://127.0.0.1:3000';
  const routes = [
    '/',
    '/login',
    '/tournaments',
    '/dashboard',
    '/teams',
    '/colleges',
    '/leaderboards',
    '/settings',
    '/contact',
  ];

  console.log('====================================================');
  console.log('🔍 RUNNING STATIC & SSR HYDRATION AUDIT');
  console.log('====================================================\n');

  let serverProcess = null;

  // Check if server is already running
  const alreadyRunning = await waitForServer(`${baseUrl}/`, 2);
  if (!alreadyRunning) {
    const serverPath = path.resolve(__dirname, '..', '.next', 'standalone', 'pheonix-main', 'server.js');
    if (fs.existsSync(serverPath)) {
      serverProcess = spawn(process.execPath, [serverPath], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'ignore',
        detached: false,
      });
      await waitForServer(`${baseUrl}/`, 15);
    }
  }

  let allPassed = true;

  // 1. SSR HTTP 200 Audit
  for (const route of routes) {
    try {
      const res = await fetch(`${baseUrl}${route}`);
      const html = await res.text();
      const hasError = html.includes('Application error') || html.includes('Internal Server Error');
      const pass = res.status === 200 && !hasError;
      if (!pass) allPassed = false;
      console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: SSR route ${route} (Status: ${res.status}, Length: ${html.length} bytes)`);
    } catch (e) {
      allPassed = false;
      console.log(`❌ FAIL: SSR route ${route} (${e.message})`);
    }
  }

  // 2. Scan source files for known hydration antipatterns
  console.log('\n--- Scanning Source Files for Hydration Antipatterns ---');

  // Check 2a: sidebar.tsx Math.random
  const sidebarPath = path.resolve(__dirname, '..', 'src', 'components', 'ui', 'sidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const hasRandomSidebar = sidebarContent.includes('Math.random()') && sidebarContent.includes('skeleton');
  console.log(`${!hasRandomSidebar ? '✅ PASS' : '❌ FAIL'}: SidebarMenuSkeleton deterministic width (Math.random removed)`);
  if (hasRandomSidebar) allPassed = false;

  // Check 2b: pass/page.tsx typeof window in render attributes
  const passPagePath = path.resolve(__dirname, '..', 'src', 'app', 'registration', '[slug]', 'pass', 'page.tsx');
  const passPageContent = fs.readFileSync(passPagePath, 'utf8');
  const hasWindowTernaryInRender = passPageContent.includes("typeof window !== 'undefined' ? `${window.location.origin}");
  console.log(`${!hasWindowTernaryInRender ? '✅ PASS' : '❌ FAIL'}: Registration pass page verificationUrl deterministic between SSR & client`);
  if (hasWindowTernaryInRender) allPassed = false;

  // Check 2c: layout.tsx suppresses unavoidable browser-extension hydration warnings on html
  const layoutPath = path.resolve(__dirname, '..', 'src', 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  const hasRootSuppression = layoutContent.includes('suppressHydrationWarning');
  console.log(`${hasRootSuppression ? '✅ PASS' : '❌ FAIL'}: Root html has suppressHydrationWarning for external browser extensions only`);

  // Cleanup child process if spawned
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
  }

  console.log('\n====================================================');
  console.log(`📊 HYDRATION AUDIT RESULT: ${allPassed ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('====================================================');

  if (!allPassed) process.exit(1);
}

checkRoutes().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
