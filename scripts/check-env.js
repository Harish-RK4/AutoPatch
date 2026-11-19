#!/usr/bin/env node

/**
 * Environment and Credentials Verification Script
 * Validates presence, formatting, and safety of configuration without leaking secrets.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

console.log('\n================================================================');
console.log('         AutoPatch System & Environment Verification Check        ');
console.log('================================================================\n');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  No .env file found in project root.');
  console.log('   Creating .env from .env.example defaults for local P0 demo...\n');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created default .env (LLM_MODE=mock, AUTH_MODE=demo)\n');
  } else {
    console.error('❌ Missing .env.example template! Aborting.');
    process.exit(1);
  }
}

// Parse .env manually without external dependencies
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    envVars[key] = val;
  }
}

function mask(val) {
  if (!val) return '(empty)';
  if (val.length <= 6) return '***';
  return `${val.slice(0, 3)}...${val.slice(-2)}`;
}

let hasFatalError = false;

// 1. Mandatory Demo / Production Safety Check
const nodeEnv = envVars['NODE_ENV'] || process.env.NODE_ENV || 'development';
const appEnv = envVars['APP_ENV'] || process.env.APP_ENV || 'development';
const demoMode = (envVars['DEMO_MODE'] || '').toLowerCase() === 'true';
const authMode = envVars['NEXT_PUBLIC_AUTH_MODE'] || 'demo';

console.log('--- 1. Application Runtime Mode ---');
console.log(`• Environment:        ${nodeEnv} / ${appEnv}`);
console.log(`• Auth Provider Mode: ${authMode}`);
console.log(`• Demo Mode Flag:     ${demoMode ? 'ENABLED (demo seed active)' : 'DISABLED'}`);

if ((nodeEnv === 'production' || appEnv === 'production') && demoMode) {
  console.error('\n🚨 FATAL VIOLATION: DEMO_MODE=true is strictly forbidden in production!');
  console.error('   Production builds must fail if demo mode is enabled.\n');
  hasFatalError = true;
} else {
  console.log('✅ Demo isolation guard: OK');
}

// 2. LLM Provider Status
const llmMode = envVars['LLM_MODE'] || 'mock';
console.log('\n--- 2. LLM Engine & Routing ---');
console.log(`• LLM Mode:           ${llmMode.toUpperCase()}`);

const freeProviders = [
  { name: 'Google Gemini', key: 'GEMINI_API_KEY', model: envVars['GEMINI_MODEL'] || 'gemini-1.5-flash' },
  { name: 'Groq', key: 'GROQ_API_KEY', model: envVars['GROQ_MODEL'] || 'llama-3.1-70b-versatile' },
  { name: 'OpenRouter Free', key: 'OPENROUTER_API_KEY', model: envVars['OPENROUTER_MODEL'] || 'free-tier' },
  { name: 'Mistral Codestral', key: 'MISTRAL_API_KEY', model: envVars['MISTRAL_CODE_MODEL'] || 'codestral' },
  { name: 'Local Ollama', key: 'OLLAMA_BASE_URL', model: envVars['OLLAMA_MODEL'] || 'qwen2.5-coder:7b' }
];

let configuredCount = 0;
for (const p of freeProviders) {
  const val = envVars[p.key];
  if (val && val.length > 0) {
    configuredCount++;
    console.log(`  ✓ ${p.name.padEnd(18)} : Configured (${mask(val)}) [Model: ${p.model}]`);
  } else {
    console.log(`  - ${p.name.padEnd(18)} : Not configured`);
  }
}

if (llmMode === 'mock') {
  console.log('\n✅ Mock Provider Active: Deterministic offline fixtures (0 keys / 0 cost).');
} else if (llmMode === 'free' && configuredCount === 0) {
  console.error('\n🚨 LLM_MODE=free requires at least ONE configured provider (e.g. GEMINI_API_KEY or GROQ_API_KEY).');
  hasFatalError = true;
} else if (llmMode === 'private' && !envVars['OLLAMA_BASE_URL']) {
  console.error('\n🚨 LLM_MODE=private requires OLLAMA_BASE_URL to be defined.');
  hasFatalError = true;
}

// 3. Infrastructure
console.log('\n--- 3. Infrastructure & Services ---');
const redisUrl = envVars['REDIS_URL'] || 'redis://localhost:6379/0';
console.log(`• Redis URL:          ${redisUrl} (P0 has in-memory fallback if daemon absent)`);
console.log(`• Backend Host/Port:  ${envVars['BACKEND_HOST'] || '127.0.0.1'}:${envVars['BACKEND_PORT'] || '8000'}`);
console.log(`• Frontend Port:      ${envVars['FRONTEND_PORT'] || '3000'}`);

console.log('\n================================================================');
if (hasFatalError) {
  console.error('❌ System configuration verification FAILED. See errors above.\n');
  process.exit(1);
} else {
  console.log('✅ System configuration verification PASSED for Phase P0.\n');
  process.exit(0);
}
