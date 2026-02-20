/**
 * SSO Login Flow Visual Test - v2
 *
 * Enhanced version that waits properly for client-side redirects and captures
 * more detail about the authentication callback page state.
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
  console.log('\n=== DESKTOP VIEW (1280x800) ===');
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
    // STEP 1: LGU-Chat login page
    console.log('\nStep 1: Loading LGU-Chat login page...');
    await page.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  URL: ${page.url()}`);
    console.log(`  Title: ${await page.title()}`);

    // Get all visible text to understand the page
    const bodyText = await page.locator('body').innerText();
    console.log(`  Page text excerpt: ${bodyText.substring(0, 300)}`);

    await takeScreenshot(page, '01-lgu-chat-login-desktop', 'LGU-Chat login page - desktop view');

    // STEP 2: Click SSO button
    console.log('\nStep 2: Clicking SSO login button...');
    const ssoButton = page.locator('text=Sign in with LGU-SSO');
    await ssoButton.waitFor({ state: 'visible', timeout: 5000 });

    // Intercept the sessionStorage before navigation
    await ssoButton.click();

    // Wait for SSO page
    await page.waitForURL(/localhost:3002/, { timeout: 15000 });
    const ssoUrl = page.url();
    console.log(`  Redirected to SSO URL: ${ssoUrl}`);

    // Parse the state from the URL
    const urlParams = new URL(ssoUrl);
    const stateParam = urlParams.searchParams.get('state');
    const clientId = urlParams.searchParams.get('client_id');
    const redirectUri = urlParams.searchParams.get('redirect_uri');
    console.log(`  State: ${stateParam}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Redirect URI: ${redirectUri}`);

    // Wait for SSO page to fully load
    await page.waitForLoadState('networkidle');
    const ssoPageText = await page.locator('body').innerText();
    console.log(`  SSO page text: ${ssoPageText.substring(0, 500)}`);

    await takeScreenshot(page, '02-sso-login-page-desktop', 'SSO login page at localhost:3002/sso/login - desktop view');

    // STEP 3: Fill credentials
    console.log('\nStep 3: Filling credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log(`  Filled: ${TEST_EMAIL} / ${TEST_PASSWORD}`);

    await takeScreenshot(page, '03-credentials-filled-desktop', 'SSO login form with credentials filled - desktop view');

    // STEP 4: Submit the form
    console.log('\nStep 4: Submitting form...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for any navigation (SSO might redirect to callback)
    console.log('  Waiting for navigation after submit...');

    try {
      // Wait for redirect back to localhost:3000
      await page.waitForURL(/localhost:3000/, { timeout: 20000 });
      const callbackUrl = page.url();
      console.log(`  Returned to LGU-Chat: ${callbackUrl}`);

      await takeScreenshot(page, '04-auth-callback-desktop', 'Auth callback page - processing token - desktop view');

      // The callback page runs client-side JS to:
      // 1. Validate CSRF state from sessionStorage
      // 2. Call /api/users/me to verify the token
      // 3. Redirect to /chat if successful

      // Wait for either /chat redirect or error state
      console.log('  Waiting for callback processing (up to 30s)...');

      let finalUrl = callbackUrl;
      try {
        // Wait for the client-side redirect to /chat
        await page.waitForURL(/localhost:3000\/chat/, { timeout: 25000 });
        finalUrl = page.url();
        console.log(`  SUCCESS! Final URL: ${finalUrl}`);

        await takeScreenshot(page, '05-chat-interface-desktop', 'LGU-Chat /chat interface - successfully logged in - desktop view');

      } catch (chatWaitError) {
        // Maybe it's showing an error, check what's on screen
        finalUrl = page.url();
        console.log(`  Did not reach /chat. Current URL: ${finalUrl}`);

        const callbackText = await page.locator('body').innerText().catch(() => 'Could not read body');
        console.log(`  Callback page text: ${callbackText}`);

        // Check if there's an error message shown
        const hasError = callbackText.toLowerCase().includes('error') || callbackText.toLowerCase().includes('failed');
        console.log(`  Has error text: ${hasError}`);

        // Check sessionStorage
        const sessionState = await page.evaluate(() => {
          return {
            sso_state: sessionStorage.getItem('sso_state'),
            allKeys: Object.keys(sessionStorage)
          };
        });
        console.log(`  SessionStorage state: ${JSON.stringify(sessionState)}`);

        await takeScreenshot(page, '05-callback-stuck-desktop', 'Auth callback - stuck or error state - desktop view');
      }

    } catch (redirectError) {
      console.log(`  Error waiting for redirect back: ${redirectError.message}`);
      const currentUrl = page.url();
      console.log(`  Current URL: ${currentUrl}`);
      const pageText = await page.locator('body').innerText().catch(() => 'Could not read');
      console.log(`  Page text: ${pageText.substring(0, 300)}`);

      await takeScreenshot(page, '04-submit-result-desktop', 'After form submit - result page - desktop view');
    }

  } catch (err) {
    console.error(`Fatal error in desktop test: ${err.message}`);
    await takeScreenshot(page, 'error-desktop', 'Error state - desktop').catch(() => {});
  }

  // Print network errors
  if (networkErrors.length > 0) {
    console.log('\nNetwork Errors Observed:');
    networkErrors.forEach(e => console.log(`  ${e}`));
  }

  // Print console messages
  if (consoleMessages.length > 0) {
    console.log('\nBrowser Console Messages:');
    consoleMessages.forEach(msg => console.log(`  ${msg}`));
  }

  await desktopContext.close();

  // =====================================
  // MOBILE TEST
  // =====================================
  console.log('\n=== MOBILE VIEW (390x844 - iPhone 14) ===');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto(LGUCHAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`  Mobile URL: ${mobilePage.url()}`);
    await takeScreenshot(mobilePage, '06-lgu-chat-login-mobile', 'LGU-Chat login page - mobile view (390px)');

    // Also check the SSO page on mobile
    const mobileSSO = await mobileContext.newPage();
    await mobileSSO.goto('http://localhost:3002/sso/login', { waitUntil: 'networkidle', timeout: 15000 });
    await takeScreenshot(mobileSSO, '07-sso-login-mobile', 'SSO login page - mobile view (390px)');

  } catch (err) {
    console.log(`Mobile test error: ${err.message}`);
    await takeScreenshot(mobilePage, '06-mobile-error', 'Mobile test error').catch(() => {});
  }

  await mobileContext.close();

  await browser.close();

  console.log('\n=== TEST COMPLETE ===');
  console.log(`Screenshots in: ${SCREENSHOTS_DIR}`);
}

runTest().catch(console.error);
