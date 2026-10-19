// Integration tests for resolvePrincipal/requireCapability/authorize (operator.ts),
// audit/redact (audit.ts) and rateLimit (rateLimit.ts). node:test, no deps.
// Runs the real migrator (scripts/db-migrate.mjs) against one disposable database
// on the local test cluster, then seeds fixture rows for each case. Never touches
// production; refuses to run unless TEST_DATABASE_URL points at localhost/127.0.0.1.
//
// Run: TEST_DATABASE_URL=postgres://postgres@localhost:55432/postgres \
//        node --import ./scripts/ts-resolve.mjs --test src/server/access.test.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { SignJWT } from 'jose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..', '..')

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required to run access.test.mjs (never runs against production).')
}
{
  const host = new URL(TEST_DATABASE_URL).hostname
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error(`TEST_DATABASE_URL must point at localhost/127.0.0.1, got host "${host}". Refusing to run.`)
  }
}

const DB_NAME = 'svos_t_access'
const SESSION_SECRET = 'test-secret-not-for-production-use-only-in-ci'

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

function runMigrator(dbName) {
  return spawnSync(process.execPath, ['scripts/db-migrate.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: urlFor(dbName) },
    encoding: 'utf8',
  })
}

// process.env must carry DATABASE_URL and SESSION_SECRET *before* importing
// @/utils/db and @/utils/session, since db.ts builds its pool at module load.
process.env.DATABASE_URL = urlFor(DB_NAME)
process.env.SESSION_SECRET = SESSION_SECRET

await recreateDb(DB_NAME)
const migrated = runMigrator(DB_NAME)
if (migrated.status !== 0) {
  throw new Error(`migrator failed: ${migrated.stdout}\n${migrated.stderr}`)
}

const { pool } = await import('@/utils/db')
const { resolvePrincipal } = await import('./operator.ts')
const { audit, redact } = await import('./audit.ts')
const { rateLimit } = await import('./rateLimit.ts')
const { withTransaction } = await import('@/utils/db')

