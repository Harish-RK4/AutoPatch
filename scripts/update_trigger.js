require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

async function updateTrigger() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
          v_full_name TEXT;
          v_avatar_url TEXT;
          v_provider TEXT;
      BEGIN
          v_full_name := COALESCE(
              NEW.raw_user_meta_data->>'full_name',
              NEW.raw_user_meta_data->>'name',
              split_part(NEW.email, '@', 1)
          );
          v_avatar_url := COALESCE(
              NEW.raw_user_meta_data->>'avatar_url',
              NEW.raw_user_meta_data->>'picture',
              ''
          );
          v_provider := COALESCE(
              NEW.raw_app_meta_data->>'provider',
              'email'
          );

          INSERT INTO public.profiles (
              id,
              email,
              full_name,
              avatar_url,
              auth_provider,
              email_verified,
              created_at,
              updated_at
          ) VALUES (
              NEW.id,
              NEW.email,
              v_full_name,
              v_avatar_url,
              v_provider,
              COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
              NOW(),
              NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              full_name = CASE 
                WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name <> '' THEN EXCLUDED.full_name 
                ELSE public.profiles.full_name 
              END,
              avatar_url = CASE 
                WHEN EXCLUDED.avatar_url IS NOT NULL AND EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url 
                ELSE public.profiles.avatar_url 
              END,
              auth_provider = COALESCE(EXCLUDED.auth_provider, public.profiles.auth_provider),
              email_verified = EXCLUDED.email_verified,
              updated_at = NOW();

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('Trigger function handle_new_user updated successfully!');
  } catch (err) {
    console.error('Trigger update error:', err);
  } finally {
    await client.end();
  }
}

updateTrigger();
