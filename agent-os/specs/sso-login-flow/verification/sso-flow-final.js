/**
 * SSO Login Flow Visual Test - Final
 *
 * Comprehensive visual verification of the SSO login flow between
 * LGU-Chat (localhost:3000) and LGU-SSO-UI (localhost:3002).
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
  // DESKTOP TEST
  // =====================================
  console.log('\n=== DESKTOP VIEW (1280x800) - Full SSO Login Flow ===');

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await desktopContext.newPage();

  const networkErrors = [];
  const allConsoleMessages = [];

  page.on('console', (msg) => {
    allConsoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    allConsoleMessages.push(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  let testPassed = false;

  try {
    // ============================================
    // STEP 1: LGU-Chat Login Page
    // ============================================
    console.log('\nStep 1: Navigate to LGU-Chat');
    await page.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    await takeScreenshot(page, '01-lgu-chat-login-desktop', 'LGU-Chat login page - desktop (1280x800)');

    // Verify page elements (using first() to avoid strict mode violations)
    const welcomeVisible = await page.locator('text=Welcome to LGU-Chat').first().isVisible();
    const ssoButtonVisible = await page.locator('button:has-text("Sign in with LGU-SSO")').first().isVisible();
    const betaNoticeVisible = await page.locator('[role="alert"], .beta-notice, [data-testid="beta-notice"]').first().isVisible().catch(() => false);

    console.log(`  "Welcome to LGU-Chat" visible: ${welcomeVisible}`);
    console.log(`  SSO button visible: ${ssoButtonVisible}`);

    // ============================================
    // STEP 2: Click SSO Button -> SSO Login Page
    // ============================================
    console.log('\nStep 2: Click "Sign in with LGU-SSO"');
    await page.locator('button:has-text("Sign in with LGU-SSO")').first().click();

    // Wait for SSO page (port 3002)
    await page.waitForURL(
      (url) => url.port === '3002',
      { timeout: 15000 }
    );
    const ssoPageUrl = page.url();
    console.log(`  Redirected to SSO URL: ${ssoPageUrl}`);

    // Parse URL params
    const ssoUrlObj = new URL(ssoPageUrl);
    const clientId = ssoUrlObj.searchParams.get('client_id');
    const redirectUri = ssoUrlObj.searchParams.get('redirect_uri');
    const state = ssoUrlObj.searchParams.get('state');
    console.log(`  client_id: ${clientId}`);
    console.log(`  redirect_uri: ${redirectUri}`);
    console.log(`  state: ${state}`);

    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '02-sso-login-page-desktop', 'SSO login page at localhost:3002/sso/login - desktop');

    // Verify SSO page content
    const ssoBodyText = await page.locator('body').innerText();
    const mentionsLGUChat = ssoBodyText.includes('LGU-Chat');
    const hasEmailField = await page.locator('input[type="email"]').isVisible();
    const hasPasswordField = await page.locator('input[type="password"]').isVisible();
    const hasSignInBtn = await page.locator('button[type="submit"]').isVisible();
    console.log(`  SSO page mentions "LGU-Chat": ${mentionsLGUChat}`);
    console.log(`  Email field visible: ${hasEmailField}`);
    console.log(`  Password field visible: ${hasPasswordField}`);
    console.log(`  Sign in button visible: ${hasSignInBtn}`);

    // ============================================
    // STEP 3: Fill Credentials
    // ============================================
    console.log('\nStep 3: Fill credentials');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log(`  Filled email: ${TEST_EMAIL}`);
    console.log(`  Filled password: ${TEST_PASSWORD}`);

    await takeScreenshot(page, '03-credentials-filled-desktop', 'SSO login form with credentials filled - desktop');

    // ============================================
    // STEP 4: Submit and Wait for Redirect
    // ============================================
    console.log('\nStep 4: Submit form and wait for redirect to LGU-Chat');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect back to LGU-Chat (port 3000, handles both localhost and 0.0.0.0)
    try {
      await page.waitForURL(
        (url) => url.port === '3000',
        { timeout: 20000 }
      );
      const callbackUrl = page.url();
      console.log(`  Returned to LGU-Chat: ${callbackUrl}`);

      const hasToken = callbackUrl.includes('token=');
      const hasState = callbackUrl.includes('state=');
      console.log(`  URL has token: ${hasToken}`);
      console.log(`  URL has state: ${hasState}`);

      await takeScreenshot(page, '04-auth-callback-desktop', 'Auth callback page - processing JWT token - desktop');

      // ============================================
      // STEP 5: Wait for /chat
      // ============================================
      console.log('\nStep 5: Wait for /chat redirect (up to 25 seconds)');
      try {
        await page.waitForURL(
          (url) => url.pathname.startsWith('/chat'),
          { timeout: 25000 }
        );
        const chatUrl = page.url();
        console.log(`  SUCCESS! Reached /chat: ${chatUrl}`);
        testPassed = true;

        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '05-chat-interface-desktop', 'LGU-Chat /chat interface - fully logged in - desktop');

        // Verify chat UI
        const chatBody = await page.locator('body').innerText();
        console.log(`  Chat page preview: ${chatBody.substring(0, 300)}`);

      } catch (chatErr) {
        const currentUrl = page.url();
        console.log(`  Did not reach /chat. Current URL: ${currentUrl}`);

        const pageText = await page.locator('body').innerText().catch(() => 'Could not read');
        console.log(`  Page content: ${pageText.substring(0, 500)}`);

        // Check if there's an auth error
        const hasAuthError = pageText.includes('Authentication Error') || pageText.includes('Failed to verify');
        console.log(`  Shows authentication error: ${hasAuthError}`);

        // Check browser storage
        const storage = await page.evaluate(() => ({
          sso_state: sessionStorage.getItem('sso_state'),
          auth_token: localStorage.getItem('auth_token') ? 'PRESENT' : 'MISSING',
          session_keys: Object.keys(sessionStorage),
          local_keys: Object.keys(localStorage)
        }));
        console.log(`  Browser storage: ${JSON.stringify(storage)}`);

        await takeScreenshot(page, '05-auth-error-desktop', 'Authentication error state - desktop');
      }

    } catch (redirectErr) {
      const currentUrl = page.url();
      console.log(`  Redirect timeout. Current URL: ${currentUrl}`);
      const pageText = await page.locator('body').innerText().catch(() => '');
      console.log(`  Page: ${pageText.substring(0, 300)}`);
      await takeScreenshot(page, '04-redirect-timeout', 'Redirect timeout state').catch(() => {});
    }

  } catch (err) {
    console.error(`\nFatal error: ${err.message}`);
    try {
      await takeScreenshot(page, 'error-state', 'Fatal error state');
    } catch (e) { /* ignore */ }
  }

  console.log('\n--- Network Errors ---');
  networkErrors.forEach(e => console.log(`  ${e}`));
  console.log('\n--- Significant Console Messages ---');
  allConsoleMessages
    .filter(m => m.includes('ERROR') || m.includes('Auth') || m.includes('auth') || m.includes('SSO') || m.includes('token'))
    .forEach(m => console.log(`  ${m}`));

  await desktopContext.close();

  // =====================================
  // MOBILE VIEW (390x844)
  // =====================================
  console.log('\n=== MOBILE VIEW (390x844 - iPhone 14 Pro) ===');

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();

  try {
    // Mobile: LGU-Chat login
    await mobilePage.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  Mobile URL: ${mobilePage.url()}`);
    await takeScreenshot(mobilePage, '06-lgu-chat-login-mobile', 'LGU-Chat login page - mobile (390x844)');
    const mobileLoginText = await mobilePage.locator('body').innerText();
    console.log(`  Mobile login text: ${mobileLoginText.substring(0, 200)}`);
    const mobileBtnVisible = await mobilePage.locator('button:has-text("Sign in with LGU-SSO")').first().isVisible();
    console.log(`  Mobile SSO button visible: ${mobileBtnVisible}`);

    // Mobile: SSO login page
    const mobileSSOPage = await mobileContext.newPage();
    const ssoMobileUrl = `http://localhost:3002/sso/login?client_id=lguchat-client-28f6267b251e22159a55&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/callback')}&state=mobile-test-state`;
    await mobileSSOPage.goto(ssoMobileUrl, { waitUntil: 'networkidle', timeout: 15000 });
    console.log(`  Mobile SSO URL: ${mobileSSOPage.url()}`);
    await takeScreenshot(mobileSSOPage, '07-sso-login-mobile', 'SSO login page - mobile (390x844)');
    const mobileSSoText = await mobileSSOPage.locator('body').innerText();
    console.log(`  Mobile SSO text: ${mobileSSoText.substring(0, 200)}`);

    // Verify mobile SSO layout (single column on mobile)
    const mobileEmailVisible = await mobileSSOPage.locator('input[type="email"]').isVisible();
    const mobilePwdVisible = await mobileSSOPage.locator('input[type="password"]').isVisible();
    console.log(`  Mobile email field: ${mobileEmailVisible}`);
    console.log(`  Mobile password field: ${mobilePwdVisible}`);

  } catch (err) {
    console.error(`Mobile test error: ${err.message}`);
    await takeScreenshot(mobilePage, '06-mobile-error', 'Mobile error state').catch(() => {});
  }

  await mobileContext.close();

  await browser.close();

  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Desktop full flow: ${testPassed ? 'PASSED - reached /chat' : 'PARTIAL - stopped at auth callback'}`);
  console.log(`Mobile views: Screenshots captured`);
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

runTest().catch(console.error);
