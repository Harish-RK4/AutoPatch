require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL...');

    // 1. Run profile creation & trigger migration
    const profileSql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261120_create_profiles.sql'), 'utf-8');
    console.log('Applying 20261120_create_profiles.sql...');
    await client.query(profileSql);
    console.log('20261120_create_profiles.sql applied successfully!');

    // 2. Run canonical app tables (001_init.sql)
    // Note: in 001_init.sql, profiles already exists now, so "create table if not exists profiles" will safely be skipped!
    const initSql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/001_init.sql'), 'utf-8');
    console.log('Applying 001_init.sql for application tables...');
    await client.query(initSql);
    console.log('001_init.sql applied successfully!');

    // Verify tables
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Public tables now exist:', res.rows.map(r => r.table_name));

    // Check trigger on auth.users
    const trig = await client.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created';
    `);
    console.log('Trigger status:', trig.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

runMigration();
