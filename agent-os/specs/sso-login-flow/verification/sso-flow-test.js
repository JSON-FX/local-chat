/**
 * SSO Login Flow Visual Test
 *
 * Tests the full SSO login flow between LGU-Chat and LGU-SSO-UI.
 * Steps:
 *  1. Navigate to LGU-Chat (localhost:3000) - see login page
 *  2. Click "Sign in with LGU-SSO" button
 *  3. Fill in credentials on SSO login page (localhost:3002/sso/login)
 *  4. Submit and wait for redirect back to LGU-Chat /chat
 *
 * Screenshots are saved to:
 *  agent-os/specs/sso-login-flow/verification/screenshots/
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(
  __dirname,
  'screenshots'
);

const LGUCAT_URL = 'http://localhost:3000';
const SSO_UI_URL = 'http://localhost:3002';
const TEST_EMAIL = 'admin@lgu-sso.test';
const TEST_PASSWORD = 'password';

async function takeScreenshot(page, name, description) {
  const filename = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`[SCREENSHOT] ${name}.png - ${description}`);
  return filename;
}

async function getConsoleMessages(page) {
  const messages = [];
  page.on('console', (msg) => {
    messages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  return messages;
}

async function runTest() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    steps: [],
    errors: [],
    finalUrl: null,
    passed: false
  };

  let page;

  try {
    // --- DESKTOP TEST ---
    console.log('\n=== DESKTOP VIEW (1280x800) ===');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    page = await desktopContext.newPage();

    const consoleMessages = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      consoleMessages.push(`[PAGE ERROR] ${err.message}`);
    });

    // STEP 1: Navigate to LGU-Chat
    console.log('\nStep 1: Navigating to LGU-Chat...');
    await page.goto(LGUCAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const step1Url = page.url();
    console.log(`  Current URL: ${step1Url}`);

    await takeScreenshot(page, '01-lgu-chat-landing', 'LGU-Chat landing/login page (desktop)');
    results.steps.push({ step: 1, status: 'pass', url: step1Url, description: 'LGU-Chat landing page loaded' });

    // Check for SSO button
    const ssoButtonSelectors = [
      'text=Sign in with LGU-SSO',
      'text=Sign in with SSO',
      'text=Login with LGU-SSO',
      '[data-testid="sso-login-button"]',
      'a[href*="sso"]',
      'button:has-text("SSO")',
      'a:has-text("SSO")'
    ];

    let ssoButton = null;
    for (const selector of ssoButtonSelectors) {
      try {
        ssoButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (ssoButton) {
          console.log(`  Found SSO button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // try next selector
      }
    }

    if (!ssoButton) {
      // Dump page content for debugging
      const pageContent = await page.content();
      console.log('  SSO button NOT found. Page title:', await page.title());
      console.log('  Page body snippet:', pageContent.substring(0, 2000));
      await takeScreenshot(page, '01b-lgu-chat-debug', 'Debug screenshot - SSO button not found');
      results.errors.push('SSO login button not found on LGU-Chat landing page');
    } else {
      // STEP 2: Click SSO button
      console.log('\nStep 2: Clicking "Sign in with LGU-SSO" button...');
      await ssoButton.click();

      // Wait for navigation to SSO UI
      await page.waitForURL(/localhost:3002/, { timeout: 15000 });
      const step2Url = page.url();
      console.log(`  Redirected to: ${step2Url}`);

      await takeScreenshot(page, '02-sso-login-page', 'SSO login page (localhost:3002/sso/login) (desktop)');
      results.steps.push({ step: 2, status: 'pass', url: step2Url, description: 'Redirected to SSO login page' });

      // Verify SSO page content
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      console.log(`  SSO page title: ${pageTitle}`);

      const hasLGUChatText = bodyText.includes('LGU-Chat') || bodyText.includes('lgu-chat');
      console.log(`  Page mentions LGU-Chat: ${hasLGUChatText}`);

      // STEP 3: Fill in credentials
      console.log('\nStep 3: Filling in credentials...');

      // Try multiple selectors for email field
      const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email', 'input[placeholder*="email" i]'];
      const passwordSelectors = ['input[type="password"]', 'input[name="password"]', '#password'];

      let emailFilled = false;
      for (const sel of emailSelectors) {
        try {
          await page.fill(sel, TEST_EMAIL, { timeout: 3000 });
          console.log(`  Filled email with selector: ${sel}`);
          emailFilled = true;
          break;
        } catch (e) {
          // try next
        }
      }

      let passwordFilled = false;
      for (const sel of passwordSelectors) {
        try {
          await page.fill(sel, TEST_PASSWORD, { timeout: 3000 });
          console.log(`  Filled password with selector: ${sel}`);
          passwordFilled = true;
          break;
        } catch (e) {
          // try next
        }
      }

      await takeScreenshot(page, '03-credentials-filled', 'SSO login form filled with credentials (desktop)');
      results.steps.push({
        step: 3,
        status: emailFilled && passwordFilled ? 'pass' : 'partial',
        description: `Credentials filled - email: ${emailFilled}, password: ${passwordFilled}`
      });

      // STEP 4: Submit the form
      console.log('\nStep 4: Submitting login form...');

      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Login")',
        'button:has-text("Log in")',
        'button:has-text("Submit")'
      ];

      let submitted = false;
      for (const sel of submitSelectors) {
        try {
          const btn = await page.waitForSelector(sel, { timeout: 3000 });
          if (btn) {
            await btn.click();
            console.log(`  Clicked submit button with selector: ${sel}`);
            submitted = true;
            break;
          }
        } catch (e) {
          // try next
        }
      }

      if (!submitted) {
        console.log('  Could not find submit button, trying Enter key...');
        await page.keyboard.press('Enter');
      }

      // STEP 5: Wait for redirect back to LGU-Chat
      console.log('\nStep 5: Waiting for redirect back to LGU-Chat...');

      try {
        // First, wait for callback URL
        await page.waitForURL(/localhost:3000/, { timeout: 20000 });
        const callbackUrl = page.url();
        console.log(`  Redirected to LGU-Chat callback: ${callbackUrl}`);

        await takeScreenshot(page, '04-after-submit-redirect', 'After SSO submit - redirect/callback page (desktop)');

        // Then wait for final /chat destination
        if (!callbackUrl.includes('/chat')) {
          await page.waitForURL(/localhost:3000\/chat/, { timeout: 15000 });
        }

        const finalUrl = page.url();
        console.log(`  Final URL: ${finalUrl}`);
        results.finalUrl = finalUrl;

        await takeScreenshot(page, '05-chat-interface', 'Final landing - LGU-Chat chat interface (desktop)');
        results.steps.push({ step: 5, status: 'pass', url: finalUrl, description: 'Successfully redirected to /chat' });
        results.passed = finalUrl.includes('/chat');

      } catch (redirectError) {
        const currentUrl = page.url();
        console.log(`  Redirect wait failed. Current URL: ${currentUrl}`);
        console.log(`  Error: ${redirectError.message}`);
        await takeScreenshot(page, '04-redirect-failed', 'Redirect failed - current state (desktop)');
        results.errors.push(`Redirect failed: ${redirectError.message}. Current URL: ${currentUrl}`);
        results.finalUrl = currentUrl;
      }
    }

    // Print console messages
    if (consoleMessages.length > 0) {
      console.log('\nBrowser Console Messages:');
      consoleMessages.forEach(msg => console.log(' ', msg));
    }

    await desktopContext.close();

    // --- MOBILE TEST ---
    console.log('\n=== MOBILE VIEW (390x844 - iPhone 14) ===');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const mobilePage = await mobileContext.newPage();

    console.log('\nMobile Step 1: Navigating to LGU-Chat...');
    await mobilePage.goto(LGUCAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const mobileUrl = mobilePage.url();
    console.log(`  Mobile Current URL: ${mobileUrl}`);
    await takeScreenshot(mobilePage, '06-mobile-lgu-chat-login', 'LGU-Chat login page (mobile 390px)');

    await mobileContext.close();

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    results.errors.push(`Fatal error: ${error.message}`);
    if (page) {
      try {
        await takeScreenshot(page, 'error-state', 'Error state screenshot');
      } catch (e) {
        console.error('Could not take error screenshot:', e.message);
      }
    }
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Steps completed: ${results.steps.length}`);
  results.steps.forEach(s => {
    console.log(`  Step ${s.step}: [${s.status.toUpperCase()}] ${s.description}`);
  });
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log(`\nFinal URL: ${results.finalUrl}`);
  console.log(`Overall: ${results.passed ? 'PASSED' : 'FAILED (or partial)'}`);
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);

  return results;
}

runTest().catch(console.error);
