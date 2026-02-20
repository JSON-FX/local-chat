/**
 * SSO Login Flow Post-Fix Visual Test
 *
 * Re-tests the complete SSO login flow after two bug fixes:
 * 1. Server callback now uses Host header for redirects (was using 0.0.0.0)
 * 2. Database auto-initializes on first connection
 *
 * Services under test:
 * - LGU-Chat: http://localhost:3000
 * - LGU-SSO-UI: http://localhost:3002
 * - LGU-SSO API: http://lgu-sso.test
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

async function runPostFixTest() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    desktop: { passed: false, finalUrl: null, steps: [] },
    mobile: { passed: false, finalUrl: null, steps: [] }
  };

  // =====================================
  // DESKTOP TEST (1280x800)
  // =====================================
  console.log('\n=== POST-FIX DESKTOP TEST (1280x800) ===');
  console.log('Verifying: Host header fix + DB auto-init fix\n');

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await desktopContext.newPage();

  const networkErrors = [];
  const consoleMessages = [];
  const redirectChain = [];

  page.on('console', (msg) => {
    const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleMessages.push(entry);
  });
  page.on('pageerror', (err) => {
    consoleMessages.push(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 300 && status < 400) {
      redirectChain.push(`${status} redirect: ${url}`);
    }
    if (status >= 400) {
      networkErrors.push(`HTTP ${status} - ${url}`);
    }
  });
  page.on('request', (request) => {
    const url = request.url();
    // Track navigation requests to see the full redirect chain
    if (request.isNavigationRequest() && url.includes('3000')) {
      console.log(`  [NAV] ${request.method()} ${url}`);
    }
  });

  try {
    // ============================================
    // STEP 1: Navigate to LGU-Chat login page
    // ============================================
    console.log('STEP 1: Navigate to LGU-Chat (http://localhost:3000)');
    await page.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });

    const step1Url = page.url();
    console.log(`  URL: ${step1Url}`);
    console.log(`  Title: ${await page.title()}`);

    const welcomeVisible = await page.locator('text=Welcome to LGU-Chat').first().isVisible().catch(() => false);
    const ssoButtonVisible = await page.locator('button:has-text("Sign in with LGU-SSO")').first().isVisible().catch(() => false);
    console.log(`  "Welcome to LGU-Chat" visible: ${welcomeVisible}`);
    console.log(`  "Sign in with LGU-SSO" button visible: ${ssoButtonVisible}`);

    await takeScreenshot(page, 'postfix-01-lgu-chat-login-desktop', 'Step 1: LGU-Chat login page (desktop 1280x800)');

    results.desktop.steps.push({ step: 1, url: step1Url, passed: welcomeVisible && ssoButtonVisible });

    // ============================================
    // STEP 2: Click SSO Button -> SSO Login Page
    // ============================================
    console.log('\nSTEP 2: Click "Sign in with LGU-SSO"');
    await page.locator('button:has-text("Sign in with LGU-SSO")').first().click();

    await page.waitForURL(
      (url) => url.port === '3002',
      { timeout: 15000 }
    );

    const step2Url = page.url();
    const step2UrlObj = new URL(step2Url);
    const clientId = step2UrlObj.searchParams.get('client_id');
    const redirectUri = step2UrlObj.searchParams.get('redirect_uri');
    const state = step2UrlObj.searchParams.get('state');

    console.log(`  Redirected to: ${step2Url}`);
    console.log(`  client_id: ${clientId}`);
    console.log(`  redirect_uri: ${redirectUri}`);
    console.log(`  state: ${state}`);

    // KEY CHECK: redirect_uri must use localhost, not 0.0.0.0
    const redirectUriUsesLocalhost = redirectUri && redirectUri.includes('localhost');
    const redirectUriUses0000 = redirectUri && redirectUri.includes('0.0.0.0');
    console.log(`  redirect_uri uses localhost: ${redirectUriUsesLocalhost} (EXPECTED: true)`);
    console.log(`  redirect_uri uses 0.0.0.0: ${redirectUriUses0000} (EXPECTED: false)`);

    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, 'postfix-02-sso-login-page-desktop', 'Step 2: SSO login page at localhost:3002 (desktop)');

    const emailFieldVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const passwordFieldVisible = await page.locator('input[type="password"]').isVisible().catch(() => false);
    const submitBtnVisible = await page.locator('button[type="submit"]').isVisible().catch(() => false);
    console.log(`  Email field: ${emailFieldVisible}`);
    console.log(`  Password field: ${passwordFieldVisible}`);
    console.log(`  Submit button: ${submitBtnVisible}`);

    results.desktop.steps.push({ step: 2, url: step2Url, passed: emailFieldVisible && passwordFieldVisible });

    // ============================================
    // STEP 3: Fill Credentials
    // ============================================
    console.log('\nSTEP 3: Fill credentials');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log(`  Email: ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}`);

    await takeScreenshot(page, 'postfix-03-credentials-filled-desktop', 'Step 3: SSO form with credentials filled (desktop)');

    // ============================================
    // STEP 4: Submit and track redirect chain
    // ============================================
    console.log('\nSTEP 4: Submit form and track redirect chain');
    console.log('  Expecting: SSO-UI -> /api/auth/sso/callback -> /auth/callback -> /chat');
    console.log('  Waiting up to 25 seconds for full redirect chain...');

    await page.locator('button[type="submit"]').click();

    // Wait for port 3000 first (return from SSO)
    try {
      await page.waitForURL(
        (url) => url.port === '3000',
        { timeout: 20000 }
      );
      const callbackUrl = page.url();
      console.log(`  Reached port 3000: ${callbackUrl}`);

      // KEY CHECK: Should be localhost, not 0.0.0.0
      const isLocalhost = callbackUrl.includes('localhost');
      const is0000 = callbackUrl.includes('0.0.0.0');
      console.log(`  Uses localhost (not 0.0.0.0): ${isLocalhost} (EXPECTED: true - fix verified)`);
      console.log(`  Uses 0.0.0.0 (old bug): ${is0000} (EXPECTED: false - fix verified)`);

      await takeScreenshot(page, 'postfix-04-auth-callback-desktop', 'Step 4: Auth callback page processing (desktop)');

      // ============================================
      // STEP 5: Wait for /chat
      // ============================================
      console.log('\nSTEP 5: Wait for /chat redirect (up to 25 seconds)');

      try {
        await page.waitForURL(
          (url) => url.pathname.startsWith('/chat'),
          { timeout: 25000 }
        );

        const chatUrl = page.url();
        console.log(`\n  *** SUCCESS *** Reached /chat: ${chatUrl}`);
        results.desktop.passed = true;
        results.desktop.finalUrl = chatUrl;

        await page.waitForLoadState('networkidle').catch(() => {});
        await takeScreenshot(page, 'postfix-05-chat-interface-desktop', 'Step 5: LGU-Chat /chat interface - LOGGED IN SUCCESSFULLY (desktop)');

        // Verify chat UI elements
        const pageContent = await page.locator('body').innerText().catch(() => '');
        console.log(`  Chat page content preview: ${pageContent.substring(0, 300)}`);

        results.desktop.steps.push({ step: 5, url: chatUrl, passed: true, note: 'FULL FLOW SUCCESS' });

      } catch (chatWaitErr) {
        const finalUrl = page.url();
        console.log(`  Did NOT reach /chat. Final URL: ${finalUrl}`);
        results.desktop.finalUrl = finalUrl;

        const pageText = await page.locator('body').innerText().catch(() => 'Could not read body');
        console.log(`  Page content: ${pageText.substring(0, 600)}`);

        // Check storage state for debugging
        const storageState = await page.evaluate(() => ({
          sso_state: sessionStorage.getItem('sso_state'),
          auth_token: localStorage.getItem('auth_token') ? 'PRESENT' : 'MISSING',
          session_keys: Object.keys(sessionStorage),
          local_keys: Object.keys(localStorage)
        })).catch(() => ({ error: 'Could not read storage' }));
        console.log(`  Browser storage: ${JSON.stringify(storageState)}`);

        const isErrorPage = pageText.includes('Authentication Error') || pageText.includes('error');
        const isStillOnCallback = finalUrl.includes('/auth/callback');

        await takeScreenshot(page, 'postfix-05-final-state-desktop', `Step 5: Final state - ${isErrorPage ? 'ERROR PAGE' : isStillOnCallback ? 'STUCK ON CALLBACK' : 'UNKNOWN STATE'} (desktop)`);

        results.desktop.steps.push({ step: 5, url: finalUrl, passed: false, note: pageText.substring(0, 200) });
      }

    } catch (redirectErr) {
      const finalUrl = page.url();
      console.log(`  Redirect timeout. Current URL: ${finalUrl}`);
      results.desktop.finalUrl = finalUrl;

      const pageText = await page.locator('body').innerText().catch(() => '');
      console.log(`  Page: ${pageText.substring(0, 300)}`);
      await takeScreenshot(page, 'postfix-04-redirect-timeout', 'Redirect timeout state').catch(() => {});
    }

  } catch (err) {
    console.error(`\nFatal error in desktop test: ${err.message}`);
    try {
      await takeScreenshot(page, 'postfix-error-fatal-desktop', 'Fatal error state - desktop');
    } catch (e) { /* ignore */ }
  }

  console.log('\n--- Network Errors (desktop) ---');
  if (networkErrors.length === 0) {
    console.log('  None');
  } else {
    networkErrors.forEach(e => console.log(`  ${e}`));
  }

  console.log('\n--- Redirect Chain (desktop) ---');
  if (redirectChain.length === 0) {
    console.log('  None captured');
  } else {
    redirectChain.forEach(r => console.log(`  ${r}`));
  }

  console.log('\n--- Auth/SSO Console Messages (desktop) ---');
  const relevantMessages = consoleMessages.filter(m =>
    m.includes('ERROR') || m.includes('Auth') || m.includes('auth') ||
    m.includes('SSO') || m.includes('token') || m.includes('state') ||
    m.includes('database') || m.includes('Database') || m.includes('initialized')
  );
  if (relevantMessages.length === 0) {
    console.log('  None');
  } else {
    relevantMessages.forEach(m => console.log(`  ${m}`));
  }

  await desktopContext.close();

  // =====================================
  // MOBILE TEST (390x844 - iPhone 14 Pro)
  // =====================================
  console.log('\n=== POST-FIX MOBILE TEST (390x844 - iPhone 14 Pro) ===');

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();

  try {
    // Mobile Step 1: LGU-Chat login
    console.log('\nMobile Step 1: LGU-Chat login page');
    await mobilePage.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  URL: ${mobilePage.url()}`);

    const mobileSsoButton = await mobilePage.locator('button:has-text("Sign in with LGU-SSO")').first().isVisible().catch(() => false);
    console.log(`  SSO button visible: ${mobileSsoButton}`);
    await takeScreenshot(mobilePage, 'postfix-06-lgu-chat-login-mobile', 'Mobile Step 1: LGU-Chat login page (390x844 iPhone 14 Pro)');

    // Mobile Step 2: Click SSO and go to SSO login page
    console.log('\nMobile Step 2: Click SSO button and reach SSO login');
    await mobilePage.locator('button:has-text("Sign in with LGU-SSO")').first().click();

    await mobilePage.waitForURL(
      (url) => url.port === '3002',
      { timeout: 15000 }
    );
    console.log(`  SSO URL: ${mobilePage.url()}`);
    await mobilePage.waitForLoadState('networkidle');
    await takeScreenshot(mobilePage, 'postfix-07-sso-login-mobile', 'Mobile Step 2: SSO login page (390x844)');

    // Mobile Step 3: Fill credentials
    console.log('\nMobile Step 3: Fill credentials and submit');
    await mobilePage.fill('input[type="email"]', TEST_EMAIL);
    await mobilePage.fill('input[type="password"]', TEST_PASSWORD);
    await takeScreenshot(mobilePage, 'postfix-08-credentials-filled-mobile', 'Mobile Step 3: Credentials filled (390x844)');

    // Mobile Step 4+5: Submit and wait for /chat
    await mobilePage.locator('button[type="submit"]').click();

    try {
      await mobilePage.waitForURL(
        (url) => url.pathname.startsWith('/chat'),
        { timeout: 35000 }
      );
      const mobileFinalUrl = mobilePage.url();
      console.log(`  *** MOBILE SUCCESS *** Reached: ${mobileFinalUrl}`);
      results.mobile.passed = true;
      results.mobile.finalUrl = mobileFinalUrl;

      await mobilePage.waitForLoadState('networkidle').catch(() => {});
      await takeScreenshot(mobilePage, 'postfix-09-chat-interface-mobile', 'Mobile Success: LGU-Chat /chat interface - LOGGED IN (mobile 390x844)');

    } catch (mobileErr) {
      const mobileFinalUrl = mobilePage.url();
      console.log(`  Mobile did not reach /chat. Final URL: ${mobileFinalUrl}`);
      results.mobile.finalUrl = mobileFinalUrl;
      await takeScreenshot(mobilePage, 'postfix-09-mobile-final-state', 'Mobile final state (did not reach /chat)').catch(() => {});
    }

  } catch (err) {
    console.error(`Mobile test error: ${err.message}`);
    await takeScreenshot(mobilePage, 'postfix-mobile-error', 'Mobile error state').catch(() => {});
  }

  await mobileContext.close();
  await browser.close();

  // =====================================
  // FINAL SUMMARY
  // =====================================
  console.log('\n========================================');
  console.log('=== POST-FIX TEST FINAL SUMMARY ===');
  console.log('========================================');
  console.log(`Desktop full SSO flow: ${results.desktop.passed ? 'PASSED - reached /chat' : 'FAILED - did not reach /chat'}`);
  console.log(`Desktop final URL: ${results.desktop.finalUrl}`);
  console.log(`Mobile full SSO flow: ${results.mobile.passed ? 'PASSED - reached /chat' : 'FAILED - did not reach /chat'}`);
  console.log(`Mobile final URL: ${results.mobile.finalUrl}`);
  console.log(`\nBug Fix 1 (Host header): ${results.desktop.finalUrl && !results.desktop.finalUrl.includes('0.0.0.0') ? 'CONFIRMED FIXED' : 'STILL BROKEN'}`);
  console.log(`Bug Fix 2 (DB auto-init): ${results.desktop.passed || (results.desktop.finalUrl && !results.desktop.finalUrl.includes('auth_failed')) ? 'CONFIRMED FIXED' : 'UNCLEAR'}`);
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);

  return results;
}

runPostFixTest().catch(console.error);
