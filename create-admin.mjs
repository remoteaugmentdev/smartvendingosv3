import pg from 'pg';
import path from 'path';
import { loadEnv } from './scripts/loadEnv.mjs';
const { Client } = pg;

loadEnv(path.resolve(process.cwd(), '.env.local'));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Set it in .env.local or the environment.');
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const email = 'admin@smartvendingos.com';
    // Password comes from the caller, never a literal: this script resets the master account.
    const password = process.argv.find((a) => a.startsWith('--password='))?.slice('--password='.length) ?? process.env.ADMIN_PASSWORD;
    if (!password) {
      console.error('Missing password. Run: node create-admin.mjs --password=<value>  (or set ADMIN_PASSWORD)');
      process.exit(1);
    }

    // 1. Check if user already exists
    const check = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    
    let userId;
    
    if (check.rows.length > 0) {
      console.log('User already exists, updating password and setting to confirmed...');
      userId = check.rows[0].id;
      await client.query(`
        UPDATE auth.users 
        SET encrypted_password = crypt($1, gen_salt('bf')),
            email_confirmed_at = now(),
            role = 'authenticated'
        WHERE id = $2
      `, [password, userId]);
    } else {
      console.log('Creating new admin user in auth.users...');
      const res = await client.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf')), now(), now(), now()
        ) RETURNING id
      `, [email, password]);
      
      userId = res.rows[0].id;
    }

    console.log('Ensuring identity exists in auth.identities...');
    const identityCheck = await client.query('SELECT id FROM auth.identities WHERE user_id = $1', [userId]);
    if (identityCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id
        ) VALUES (
          gen_random_uuid(), $1, jsonb_build_object('sub', $2::text, 'email', $3::text), 'email', now(), now(), now(), $2::text
        )
      `, [userId, userId, email]);
    }

    // 2. Set the profile to admin if you have a public.profiles table
    console.log('Ensuring user profile exists and has admin role...');
    try {
      const profileCheck = await client.query('SELECT id FROM public.profiles WHERE id = $1', [userId]);
      if (profileCheck.rows.length > 0) {
        await client.query(`UPDATE public.profiles SET role = 'master' WHERE id = $1`, [userId]);
      } else {
        await client.query(`
          INSERT INTO public.profiles (id, email, first_name, last_name, role)
          VALUES ($1, $2, 'Admin', 'User', 'master')
        `, [userId, email]);
      }
      console.log('Profile updated to admin successfully.');
    } catch (err) {
      console.log('Notice: Could not update public.profiles (might not exist or different schema):', err.message);
    }

    console.log('\\n✅ SUCCESS! You can now log in with:');
    console.log('Email:    ' + email);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
