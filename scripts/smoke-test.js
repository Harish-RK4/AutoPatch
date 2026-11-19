#!/usr/bin/env node

/**
 * AutoPatch End-to-End System Smoke Test
 * Exercises all core subsystems from environment configuration to backend & frontend checks.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

console.log('\n================================================================');
console.log('            AutoPatch Full System Smoke Test Suite              ');
console.log('================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

function runStep(name, cmd, cwd = rootDir) {
  process.stdout.write(`• ${name.padEnd(45)} ... `);
  try {
    execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, LLM_MODE: 'mock', DEMO_MODE: 'true' } });
    console.log('PASSED ✓');
    totalPassed++;
  } catch (err) {
    console.log('FAILED ✗');
    console.error(`\nCommand: ${cmd}`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    totalFailed++;
  }
}

// 1. Environment & Credentials Verification
runStep('1. Environment Configuration Check', 'node scripts/check-env.js');

// 2. Production Demo Guard Integrity Test
runStep('2. Frontend Demo Isolation Guard Test', 'node scripts/test-demo-guard.js', path.join(rootDir, 'frontend'));

// 3. Backend Pytest Suite
runStep('3. Backend Pytest Suite (All 16 Tests)', '.\\.venv\\Scripts\\pytest -v', path.join(rootDir, 'backend'));

// 4. Source Code Sanitization Audit (Zero forbidden secrets/stubs)
process.stdout.write(`• ${'4. Source Code Secrets & Stubs Audit'.padEnd(45)} ... `);
try {
  const forbidden = ['TODO: implement', 'FIXME: implement', 'lorem ipsum', 'sk-proj-fakekey'];
  let found = 0;
  
  function scan(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (['node_modules', '.venv', '.git', '.next'].includes(f)) continue;
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) scan(full);
      else if (f.endsWith('.py') || f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
        const text = fs.readFileSync(full, 'utf8');
        for (const word of forbidden) {
          if (text.toLowerCase().includes(word.toLowerCase())) found++;
        }
      }
    }
  }
  
  scan(path.join(rootDir, 'backend', 'app'));
  scan(path.join(rootDir, 'frontend', 'src'));
  
  if (found === 0) {
    console.log('PASSED ✓ (Zero forbidden strings found)');
    totalPassed++;
  } else {
    console.log(`FAILED ✗ (${found} forbidden strings found)`);
    totalFailed++;
  }
} catch (err) {
  console.log('FAILED ✗');
  totalFailed++;
}

console.log('\n================================================================');
console.log(`Smoke Test Summary: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
