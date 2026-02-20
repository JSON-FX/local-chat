/**
 * SSO Login Flow Visual Re-Test - Post Bug Fix Verification
 *
 * Verifies the full SSO login flow end-to-end after the redirect_uri bug fix.
 * The fix changed LoginForm.tsx to use /api/auth/sso/callback instead of /auth/callback.
 *
 * Flow tested:
 * localhost:3000 -> localhost:3002/sso/login -> POST creds -> SSO API authenticates
 * -> redirect to localhost:3000/api/auth/sso/callback?token=...&state=...
 * -> server creates session -> redirect to /auth/callback?token=...&state=...
 * -> client stores token -> redirect to /chat
 */

const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const LGUCHAT_URL = 'http://localhost:3000';
const TEST_EMAIL = 'admin@lgu-sso.test';
const TEST_PASSWORD = 'password';

async function takeScreenshot(page, name, description) {
  const filename = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`[SCREENSHOT] ${name}.png - ${description}`);
  return filename;
}

async function runTest() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // =====================================
  // DESKTOP TEST - Full Flow
  // =====================================
  console.log('\n=== DESKTOP VIEW (1280x800) - Full SSO Login Flow (Post Bug Fix) ===\n');

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await desktopContext.newPage();

  const networkErrors = [];
  const allConsoleMessages = [];
  const networkRequests = [];

  page.on('console', (msg) => {
    const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    allConsoleMessages.push(entry);
  });
  page.on('pageerror', (err) => {
    allConsoleMessages.push(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    networkRequests.push(`${status} ${url}`);
    if (status >= 400) {
      networkErrors.push(`HTTP ${status} - ${url}`);
    }
  });

  let testPassed = false;
  let finalUrl = '';

  try {
    // ============================================
    // STEP 1: Navigate to LGU-Chat Login Page
    // ============================================
    console.log('STEP 1: Navigate to LGU-Chat (http://localhost:3000)');
    await page.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  Current URL: ${page.url()}`);
    console.log(`  Page Title: ${await page.title()}`);

    const welcomeVisible = await page.locator('text=Welcome to LGU-Chat').first().isVisible().catch(() => false);
    const ssoButtonVisible = await page.locator('button:has-text("Sign in with LGU-SSO")').first().isVisible().catch(() => false);
    console.log(`  "Welcome to LGU-Chat" visible: ${welcomeVisible}`);
    console.log(`  "Sign in with LGU-SSO" button visible: ${ssoButtonVisible}`);

    await takeScreenshot(page, 'step1-lgu-chat-login', 'Step 1: LGU-Chat login page (desktop 1280x800)');

    // ============================================
    // STEP 2: Click SSO Button
    // ============================================
    console.log('\nSTEP 2: Click "Sign in with LGU-SSO" button');
    await page.locator('button:has-text("Sign in with LGU-SSO")').first().click();

    // Wait for redirect to SSO-UI on port 3002
    await page.waitForURL(
      (url) => url.port === '3002',
      { timeout: 15000 }
    );
    const ssoPageUrl = page.url();
    console.log(`  Redirected to: ${ssoPageUrl}`);

    const ssoUrlObj = new URL(ssoPageUrl);
    const clientId = ssoUrlObj.searchParams.get('client_id');
    const redirectUri = ssoUrlObj.searchParams.get('redirect_uri');
    const state = ssoUrlObj.searchParams.get('state');
    console.log(`  client_id: ${clientId}`);
    console.log(`  redirect_uri: ${redirectUri}`);
    console.log(`  state: ${state ? state.substring(0, 16) + '...' : 'MISSING'}`);

    // Verify redirect_uri is the server-side callback (the bug fix)
    const correctRedirectUri = redirectUri && redirectUri.includes('/api/auth/sso/callback');
    console.log(`  redirect_uri uses /api/auth/sso/callback: ${correctRedirectUri} [BUG FIX CHECK]`);

    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'step2-sso-login-page', 'Step 2: SSO login page at localhost:3002 (desktop)');

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const mentionsLGUChat = bodyText.includes('LGU-Chat');
    const hasEmailField = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const hasPasswordField = await page.locator('input[type="password"]').isVisible().catch(() => false);
    const hasSubmitBtn = await page.locator('button[type="submit"]').isVisible().catch(() => false);
    console.log(`  Page says "Sign in to access LGU-Chat": ${bodyText.includes('Sign in to access LGU-Chat')}`);
    console.log(`  Mentions "LGU-Chat": ${mentionsLGUChat}`);
    console.log(`  Email field visible: ${hasEmailField}`);
    console.log(`  Password field visible: ${hasPasswordField}`);
    console.log(`  Submit button visible: ${hasSubmitBtn}`);

    // ============================================
    // STEP 3: Fill Credentials
    // ============================================
    console.log('\nSTEP 3: Fill credentials');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log(`  Email filled: ${TEST_EMAIL}`);
    console.log(`  Password filled: [masked]`);

    await takeScreenshot(page, 'step3-credentials-filled', 'Step 3: SSO form with credentials filled (desktop)');

    // ============================================
    // STEP 4: Submit Login Form
    // ============================================
    console.log('\nSTEP 4: Click submit button and wait for redirect chain');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    console.log('  Form submitted - waiting for redirect to /api/auth/sso/callback...');

    // First redirect: SSO-UI -> LGU-Chat /api/auth/sso/callback
    let serverCallbackReached = false;
    try {
      await page.waitForURL(
        (url) => url.port === '3000' && url.pathname.includes('/api/auth/sso/callback'),
        { timeout: 10000 }
      );
      serverCallbackReached = true;
      console.log(`  Server callback reached: ${page.url()}`);
      await takeScreenshot(page, 'step4a-server-callback', 'Step 4a: LGU-Chat /api/auth/sso/callback reached');
    } catch (e) {
      console.log(`  Server callback URL not captured (fast redirect): ${page.url()}`);
    }

    // Second redirect: /api/auth/sso/callback -> /auth/callback
    let clientCallbackReached = false;
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/callback') && !currentUrl.includes('/api/')) {
      clientCallbackReached = true;
      console.log(`  Already at /auth/callback: ${currentUrl}`);
    } else {
      try {
        await page.waitForURL(
          (url) => url.port === '3000' && url.pathname === '/auth/callback',
          { timeout: 10000 }
        );
        clientCallbackReached = true;
        console.log(`  Client callback reached: ${page.url()}`);
        await takeScreenshot(page, 'step4b-client-callback', 'Step 4b: /auth/callback page processing token');
      } catch (e) {
        console.log(`  /auth/callback not captured (fast redirect or went elsewhere): ${page.url()}`);
      }
    }

    // ============================================
    // STEP 5: Wait for /chat
    // ============================================
    console.log('\nSTEP 5: Waiting for final /chat redirect (up to 25 seconds)...');
    try {
      await page.waitForURL(
        (url) => url.pathname.startsWith('/chat'),
        { timeout: 25000 }
      );
      finalUrl = page.url();
      console.log(`\n  SUCCESS! Reached /chat: ${finalUrl}`);
      testPassed = true;

      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, 'step5-chat-interface', 'Step 5: LGU-Chat /chat interface - fully logged in (desktop)');

      // Verify chat UI elements
      const chatBodyText = await page.locator('body').innerText().catch(() => '');
      console.log(`  Chat page loaded successfully`);
      console.log(`  Page preview: ${chatBodyText.substring(0, 400)}`);

      // Check for key chat UI elements
      const hasSidebar = await page.locator('[class*="sidebar"], nav, aside').first().isVisible().catch(() => false);
      const hasInput = await page.locator('textarea, input[type="text"]').first().isVisible().catch(() => false);
      console.log(`  Chat sidebar/nav visible: ${hasSidebar}`);
      console.log(`  Message input visible: ${hasInput}`);

    } catch (chatErr) {
      finalUrl = page.url();
      console.log(`\n  FAILED to reach /chat. Current URL: ${finalUrl}`);

      const pageText = await page.locator('body').innerText().catch(() => 'Could not read');
      console.log(`  Page content: ${pageText.substring(0, 600)}`);

      const hasAuthError = pageText.includes('Authentication Error') || pageText.includes('Failed to verify');
      const hasInvalidState = pageText.includes('Invalid state');
      const hasMissingParams = pageText.includes('Missing authentication');
      console.log(`  Shows authentication error: ${hasAuthError}`);
      console.log(`  Shows invalid state error: ${hasInvalidState}`);
      console.log(`  Shows missing params error: ${hasMissingParams}`);

      const storage = await page.evaluate(() => ({
        sso_state: sessionStorage.getItem('sso_state'),
        auth_token: localStorage.getItem('auth_token') ? 'PRESENT' : 'MISSING',
        session_keys: Object.keys(sessionStorage),
        local_keys: Object.keys(localStorage)
      })).catch(() => ({ error: 'Could not access storage' }));
      console.log(`  Browser storage: ${JSON.stringify(storage)}`);

      await takeScreenshot(page, 'step5-final-state', 'Step 5: Final state (did not reach /chat)');
    }

  } catch (err) {
    console.error(`\nFatal test error: ${err.message}`);
    try { await takeScreenshot(page, 'fatal-error', 'Fatal error state'); } catch (e) { }
  }

  // ============================================
  // NETWORK & CONSOLE SUMMARY
  // ============================================
  console.log('\n--- Network Errors (4xx/5xx) ---');
  if (networkErrors.length === 0) {
    console.log('  No network errors!');
  } else {
    networkErrors.forEach(e => console.log(`  ${e}`));
  }

  console.log('\n--- Auth/SSO/Token Console Messages ---');
  const relevantMessages = allConsoleMessages.filter(m =>
    m.includes('ERROR') || m.includes('error') ||
    m.includes('Auth') || m.includes('auth') ||
    m.includes('SSO') || m.includes('token') ||
    m.includes('callback') || m.includes('session')
  );
  if (relevantMessages.length === 0) {
    console.log('  No relevant console messages.');
  } else {
    relevantMessages.forEach(m => console.log(`  ${m}`));
  }

  console.log('\n--- Key API Calls ---');
  networkRequests
    .filter(r => r.includes('/api/') || r.includes('/sso/') || r.includes('3002'))
    .forEach(r => console.log(`  ${r}`));

  await desktopContext.close();

  // =====================================
  // MOBILE VIEW (390x844)
  // =====================================
  console.log('\n=== MOBILE VIEW (390x844 - iPhone 14 Pro) ===\n');

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();

  try {
    // Mobile: LGU-Chat login
    await mobilePage.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`Mobile Step 1: LGU-Chat login page`);
    console.log(`  URL: ${mobilePage.url()}`);
    await takeScreenshot(mobilePage, 'mobile-step1-lgu-chat-login', 'Mobile: LGU-Chat login page (390x844)');

    const mobileBtnVisible = await mobilePage.locator('button:has-text("Sign in with LGU-SSO")').first().isVisible().catch(() => false);
    console.log(`  SSO button visible on mobile: ${mobileBtnVisible}`);

    // Mobile: Click SSO button and follow redirect to SSO page
    await mobilePage.locator('button:has-text("Sign in with LGU-SSO")').first().click();
    await mobilePage.waitForURL(
      (url) => url.port === '3002',
      { timeout: 15000 }
    );
    await mobilePage.waitForLoadState('networkidle');
    console.log(`\nMobile Step 2: SSO login page`);
    console.log(`  URL: ${mobilePage.url()}`);
    await takeScreenshot(mobilePage, 'mobile-step2-sso-login', 'Mobile: SSO login page at localhost:3002 (390x844)');

    const mobileBodyText = await mobilePage.locator('body').innerText().catch(() => '');
    console.log(`  Shows "Sign in to access LGU-Chat": ${mobileBodyText.includes('Sign in to access LGU-Chat')}`);
    const mobileEmailVisible = await mobilePage.locator('input[type="email"]').isVisible().catch(() => false);
    const mobilePwdVisible = await mobilePage.locator('input[type="password"]').isVisible().catch(() => false);
    console.log(`  Email field visible: ${mobileEmailVisible}`);
    console.log(`  Password field visible: ${mobilePwdVisible}`);

    // Check that the left branding panel is hidden on mobile
    const leftPanelHidden = await mobilePage.evaluate(() => {
      const panels = document.querySelectorAll('[class*="hidden lg:flex"], .hidden');
      return panels.length > 0;
    }).catch(() => false);
    console.log(`  Left branding panel correctly hidden on mobile: ${leftPanelHidden}`);

  } catch (err) {
    console.error(`Mobile test error: ${err.message}`);
    try { await takeScreenshot(mobilePage, 'mobile-error', 'Mobile error state'); } catch (e) { }
  }

  await mobileContext.close();
  await browser.close();

  // ============================================
  // FINAL RESULT
  // ============================================
  console.log('\n=== FINAL TEST RESULT ===');
  console.log(`Full SSO Flow (Desktop): ${testPassed ? 'PASSED - Successfully reached /chat' : 'FAILED - Did not reach /chat'}`);
  console.log(`Final URL: ${finalUrl}`);
  console.log(`Mobile Views: Screenshots captured`);
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('\nBug Fix Verification:');
  console.log('  LoginForm.tsx redirect_uri changed from /auth/callback to /api/auth/sso/callback');
  console.log(`  End-to-end flow status: ${testPassed ? 'WORKING' : 'STILL FAILING'}`);
}

runTest().catch(console.error);
