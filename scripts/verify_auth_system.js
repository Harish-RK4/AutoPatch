require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
/**
 * Comprehensive Verification Suite for Supabase Authentication
 * Tests:
 * 1. Database Profiles Table & RLS
 * 2. Real Supabase Auth Registration
 * 3. Automatic Profile Creation via Trigger
 * 4. Supabase Email & Password Sign-In & Wrong Password Rejection
 * 5. Row Level Security with Authenticated JWT
 * 6. Supabase Email OTP Generation & Verification
 * 7. Supabase Password Reset Flow
 * 8. Google OAuth Provider Configuration
 */

const { createClient } = require('@supabase/supabase-js');
const { Client: PgClient } = require('pg');

const SUPABASE_URL = 'https://qqgwmkqfdoayiblculhf.supabase.co';
const ANON_KEY = 'sb_publishable_GhU7u75Vua_I4FyE8DuW3Q_tkjuVm01';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.DATABASE_URL;

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE SUPABASE AUTH TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- TEST 1: Database Profiles Table & RLS ---
  console.log('--- TEST 1: Database Profiles Table & RLS Policies ---');
  const pg = new PgClient({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const colsRes = await pg.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles'
    ORDER BY ordinal_position;
  `);
  const cols = colsRes.rows.map(r => r.column_name);
  assert(cols.includes('id'), 'profiles has id column');
  assert(cols.includes('email'), 'profiles has email column');
  assert(cols.includes('full_name'), 'profiles has full_name column');
  assert(cols.includes('avatar_url'), 'profiles has avatar_url column');
  assert(cols.includes('auth_provider'), 'profiles has auth_provider column');
  assert(cols.includes('email_verified'), 'profiles has email_verified column');
  assert(cols.includes('created_at'), 'profiles has created_at column');
  assert(cols.includes('updated_at'), 'profiles has updated_at column');

  // Check RLS is enabled
  const rlsRes = await pg.query(`
    SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles';
  `);
  assert(rlsRes.rows[0]?.relrowsecurity === true, 'Row Level Security is enabled on profiles');

  // Check RLS policies
  const polRes = await pg.query(`
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
  `);
  const policyNames = polRes.rows.map(r => r.policyname);
  assert(policyNames.includes('Users can view own profile'), 'Policy: Users can view own profile exists');
  assert(policyNames.includes('Users can update own profile'), 'Policy: Users can update own profile exists');
  assert(policyNames.includes('Service role full access'), 'Policy: Service role full access exists');

  // Check trigger exists on auth.users
  const trigRes = await pg.query(`
    SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
  `);
  assert(trigRes.rows.length >= 2, 'Trigger on_auth_user_created exists on auth.users (INSERT & UPDATE)');

  // --- TEST 2: Real Supabase User Creation ---
  console.log('\n--- TEST 2: Real Supabase Auth Registration ---');
  const testId = Date.now();
  const testEmail = `test_user_${testId}@example.com`;
  const testPassword = 'StrongPassword2026!';
  const testName = 'Verified Tester';

  // Create user via Admin API with email_confirm = true
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: testName,
      role: 'developer'
    }
  });

  assert(!createError && createData.user?.id, `User created in Supabase Auth (${testEmail})`);
  const userId = createData.user?.id;

  // --- TEST 3: Profiles Trigger Verification ---
  console.log('\n--- TEST 3: Automatic Profile Creation via Trigger ---');
  await new Promise(r => setTimeout(r, 600));
  const profQuery = await pg.query('SELECT * FROM public.profiles WHERE id = $1', [userId]);
  assert(profQuery.rows.length === 1, 'Profile row was automatically created by trigger in public.profiles');
  assert(profQuery.rows[0]?.email === testEmail, `Profile email matches (${profQuery.rows[0]?.email})`);
  assert(profQuery.rows[0]?.full_name === testName, `Profile full_name matches (${profQuery.rows[0]?.full_name})`);

  // --- TEST 4: Supabase Email/Password Login ---
  console.log('\n--- TEST 4: Supabase Email & Password Sign-In ---');
  // 4a. Wrong password rejection
  const { data: wrongData, error: wrongError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: 'IncorrectPassword999!',
  });
  assert(wrongError !== null && !wrongData.session, 'Incorrect password correctly rejected by Supabase Auth');

  // 4b. Valid password sign-in
  const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  assert(!loginError && loginData.session?.access_token, 'Valid password sign-in returns JWT session');
  const userToken = loginData.session?.access_token;

  // --- TEST 5: RLS Verification with User Token ---
  console.log('\n--- TEST 5: Row Level Security User Token Access ---');
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });
  const { data: ownProfile, error: ownError } = await userClient.from('profiles').select('*').eq('id', userId).single();
  assert(!ownError && ownProfile?.id === userId, 'Authenticated user can read their own profile via RLS');

  const { data: otherProfile } = await userClient.from('profiles').select('*').neq('id', userId).limit(1);
  assert(!otherProfile || otherProfile.length === 0, 'Authenticated user cannot read other profiles via RLS');

  // --- TEST 6: Supabase Real Email OTP Generation & Verification ---
  console.log('\n--- TEST 6: Supabase Email OTP Generation & Verification ---');
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: testEmail,
  });
  assert(!linkError && linkData.properties?.email_otp, `Genuine Supabase OTP token generated: ${linkData.properties?.email_otp}`);
  const otpCode = linkData.properties?.email_otp;

  const { data: otpVerifyData, error: otpVerifyError } = await anonClient.auth.verifyOtp({
    email: testEmail,
    token: otpCode,
    type: 'magiclink',
  });
  assert(!otpVerifyError && otpVerifyData.session?.access_token, 'Supabase successfully verified OTP code and issued session');

  // --- TEST 7: Supabase Password Reset Flow ---
  console.log('\n--- TEST 7: Supabase Password Reset Flow ---');
  const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: testEmail,
  });
  assert(!recoveryError && recoveryData.properties?.email_otp, `Supabase recovery token generated: ${recoveryData.properties?.email_otp}`);
  const recoveryOtp = recoveryData.properties?.email_otp;

  const recoveryClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: recoveryVerifyData, error: recoveryVerifyError } = await recoveryClient.auth.verifyOtp({
    email: testEmail,
    token: recoveryOtp,
    type: 'recovery',
  });
  assert(!recoveryVerifyError && recoveryVerifyData.session?.access_token, 'Recovery token verified successfully');

  await recoveryClient.auth.setSession(recoveryVerifyData.session);
  const newPassword = 'BrandNewPassword2026!';
  const { error: updateError } = await recoveryClient.auth.updateUser({ password: newPassword });
  assert(!updateError, 'Password successfully updated via Supabase updateUser');

  // Verify sign-in with the new password
  const { data: newLoginData, error: newLoginError } = await anonClient.auth.signInWithPassword({
    email: testEmail,
    password: newPassword,
  });
  assert(!newLoginError && newLoginData.session?.access_token, 'Sign-in with new password succeeded');

  // --- TEST 8: Google OAuth Configuration ---
  console.log('\n--- TEST 8: Google OAuth Provider Configuration ---');
  const { data: oauthData, error: oauthError } = await anonClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  });
  assert(!oauthError && oauthData?.url, 'Google OAuth URL generated successfully');
  assert(
    oauthData?.url?.includes('/auth/v1/authorize?provider=google'),
    'Google OAuth URL correctly targets Supabase OAuth authorization gateway'
  );

  // Clean up test user
  await adminClient.auth.admin.deleteUser(userId);
  await pg.end();

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Test suite uncaught error:', e);
  process.exit(1);
});
