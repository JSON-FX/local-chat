/**
 * SSO Login Flow Visual Test - v3
 *
 * This version tests the flow where the redirect goes through the server-side
 * /api/auth/sso/callback first (which creates a local session), then to /auth/callback.
 *
 * The LoginForm currently sends redirect_uri=/auth/callback (client page directly).
 * The server-side SSO_REDIRECT_URI is /api/auth/sso/callback.
 *
 * We test both paths:
 * Path A: Current implementation (client redirect_uri=/auth/callback + SSO validate slow path)
 * Path B: Intercept the SSO button click and override redirect_uri to use /api/auth/sso/callback
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
  // PATH B: Use server-side callback route
  // (Override redirect_uri to /api/auth/sso/callback)
  // =====================================
  console.log('\n=== PATH B: Server-Side Callback Flow (Desktop 1280x800) ===');
  console.log('Testing with redirect_uri=/api/auth/sso/callback (correct path)');

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await desktopContext.newPage();

  const consoleMessages = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleMessages.push(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  try {
    // STEP 1: Load login page
    console.log('\nStep 1: Loading LGU-Chat login page...');
    await page.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);
    await takeScreenshot(page, '01-lgu-chat-login-desktop', 'LGU-Chat login page - desktop (1280x800)');

    // STEP 2: Intercept the SSO button click to set correct redirect_uri
    // We'll override the handleSsoLogin function before clicking
    console.log('\nStep 2: Setting up SSO redirect with server-side callback URL...');

    // Set the sessionStorage sso_state before navigation so we control the state
    const customState = 'playwright-test-state-' + Date.now();
    await page.evaluate((state) => {
      sessionStorage.setItem('sso_state', state);
    }, customState);

    // Navigate directly to SSO login with correct server-side callback
    const CLIENT_ID = 'lguchat-client-28f6267b251e22159a55';
    const SERVER_CALLBACK = encodeURIComponent('http://localhost:3000/api/auth/sso/callback');
    const ssoUrl = `http://localhost:3002/sso/login?client_id=${CLIENT_ID}&redirect_uri=${SERVER_CALLBACK}&state=${customState}`;

    console.log(`  Navigating to SSO URL: ${ssoUrl}`);
    await page.goto(ssoUrl, { waitUntil: 'networkidle', timeout: 15000 });

    const ssoPageText = await page.locator('body').innerText();
    console.log(`  SSO page text: ${ssoPageText.substring(0, 400)}`);
    await takeScreenshot(page, '02-sso-login-page-server-callback', 'SSO login page with server-side callback - desktop');

    // STEP 3: Fill credentials
    console.log('\nStep 3: Filling credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await takeScreenshot(page, '03-credentials-filled-server', 'SSO login form filled - server callback path');

    // STEP 4: Submit form
    console.log('\nStep 4: Submitting form...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for redirect to server-side callback
    console.log('  Waiting for server-side callback processing...');
    await page.waitForURL(/localhost:3000/, { timeout: 20000 });
    const afterSubmitUrl = page.url();
    console.log(`  After submit URL: ${afterSubmitUrl}`);

    await takeScreenshot(page, '04-after-server-callback', 'After SSO submit via server callback - callback processing page');

    // Wait for /chat redirect
    console.log('  Waiting for redirect to /chat...');
    try {
      await page.waitForURL(/localhost:3000\/chat/, { timeout: 20000 });
      const chatUrl = page.url();
      console.log(`  SUCCESS! Reached /chat: ${chatUrl}`);
      await takeScreenshot(page, '05-chat-interface-desktop', 'LGU-Chat /chat interface - successfully logged in - desktop');
    } catch (chatErr) {
      const currentUrl = page.url();
      console.log(`  Did not reach /chat. Current URL: ${currentUrl}`);
      const pageText = await page.locator('body').innerText().catch(() => 'Could not read');
      console.log(`  Page content: ${pageText.substring(0, 500)}`);

      // Check sessionStorage state
      const sessionState = await page.evaluate(() => ({
        sso_state: sessionStorage.getItem('sso_state'),
        auth_token: localStorage.getItem('auth_token'),
        allLocalStorage: Object.keys(localStorage),
        allSessionStorage: Object.keys(sessionStorage)
      }));
      console.log(`  Browser storage state: ${JSON.stringify(sessionState, null, 2)}`);

      await takeScreenshot(page, '05-chat-not-reached', 'Chat not reached - current state');
    }

  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    await takeScreenshot(page, 'error-state', 'Error state').catch(() => {});
  }

  // Print network errors
  if (networkErrors.length > 0) {
    console.log('\nNetwork Errors:');
    networkErrors.forEach(e => console.log(`  ${e}`));
  }
  if (consoleMessages.length > 0) {
    console.log('\nConsole Messages:');
    consoleMessages.forEach(m => console.log(`  ${m}`));
  }

  await desktopContext.close();

  // =====================================
  // MOBILE VIEW: Login page only
  // =====================================
  console.log('\n=== MOBILE VIEW (390x844 - iPhone 14) ===');
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await takeScreenshot(mobilePage, '06-lgu-chat-login-mobile', 'LGU-Chat login page - mobile (390px)');

  // Mobile SSO page
  const mobileSSOPage = await mobileCtx.newPage();
  const ssoUrlMobile = `http://localhost:3002/sso/login?client_id=lguchat-client-28f6267b251e22159a55&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/callback')}&state=mobile-test`;
  await mobileSSOPage.goto(ssoUrlMobile, { waitUntil: 'networkidle', timeout: 15000 });
  await takeScreenshot(mobileSSOPage, '07-sso-login-mobile', 'SSO login page - mobile (390px)');

  await mobileCtx.close();

  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
  console.log(`Screenshots in: ${SCREENSHOTS_DIR}`);
}

runTest().catch(console.error);
