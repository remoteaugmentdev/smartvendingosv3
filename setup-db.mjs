import pg from 'pg';
import path from 'path';
import { loadEnv } from './scripts/loadEnv.mjs';
const { Client } = pg;

loadEnv(path.resolve(process.cwd(), '.env.local'));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL. Set it in .env.local or the environment.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function run() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // ─── 1. profiles table ─────────────────────────────────────────────
    console.log('Creating public.profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email       text,
        first_name  text,
        last_name   text,
        role        text NOT NULL DEFAULT 'demo',
        label       text,
        expires_at  timestamptz,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('  ✅ public.profiles created.');

    // ─── 2. Enable RLS on profiles ─────────────────────────────────────
    await client.query(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);

    // Allow users to read their own profile
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_self_select'
        ) THEN
          CREATE POLICY profiles_self_select ON public.profiles
            FOR SELECT USING (auth.uid() = id);
        END IF;
      END $$;
    `);

    // Allow master/admin to read all profiles
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_master_select'
        ) THEN
          CREATE POLICY profiles_master_select ON public.profiles
            FOR SELECT USING (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.role IN ('master','admin')
              )
            );
        END IF;
      END $$;
    `);

    console.log('  ✅ RLS policies created.');

    // ─── 3. Trigger: auto-insert profile on new auth user ──────────────
    console.log('Creating handle_new_user trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, role, label, expires_at)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'role', 'demo'),
          NEW.raw_user_meta_data->>'label',
          (NEW.raw_user_meta_data->>'expires_at')::timestamptz
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('  ✅ Trigger created.');

    // ─── 4. Backfill: insert profile for the existing admin user ───────
    console.log('Backfilling admin profile...');
    await client.query(`
      INSERT INTO public.profiles (id, email, role, label)
      SELECT id, email, 'master', 'Admin'
      FROM auth.users
      WHERE email = 'admin@smartvendingos.com'
      ON CONFLICT (id) DO UPDATE SET role = 'master';
    `);
    console.log('  ✅ Admin profile set to master.');

    console.log('\n🎉 Database setup complete!');
    console.log('Tables created: public.profiles');
    console.log('\nYou can now log in at your app with:');
    console.log('  Email:    admin@smartvendingos.com');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
