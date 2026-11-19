#!/usr/bin/env node

/**
 * Unit test for the production demo guard.
 */

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const guardScript = path.resolve(__dirname, 'production-demo-guard.js');

console.log('Testing Production Demo Guard Behavior...');

// 1. Normal development mode should exit code 0
try {
  execSync(`node "${guardScript}"`, {
    env: { ...process.env, NODE_ENV: 'development', DEMO_MODE: 'true' },
    stdio: 'pipe'
  });
  console.log('✓ Development mode with DEMO_MODE=true passes.');
} catch (err) {
  assert.fail('Development mode should pass');
}

// 2. Production mode with DEMO_MODE=true must fail (exit code 1)
let failedAsExpected = false;
try {
  execSync(`node "${guardScript}"`, {
    env: { ...process.env, NODE_ENV: 'production', DEMO_MODE: 'true' },
    stdio: 'pipe'
  });
} catch (err) {
  failedAsExpected = true;
  console.log('✓ Production mode with DEMO_MODE=true was correctly blocked!');
}

assert.strictEqual(failedAsExpected, true, 'Production build must fail if DEMO_MODE=true');
console.log('✅ All Demo Guard tests passed successfully.\n');