async function signUser(payload) {
  return new SignJWT({ kind: 'user', ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(SESSION_SECRET))
}

async function signProspect(payload) {
  return new SignJWT({ kind: 'prospect', ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(SESSION_SECRET))
}

let demoOperatorId
let operatorAId
let operatorBId

before(async () => {
  const demo = await pool.query(`SELECT id FROM public.operators WHERE slug = 'demo'`)
  demoOperatorId = demo.rows[0].id

  const a = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('acc-test-a', 'Access Test A', 'pro', 'USD', 'America/Chicago') RETURNING id`
  )
  operatorAId = a.rows[0].id

  const b = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('acc-test-b', 'Access Test B', 'pro', 'USD', 'America/Chicago') RETURNING id`
  )
  operatorBId = b.rows[0].id
})

after(async () => {
  await pool.end()
  await withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`)
  })
})

async function insertUser(overrides = {}) {
  const row = {
    email: `u${Math.random().toString(36).slice(2)}@test.local`,
    status: 'active',
    platform_role: null,
    session_version: 1,
    expires_at: null,
    ...overrides,
  }
  const res = await pool.query(
    `INSERT INTO public.users (email, status, platform_role, session_version, expires_at, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5, 'Test', 'User') RETURNING id`,
    [row.email, row.status, row.platform_role, row.session_version, row.expires_at]
  )
  return res.rows[0].id
}

async function insertMembership(userId, operatorId, role = 'Admin', status = 'active') {
  await pool.query(
    `INSERT INTO public.operator_members (operator_id, profile_id, role, status) VALUES ($1, $2, $3, $4)`,
    [operatorId, userId, role, status]
  )
}

// --- resolvePrincipal: session/token validity ---

test('forged signature is rejected', async () => {
  const token = await signUser({ sub: '00000000-0000-0000-0000-000000000000', sv: 1 })
  const forged = token.slice(0, -4) + 'aaaa'
  const result = await resolvePrincipal(forged)
  assert.deepEqual(result, { denied: 'UNAUTHENTICATED' })
})

test('expired token is rejected', async () => {
  const userId = await insertUser()
  const expired = await new SignJWT({ kind: 'user', sub: userId, sv: 1 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 500)
    .sign(new TextEncoder().encode(SESSION_SECRET))
  const result = await resolvePrincipal(expired)
  assert.deepEqual(result, { denied: 'UNAUTHENTICATED' })
})

test('old-format payload (no kind) is rejected', async () => {
  const userId = await insertUser()
  const oldFormat = await new SignJWT({ userId, email: 'x@test.local', role: 'master' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(SESSION_SECRET))
  const result = await resolvePrincipal(oldFormat)
  assert.deepEqual(result, { denied: 'UNAUTHENTICATED' })
})

test('suspended user is rejected', async () => {
  const userId = await insertUser({ status: 'suspended' })
  const token = await signUser({ sub: userId, sv: 1 })
  const result = await resolvePrincipal(token)
  assert.deepEqual(result, { denied: 'UNAUTHENTICATED' })
})

test('expired demo/platform account is rejected', async () => {
  const userId = await insertUser({ platform_role: 'demo', expires_at: new Date(Date.now() - 60_000).toISOString() })
  const token = await signUser({ sub: userId, sv: 1 })
  const result = await resolvePrincipal(token)
  assert.deepEqual(result, { denied: 'UNAUTHENTICATED' })
})

test('suspended membership is refused (no fallback to demo)', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin', 'suspended')
  const token = await signUser({ sub: userId, sv: 1 })
  const result = await resolvePrincipal(token)
  assert.deepEqual(result, { denied: 'FORBIDDEN' })
})

test('op pointing at a foreign operator is refused', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin')
  const token = await signUser({ sub: userId, sv: 1, op: operatorBId })
  const result = await resolvePrincipal(token)
  assert.deepEqual(result, { denied: 'FORBIDDEN' })
})

test('two memberships without op gives SELECT_OPERATOR', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin')
  await insertMembership(userId, operatorBId, 'Manager')
  const token = await signUser({ sub: userId, sv: 1 })
  const result = await resolvePrincipal(token)
  assert.deepEqual(result, { denied: 'SELECT_OPERATOR' })
})

test('one membership resolves directly, op disambiguates when present', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Manager')
  const token = await signUser({ sub: userId, sv: 1 })
  const result = await resolvePrincipal(token)
  assert.equal(result.kind, 'user')
  assert.equal(result.operatorId, operatorAId)
  assert.equal(result.role, 'Manager')
  assert.equal(result.readOnly, false)
})

test('prospect resolves only to demo operator, read-only', async () => {
  const lead = await pool.query(
    `INSERT INTO public.leads (company, email) VALUES ('Acme', 'lead@test.local') RETURNING id`
  )
  const leadId = lead.rows[0].id
  const token = await signProspect({ sub: leadId, slug: 'acme' })
  const result = await resolvePrincipal(token)
  assert.equal(result.kind, 'prospect')
  assert.equal(result.operatorId, demoOperatorId)
  assert.equal(result.readOnly, true)
  assert.equal(result.slug, 'acme')
})

test('master without membership gets demo operator, read-only (no write caps)', async () => {
  const userId = await insertUser({ platform_role: 'master' })
  const token = await signUser({ sub: userId, sv: 1 })
  const result = await resolvePrincipal(token)
  assert.equal(result.kind, 'user')
  assert.equal(result.operatorId, demoOperatorId)
  assert.equal(result.readOnly, true)
  assert.equal(result.platformRole, 'master')
})

test('session revoked after session_version bump', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin')
  const token = await signUser({ sub: userId, sv: 1 })
  assert.equal((await resolvePrincipal(token)).kind, 'user')

  await pool.query(`UPDATE public.users SET session_version = 2 WHERE id = $1`, [userId])
  const result = await resolvePrincipal(token)
  assert.deepEqual(result, { denied: 'UNAUTHENTICATED' })
})

// --- audit ---

test('audit rollback: insert + audit, then throw leaves neither row', async () => {
  const userId = await insertUser()
  await assert.rejects(
    withTransaction(async (client) => {
      await client.query(`UPDATE public.users SET first_name = 'Changed' WHERE id = $1`, [userId])
      await audit(client, {
        operatorId: null,
        actorId: userId,
        principalKind: 'user',
        entityType: 'user',
        entityId: userId,
        action: 'test.rollback',
      })
      throw new Error('force rollback')
    })
  )

  const user = await pool.query(`SELECT first_name FROM public.users WHERE id = $1`, [userId])
  assert.equal(user.rows[0].first_name, 'Test')
  const log = await pool.query(`SELECT 1 FROM public.audit_log WHERE entity_id = $1`, [userId])
  assert.equal(log.rowCount, 0)
})

test('audit redaction: nested password/token keys stored as [redacted]', async () => {
  const userId = await insertUser()
  await withTransaction(async (client) => {
    await audit(client, {
      operatorId: null,
      actorId: userId,
      principalKind: 'user',
      entityType: 'user',
      entityId: userId,
      action: 'test.redact',
      changes: { password: 'secret123', nested: { authToken: 'abc', name: 'kept' } },
    })
  })

  const log = await pool.query(`SELECT changes FROM public.audit_log WHERE entity_id = $1 AND action = 'test.redact'`, [
    userId,
  ])
  assert.deepEqual(log.rows[0].changes, { password: '[redacted]', nested: { authToken: '[redacted]', name: 'kept' } })
})

test('redact() is pure and leaves non-secret keys untouched', () => {
  assert.deepEqual(redact({ a: 1, passwordHash: 'x', list: [{ credential: 'y' }, 2] }), {
    a: 1,
    passwordHash: '[redacted]',
    list: [{ credential: '[redacted]' }, 2],
  })
})

// --- login route: user-enumeration safety ---

test('login response is identical for unknown email and wrong password', async () => {
  const email = `enum-${Math.random().toString(36).slice(2)}@test.local`
  await pool.query(
    `INSERT INTO public.users (email, password_hash, status, session_version, first_name, last_name)
     VALUES ($1, crypt('correct-password', gen_salt('bf')), 'active', 1, 'Test', 'User')`,
    [email]
  )

  const { POST } = await import('../app/api/auth/login/route.ts')

  function loginRequest(body) {
    return new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const unknownRes = await POST(loginRequest({ email: 'nobody@test.local', password: 'whatever' }))
  const wrongRes = await POST(loginRequest({ email, password: 'wrong-password' }))

  assert.equal(unknownRes.status, wrongRes.status)
  assert.deepEqual(await unknownRes.json(), await wrongRes.json())
})

// --- rateLimit ---

test('rateLimit allows up to the limit then refuses, resets after window', async () => {
  const bucket = `test-${Math.random()}`
  const ip = '127.0.0.1'
  assert.equal(rateLimit(bucket, ip, 2, 50), true)
  assert.equal(rateLimit(bucket, ip, 2, 50), true)
  assert.equal(rateLimit(bucket, ip, 2, 50), false)

  await new Promise((r) => setTimeout(r, 60))
  assert.equal(rateLimit(bucket, ip, 2, 50), true)
})
