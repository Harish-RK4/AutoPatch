#!/usr/bin/env node

/**
 * Capture high-fidelity verification screenshots for Phase P0 Gate
 * - docs/evidence/p0-dashboard-desktop.png (1440x900 light)
 * - docs/evidence/p0-dashboard-dark.png (1440x900 dark)
 * - docs/evidence/p0-dashboard-mobile.png (375x667 mobile)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../docs/evidence');

async function capture() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (err) {
    browser = await chromium.launch({ headless: true });
  }

  console.log(`Connecting to ${BASE_URL}...`);

  // 1. Desktop Light Mode (1440x900)
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await desktopCtx.newPage();

  // Navigate to login to pre-seed session
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const demoUser = {
      id: "demo-user-001",
      email: "demo@autopatch.dev",
      fullName: "Harish RK",
      name: "Harish RK",
      role: "developer",
      isDemo: true
    };
    localStorage.setItem("autopatch_session", JSON.stringify(demoUser));
    document.cookie = "autopatch_session=active; path=/; max-age=86400; SameSite=Lax";
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
  });

  console.log('Capturing Desktop 1440x900 Light...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const desktopPath = path.join(OUT_DIR, 'p0-dashboard-desktop.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log(`Saved: ${desktopPath}`);

  // 2. Desktop Dark Mode (1440x900)
  console.log('Capturing Desktop 1440x900 Dark...');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await page.waitForTimeout(800);

  const darkPath = path.join(OUT_DIR, 'p0-dashboard-dark.png');
  await page.screenshot({ path: darkPath, fullPage: false });
  console.log(`Saved: ${darkPath}`);

  await desktopCtx.close();

  // 3. Mobile View (375x667)
  console.log('Capturing Mobile 375x667...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobileCtx.newPage();

  await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(() => {
    const demoUser = {
      id: "demo-user-001",
      email: "demo@autopatch.dev",
      fullName: "Harish RK",
      name: "Harish RK",
      role: "developer",
      isDemo: true
    };
    localStorage.setItem("autopatch_session", JSON.stringify(demoUser));
    document.cookie = "autopatch_session=active; path=/; max-age=86400; SameSite=Lax";
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  });

  await mobilePage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  const mobilePath = path.join(OUT_DIR, 'p0-dashboard-mobile.png');
  await mobilePage.screenshot({ path: mobilePath, fullPage: false });
  console.log(`Saved: ${mobilePath}`);

  await mobileCtx.close();
  await browser.close();

  console.log('✅ All screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
