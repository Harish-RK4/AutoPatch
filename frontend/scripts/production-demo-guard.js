#!/usr/bin/env node

/**
 * Production Demo Isolation Guard
 * 1. Checks that DEMO_MODE is not true under production builds.
 * 2. Scans production source files (outside src/demo) to ensure ZERO imports from /demo exist.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const demoDir = path.resolve(srcDir, 'demo');

console.log('\n--- Running Production Demo Isolation Guard ---');

// Check environment variables
const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
const demoMode = (process.env.DEMO_MODE || '').toLowerCase() === 'true';

if (isProduction && demoMode) {
  console.error('\n🚨 FATAL ERROR: DEMO_MODE=true is strictly forbidden in production builds!');
  process.exit(1);
}

// Function to recursively scan directories for forbidden demo imports
let violations = [];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Do not scan the demo directory itself
      if (fullPath === demoDir) continue;
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Look for import statements referencing /demo
      const forbiddenPattern = /from\s+['"][^'"]*\/demo(\/|['"])/g;
      const relativeDemoPattern = /from\s+['"]\.\.?\/.*demo['"]/g;
      
      if (forbiddenPattern.test(content) || relativeDemoPattern.test(content)) {
        violations.push(fullPath);
      }
    }
  }
}

scanDirectory(srcDir);

if (violations.length > 0) {
  console.error('\n🚨 FATAL ERROR: Found forbidden imports from /demo in production code:');
  violations.forEach(v => console.error(`  - ${v}`));
  console.error('All demo functionality must remain strictly isolated inside src/demo.\n');
  process.exit(1);
}

console.log('✅ Demo isolation guard passed: Zero forbidden /demo imports in production paths.\n');
process.exit(0);
