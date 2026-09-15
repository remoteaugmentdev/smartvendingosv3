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
    await client.connect();

    // Supabase stores JWT secrets in vault.decrypted_secrets or app config
    const result = await client.query(`
      SELECT name, decrypted_secret 
      FROM vault.decrypted_secrets 
      WHERE name IN ('anon_key', 'service_role_key', 'anon', 'service_role')
    `);

    if (result.rows.length > 0) {
      console.log('Found secrets:');
      result.rows.forEach(r => console.log(r.name, '=', r.decrypted_secret));
    } else {
      // Try alternate location
      const r2 = await client.query(`
        SELECT current_setting('app.settings.jwt_secret', true) as jwt_secret
      `);
      console.log('JWT Secret:', r2.rows[0]);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
