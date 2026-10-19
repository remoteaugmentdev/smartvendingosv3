// Integration tests for db/008_identity.sql and db/009_data_api_lockdown.sql.
// node:test, no deps. Runs the real migrator (scripts/db-migrate.mjs) as a child
// process against disposable databases on the local test cluster, never against
// production. Refuses to run unless TEST_DATABASE_URL points at localhost/127.0.0.1.
//
// Run: TEST_DATABASE_URL=postgres://postgres@localhost:55432/postgres node --test db/identity.test.mjs
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required to run db/identity.test.mjs (never runs against production).')
}
{
  const host = new URL(TEST_DATABASE_URL).hostname
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error(`TEST_DATABASE_URL must point at localhost/127.0.0.1, got host "${host}". Refusing to run.`)
  }
}

const DB_EMPTY = 'svos_t_empty'
const DB_UPGRADE = 'svos_t_upgrade'
const DB_DUPE = 'svos_t_dupe'

function urlFor(dbName) {
  const u = new URL(TEST_DATABASE_URL)
  u.pathname = `/${dbName}`
  return u.toString()
}

async function withAdmin(fn) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

async function recreateDb(name) {
  await withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    await client.query(`CREATE DATABASE ${name}`)
  })
}

async function withDb(name, fn) {
  const client = new pg.Client({ connectionString: urlFor(name) })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

function runMigrator(dbName) {
  return spawnSync(process.execPath, ['scripts/db-migrate.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: urlFor(dbName) },
    encoding: 'utf8',
  })
}

async function assertMigrationsRecorded(dbName, filenames) {
  await withDb(dbName, async (client) => {
    const res = await client.query('SELECT filename FROM public.schema_migrations')
    const got = new Set(res.rows.map((r) => r.filename))
    for (const f of filenames) {
      assert.ok(got.has(f), `expected ${f} recorded in schema_migrations, got: ${[...got].join(', ')}`)
    }
  })
}

// ponytail: read the actual db/*.sql filenames instead of hardcoding them, so
// this test doesn't drift when a migration file is added or renamed.
const MIGRATION_FILES = (await import('node:fs')).readdirSync(path.join(repoRoot, 'db'))
  .filter((f) => f.endsWith('.sql'))
  .sort()

const AUTH_SCHEMA_DDL = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email               text,
    encrypted_password  text,
    email_confirmed_at  timestamptz,
    raw_user_meta_data  jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
  );
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
    SELECT NULL::uuid
  $$ LANGUAGE sql STABLE;
`

const PROFILES_DDL = `
  CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'demo' CHECK (role IN ('master','demo')),
    first_name  text,
    last_name   text,
    label       text,
    expires_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
  CREATE POLICY profiles_self_select ON public.profiles FOR SELECT USING (id = auth.uid());
  DROP POLICY IF EXISTS profiles_master_select ON public.profiles;
  CREATE POLICY profiles_master_select ON public.profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master')
  );
`

// 007_seed_demo.sql itself inserts the 6 operator_members rows keyed by
// md5('demo-team-member:' || email), so the test does not need to seed them;
// running the full migrator (001..009) is enough to produce them.

// Empty install MUST run first: it asserts nothing exists yet, and
// anon/authenticated roles are cluster-wide, so a later test creating them
// would contaminate this one if order were reversed.
test('empty install: fresh PostgreSQL with no auth schema', async () => {
  await recreateDb(DB_EMPTY)

  const result = runMigrator(DB_EMPTY)
  assert.equal(result.status, 0, `migrator failed: ${result.stdout}\n${result.stderr}`)

  await assertMigrationsRecorded(DB_EMPTY, MIGRATION_FILES)

  await withDb(DB_EMPTY, async (client) => {
    for (const table of ['public.users', 'public.invitation_tokens', 'public.audit_log', 'public.leads']) {
      const res = await client.query('SELECT to_regclass($1) AS reg', [table])
      assert.ok(res.rows[0].reg, `expected ${table} to exist`)
    }

    const crypted = await client.query(`SELECT crypt('x', gen_salt('bf')) AS h`)
    assert.ok(crypted.rows[0].h, 'pgcrypto crypt() should work')

    const placeholders = await client.query(`
      SELECT u.status, u.password_hash
      FROM public.operator_members om
      JOIN public.users u ON u.id = om.profile_id
    `)
    assert.equal(placeholders.rows.length, 6)
    for (const row of placeholders.rows) {
      assert.equal(row.status, 'invited')
      assert.equal(row.password_hash, null)
    }

    const fk = await client.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'operator_members_profile_id_fkey'`
    )
    assert.equal(fk.rowCount, 1)
  })

  const rerun = runMigrator(DB_EMPTY)
  assert.equal(rerun.status, 0, `re-run failed: ${rerun.stdout}\n${rerun.stderr}`)
  for (const f of MIGRATION_FILES) {
    assert.match(rerun.stdout, new RegExp(`skip\\s+${f}`), `expected ${f} to be skipped on re-run`)
  }
})

