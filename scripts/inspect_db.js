require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

async function inspectSchema() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position;
    `);
    console.log('Profiles columns:', cols.rows);

    const pols = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'profiles';
    `);
    console.log('Profiles policies:', pols.rows);

    const users = await client.query(`
      SELECT id, email, created_at FROM auth.users LIMIT 5;
    `);
    console.log('Auth users count:', users.rowCount, users.rows);

    const profRows = await client.query(`
      SELECT id, email, full_name, auth_provider, email_verified FROM public.profiles LIMIT 5;
    `);
    console.log('Profiles rows count:', profRows.rowCount, profRows.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

inspectSchema();
