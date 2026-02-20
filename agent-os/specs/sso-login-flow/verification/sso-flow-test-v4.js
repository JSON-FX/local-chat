/**
 * SSO Login Flow Visual Test - v4
 *
 * Final version that properly handles the 0.0.0.0 redirect hostname issue
 * and tests both the complete flow and visual elements.
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
  // DESKTOP TEST - Full SSO Flow
  // =====================================
  console.log('\n=== DESKTOP VIEW (1280x800) - Full SSO Login Flow ===');

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

  let testPassed = false;

  try {
    // STEP 1: Navigate to LGU-Chat
    console.log('\nStep 1: Navigate to LGU-Chat login page');
    await page.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    const loginPageText = await page.locator('body').innerText();
    console.log(`  Page text: ${loginPageText.substring(0, 200)}`);

    await takeScreenshot(page, '01-lgu-chat-login-desktop', 'LGU-Chat login page - desktop (1280x800)');

    // Verify login page elements
    const welcomeText = await page.locator('text=Welcome to LGU-Chat').isVisible();
    const ssoButton = await page.locator('text=Sign in with LGU-SSO').isVisible();
    const betaNotice = await page.locator('text=BETA').isVisible();
    console.log(`  Welcome text visible: ${welcomeText}`);
    console.log(`  SSO button visible: ${ssoButton}`);
    console.log(`  Beta notice visible: ${betaNotice}`);

    if (!ssoButton) {
      throw new Error('SSO login button not found on login page');
    }

    // STEP 2: Click SSO button and go through the full flow
    console.log('\nStep 2: Clicking "Sign in with LGU-SSO" button');
    await page.locator('text=Sign in with LGU-SSO').click();

    // Wait for SSO UI page
    await page.waitForURL((url) => url.hostname === 'localhost' && url.port === '3002', { timeout: 15000 });
    const ssoUrl = page.url();
    console.log(`  Redirected to SSO: ${ssoUrl}`);

    // Verify SSO URL parameters
    const ssoUrlObj = new URL(ssoUrl);
    console.log(`  client_id: ${ssoUrlObj.searchParams.get('client_id')}`);
    console.log(`  redirect_uri: ${ssoUrlObj.searchParams.get('redirect_uri')}`);
    console.log(`  state: ${ssoUrlObj.searchParams.get('state')}`);

    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '02-sso-login-page-desktop', 'SSO login page at localhost:3002/sso/login - desktop');

    // Verify SSO page content
    const ssoContent = await page.locator('body').innerText();
    const hasLGUChatMention = ssoContent.includes('LGU-Chat');
    const hasSignInTitle = ssoContent.includes('Sign in');
    console.log(`  SSO page mentions LGU-Chat: ${hasLGUChatMention}`);
    console.log(`  SSO page has "Sign in" text: ${hasSignInTitle}`);
    console.log(`  SSO page title: ${await page.title()}`);

    // STEP 3: Fill credentials
    console.log('\nStep 3: Filling credentials');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    const emailValue = await page.inputValue('input[type="email"]');
    console.log(`  Email filled: ${emailValue}`);

    await takeScreenshot(page, '03-credentials-filled-desktop', 'SSO login form with credentials filled - desktop');

    // STEP 4: Submit and wait for redirect
    console.log('\nStep 4: Submitting credentials and waiting for redirect');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation (may go to 0.0.0.0 or localhost:3000)
    console.log('  Waiting for post-submit navigation...');

    // Use a URL matcher that handles both 0.0.0.0 and localhost
    let redirectedUrl = null;
    try {
      await page.waitForURL(
        (url) => (url.hostname === 'localhost' || url.hostname === '0.0.0.0') && url.port === '3000',
        { timeout: 20000 }
      );
      redirectedUrl = page.url();
      console.log(`  Redirected to: ${redirectedUrl}`);
    } catch (err) {
      console.log(`  Wait for localhost:3000 failed: ${err.message.split('\n')[0]}`);
      redirectedUrl = page.url();
      console.log(`  Current URL: ${redirectedUrl}`);
    }

    await takeScreenshot(page, '04-auth-callback-desktop', 'Auth callback page - processing token - desktop');

    const callbackText = await page.locator('body').innerText().catch(() => '');
    console.log(`  Callback page text: ${callbackText.substring(0, 300)}`);

    // STEP 5: Wait for final /chat destination
    console.log('\nStep 5: Waiting for /chat redirect...');
    try {
      // Wait up to 25 seconds for /chat
      await page.waitForURL(
        (url) => url.pathname.startsWith('/chat'),
        { timeout: 25000 }
      );

      const finalUrl = page.url();
      console.log(`  SUCCESS! Reached: ${finalUrl}`);
      testPassed = true;

      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '05-chat-interface-desktop', 'LGU-Chat /chat interface - successfully logged in - desktop');

      // Verify chat UI elements
      const chatContent = await page.locator('body').innerText();
      console.log(`  Chat page text: ${chatContent.substring(0, 300)}`);

    } catch (chatErr) {
      const currentUrl = page.url();
      console.log(`  Did not reach /chat. URL: ${currentUrl}`);

      const pageText = await page.locator('body').innerText().catch(() => 'Could not read body');
      console.log(`  Page content: ${pageText.substring(0, 500)}`);

      // Check browser storage
      const storageState = await page.evaluate(() => ({
        sso_state: sessionStorage.getItem('sso_state'),
        auth_token: localStorage.getItem('auth_token'),
      }));
      console.log(`  SessionStorage sso_state: ${storageState.sso_state}`);
      console.log(`  LocalStorage auth_token: ${storageState.auth_token ? 'SET (token present)' : 'NOT SET'}`);

      await takeScreenshot(page, '05-auth-failed-desktop', 'Auth failed - error state displayed - desktop');
    }

  } catch (err) {
    console.error(`\nFatal error: ${err.message}`);
    await takeScreenshot(page, 'error-fatal', 'Fatal error state').catch(() => {});
  }

  // Summary
  console.log('\n--- Desktop Test Network Errors ---');
  networkErrors.forEach(e => console.log(`  ${e}`));
  console.log('\n--- Desktop Console Messages ---');
  consoleMessages
    .filter(m => m.includes('ERROR') || m.includes('error') || m.includes('Auth'))
    .forEach(m => console.log(`  ${m}`));

  await desktopContext.close();

  // =====================================
  // MOBILE VIEW
  // =====================================
  console.log('\n=== MOBILE VIEW (390x844 - iPhone 14) ===');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });

  const mobilePage = await mobileContext.newPage();

  try {
    // Mobile: LGU-Chat login page
    await mobilePage.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  Mobile login URL: ${mobilePage.url()}`);
    const mobileLoginText = await mobilePage.locator('body').innerText();
    console.log(`  Mobile page text: ${mobileLoginText.substring(0, 200)}`);
    await takeScreenshot(mobilePage, '06-lgu-chat-login-mobile', 'LGU-Chat login page - mobile (390px iPhone 14)');

    // Verify mobile layout of login
    const mobileSSOBtn = await mobilePage.locator('text=Sign in with LGU-SSO').isVisible();
    console.log(`  Mobile SSO button visible: ${mobileSSOBtn}`);

    // Mobile: SSO login page
    const mobileSSOPage = await mobileContext.newPage();
    await mobileSSOPage.goto(
      `http://localhost:3002/sso/login?client_id=lguchat-client-28f6267b251e22159a55&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/callback')}&state=mobile-visual-test`,
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    console.log(`  Mobile SSO URL: ${mobileSSOPage.url()}`);
    await takeScreenshot(mobileSSOPage, '07-sso-login-mobile', 'SSO login page - mobile (390px)');
    const mobileSSoText = await mobileSSOPage.locator('body').innerText();
    console.log(`  Mobile SSO text: ${mobileSSoText.substring(0, 200)}`);

  } catch (err) {
    console.error(`Mobile test error: ${err.message}`);
    await takeScreenshot(mobilePage, '06-mobile-error', 'Mobile test error').catch(() => {});
  }

  await mobileContext.close();

  await browser.close();

  console.log('\n=== TEST COMPLETE ===');
  console.log(`Overall result: ${testPassed ? 'FULL LOGIN FLOW PASSED' : 'LOGIN FLOW STOPPED AT AUTH CALLBACK'}`);
  console.log(`Screenshots in: ${SCREENSHOTS_DIR}`);
}

runTest().catch(console.error);
