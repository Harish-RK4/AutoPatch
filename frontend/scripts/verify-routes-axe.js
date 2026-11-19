#!/usr/bin/env node

/**
 * End-to-End Route Health and Accessibility (Axe) Audit
 * Validates HTTP 200 status, zero console errors, and accessibility standards across all views.
 */

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const ROUTES_TO_TEST = [
  '/',
  '/login',
  '/dashboard',
  '/projects',
  '/projects/demo-proj-001',
  '/bugs',
  '/bugs/demo-bug-001',
  '/patches',
  '/patches/demo-patch-001',
  '/history',
  '/analytics',
  '/settings'
];

async function runAudit() {
  console.log('\n================================================================');
  console.log('       AutoPatch Playwright & Axe Accessibility Verification     ');
  console.log('================================================================\n');
  console.log(`Auditing target: ${BASE_URL}\n`);

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true
    });
  } catch (err) {
    console.log('Falling back to default chromium launcher...');
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext();
  let passedCount = 0;
  let failedCount = 0;

  for (const route of ROUTES_TO_TEST) {
    const url = `${BASE_URL}${route}`;
    const page = await context.newPage();
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    process.stdout.write(`• Checking route ${route.padEnd(28)} ... `);

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = response ? response.status() : 0;

      if (status !== 200) {
        console.log(`FAILED ✗ (HTTP ${status})`);
        failedCount++;
        await page.close();
        continue;
      }

      // Run axe accessibility analysis
      const accessibilityResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('iframe')
        .analyze();

      const criticalViolations = accessibilityResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      if (consoleErrors.length > 0) {
        console.log(`WARNING ⚠ (HTTP 200, but ${consoleErrors.length} console errors)`);
        consoleErrors.forEach(e => console.log(`    Console: ${e}`));
        failedCount++;
      } else if (criticalViolations.length > 0) {
        console.log(`ACCESSIBILITY VIOLATION ✗ (${criticalViolations.length} serious/critical issues)`);
        criticalViolations.forEach(v => console.log(`    Axe: ${v.id} - ${v.description}`));
        failedCount++;
      } else {
        console.log('PASSED ✓ (HTTP 200, 0 console errors, 0 critical a11y issues)');
        passedCount++;
      }
    } catch (err) {
      console.log(`FAILED ✗ (${err.message})`);
      failedCount++;
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n================================================================');
  console.log(`Audit Summary: ${passedCount} PASSED, ${failedCount} FAILED out of ${ROUTES_TO_TEST.length} routes`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
