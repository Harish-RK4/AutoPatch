require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function applyRemainingTables() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Read 001_init.sql and remove the duplicate profiles table creation and policies
    let initSql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/001_init.sql'), 'utf-8');

    // Replace policy creations with DROP POLICY IF EXISTS before CREATE POLICY
    initSql = initSql.replace(/create policy "([^"]+)" on (\w+)/gi, (match, polName, tblName) => {
      return `DROP POLICY IF EXISTS "${polName}" ON ${tblName};\nCREATE POLICY "${polName}" ON ${tblName}`;
    });

    await client.query(initSql);
    console.log('Application tables successfully migrated!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('All public tables:', res.rows.map(r => r.table_name));

  } catch (err) {
    console.error('Error migrating remaining tables:', err);
  } finally {
    await client.end();
  }
}

applyRemainingTables();