test('populated upgrade: Supabase-like auth.users/profiles, anon/authenticated roles', async () => {
  await recreateDb(DB_UPGRADE)

  const masterId = '11111111-1111-1111-1111-111111111111'
  const demoId = '22222222-2222-2222-2222-222222222222'
  const unconfirmedId = '33333333-3333-3333-3333-333333333333'
  const mixedCaseId = '44444444-4444-4444-4444-444444444444'

  await withDb(DB_UPGRADE, async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END $$;
    `)
    await client.query('GRANT ALL ON SCHEMA public TO anon, authenticated')
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated')

    await client.query(AUTH_SCHEMA_DDL)
    await client.query(PROFILES_DDL)

    await client.query(
      `INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
        ($1, 'master@example.com', crypt('pw1', gen_salt('bf')), now()),
        ($2, 'demo@example.com', crypt('pw2', gen_salt('bf')), now()),
        ($3, 'unconfirmed@example.com', crypt('pw3', gen_salt('bf')), NULL),
        ($4, '  MixedCase@Example.COM ', crypt('pw4', gen_salt('bf')), now())`,
      [masterId, demoId, unconfirmedId, mixedCaseId]
    )
    await client.query(
      `INSERT INTO public.profiles (id, role, label) VALUES ($1, 'master', 'Admin')`,
      [masterId]
    )
    await client.query(
      `INSERT INTO public.profiles (id, role, label, expires_at) VALUES ($1, 'demo', 'Trial', now() + interval '30 days')`,
      [demoId]
    )

    // pre-create leads the old way (mirrors src/utils/leadsSchema.ts) with 2 rows
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name text, email text, company text NOT NULL,
        fleet_size text, pain_point text, current_solution text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS slug text;
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_message text;
    `)
    await client.query(
      `INSERT INTO public.leads (company, email) VALUES ('Prospect Co', 'a@b.com'), ('Joe LLC', 'c@d.com')`
    )
  })

  const result = runMigrator(DB_UPGRADE)
  assert.equal(result.status, 0, `migrator failed: ${result.stdout}\n${result.stderr}`)

  await withDb(DB_UPGRADE, async (client) => {
    const master = await client.query('SELECT * FROM public.users WHERE id = $1', [masterId])
    assert.equal(master.rowCount, 1)
    assert.equal(master.rows[0].platform_role, 'master')
    const check = await client.query(
      `SELECT crypt('pw1', password_hash) = password_hash AS ok FROM public.users WHERE id = $1`,
      [masterId]
    )
    assert.equal(check.rows[0].ok, true)

    const demo = await client.query('SELECT * FROM public.users WHERE id = $1', [demoId])
    assert.equal(demo.rows[0].platform_role, 'demo')
    assert.equal(demo.rows[0].label, 'Trial')
    assert.ok(demo.rows[0].expires_at)

    const unconfirmed = await client.query('SELECT * FROM public.users WHERE id = $1', [unconfirmedId])
    assert.equal(unconfirmed.rows[0].status, 'invited')
    assert.equal(unconfirmed.rows[0].platform_role, 'demo') // missing profile -> demo

    const mixed = await client.query('SELECT * FROM public.users WHERE id = $1', [mixedCaseId])
    assert.equal(mixed.rows[0].email, 'mixedcase@example.com')

    const leads = await client.query('SELECT company FROM public.leads ORDER BY company')
    assert.deepEqual(leads.rows.map((r) => r.company), ['Joe LLC', 'Prospect Co'])

    const placeholders = await client.query(`
      SELECT u.status, u.password_hash
      FROM public.operator_members om
      JOIN public.users u ON u.id = om.profile_id
      WHERE u.id NOT IN ($1, $2, $3, $4)
    `, [masterId, demoId, unconfirmedId, mixedCaseId])
    assert.equal(placeholders.rows.length, 6)
    for (const row of placeholders.rows) {
      assert.equal(row.status, 'invited')
      assert.equal(row.password_hash, null)
    }

    const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
    for (const { tablename } of tables.rows) {
      const sel = await client.query(`SELECT has_table_privilege('anon', $1, 'SELECT') AS ok`, [`public.${tablename}`])
      assert.equal(sel.rows[0].ok, false, `anon should not have SELECT on ${tablename}`)
      const ins = await client.query(`SELECT has_table_privilege('anon', $1, 'INSERT') AS ok`, [`public.${tablename}`])
      assert.equal(ins.rows[0].ok, false, `anon should not have INSERT on ${tablename}`)

      const rls = await client.query(
        `SELECT relrowsecurity FROM pg_class WHERE oid = $1::regclass`,
        [`public.${tablename}`]
      )
      assert.equal(rls.rows[0].relrowsecurity, true, `expected RLS enabled on ${tablename}`)
    }

    const policies = await client.query(`SELECT 1 FROM pg_policies WHERE tablename = 'profiles'`)
    assert.equal(policies.rowCount, 0)
  })
})

test('duplicate emails abort the migration and roll back', async () => {
  await recreateDb(DB_DUPE)

  await withDb(DB_DUPE, async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    await client.query(AUTH_SCHEMA_DDL)
    await client.query(
      `INSERT INTO auth.users (email, encrypted_password, email_confirmed_at) VALUES
        ('Dup@x.com', crypt('a', gen_salt('bf')), now()),
        (' dup@x.com', crypt('b', gen_salt('bf')), now())`
    )
  })

  const result = runMigrator(DB_DUPE)
  assert.notEqual(result.status, 0, 'migrator should exit non-zero on duplicate emails')
  assert.match(result.stdout + result.stderr, /duplicate/i)

  await withDb(DB_DUPE, async (client) => {
    const reg = await client.query(`SELECT to_regclass('public.users') AS reg`)
    assert.equal(reg.rows[0].reg, null)
    const migrations = await client.query(
      `SELECT 1 FROM public.schema_migrations WHERE filename = '008_identity.sql'`
    )
    assert.equal(migrations.rowCount, 0)
  })
})

after(async () => {
  for (const name of [DB_EMPTY, DB_UPGRADE, DB_DUPE]) {
    await withAdmin(async (client) => {
      await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    })
  }
  try {
    await withAdmin(async (client) => {
      await client.query('DROP ROLE IF EXISTS anon')
      await client.query('DROP ROLE IF EXISTS authenticated')
    })
  } catch {
    // ponytail: role may still be referenced by another database's default
    // privileges; not fatal to test cleanup, cluster gets reused across runs.
  }
})
