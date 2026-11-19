require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    SELECT id, token_type, token_hash, relates_to, created_at
    FROM auth.one_time_tokens 
    WHERE relates_to = 'test_verify_type@autopatch.dev'
    ORDER BY created_at DESC LIMIT 5;
  `);
  console.log('Tokens for test_verify_type:', res.rows);
  await client.end();
}
test();
