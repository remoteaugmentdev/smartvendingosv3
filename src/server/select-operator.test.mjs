// Integration tests for the /select-operator flow: resolvePrincipal's op
// disambiguation across multiple memberships, and the selectOperator Server
// Action's own re-check (src/app/select-operator/actions.ts). Same harness as
// access.test.mjs (node:test, disposable DB, real migrator). Never touches
// production; refuses to run unless TEST_DATABASE_URL points at localhost.
//
// Run: TEST_DATABASE_URL=postgres://postgres@localhost:55432/postgres \
//        node --import ./scripts/ts-resolve.mjs --test src/server/select-operator.test.mjs
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
  throw new Error('TEST_DATABASE_URL is required to run select-operator.test.mjs (never runs against production).')
}
{
  const host = new URL(TEST_DATABASE_URL).hostname
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error(`TEST_DATABASE_URL must point at localhost/127.0.0.1, got host "${host}". Refusing to run.`)
  }
}

const DB_NAME = 'svos_t_select_operator'
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

process.env.DATABASE_URL = urlFor(DB_NAME)
process.env.SESSION_SECRET = SESSION_SECRET

await recreateDb(DB_NAME)
const migrated = runMigrator(DB_NAME)
if (migrated.status !== 0) {
  throw new Error(`migrator failed: ${migrated.stdout}\n${migrated.stderr}`)
}

const { pool } = await import('@/utils/db')
const { resolvePrincipal } = await import('./operator.ts')

async function signUser(payload) {
  return new SignJWT({ kind: 'user', ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(SESSION_SECRET))
}

let operatorAId
let operatorBId

before(async () => {
  const a = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('sel-op-a', 'Select Op A', 'pro', 'USD', 'America/Chicago') RETURNING id`
  )
  operatorAId = a.rows[0].id

  const b = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('sel-op-b', 'Select Op B', 'pro', 'USD', 'America/Chicago') RETURNING id`
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
    session_version: 1,
    ...overrides,
  }
  const res = await pool.query(
    `INSERT INTO public.users (email, status, session_version, first_name, last_name)
     VALUES ($1, $2, $3, 'Test', 'User') RETURNING id`,
    [row.email, row.status, row.session_version]
  )
  return res.rows[0].id
}

async function insertMembership(userId, operatorId, role = 'Admin', status = 'active') {
  await pool.query(
    `INSERT INTO public.operator_members (operator_id, profile_id, role, status) VALUES ($1, $2, $3, $4)`,
    [operatorId, userId, role, status]
  )
}

// resolvePrincipal's SELECT_OPERATOR / no-op case and the foreign-op / suspended-
// membership FORBIDDEN cases are already covered by access.test.mjs. What's not
// covered there: a user with two active memberships, op disambiguates to EACH one.
test('op for each of two active memberships resolves to that operator', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin')
  await insertMembership(userId, operatorBId, 'Manager')

  const tokenA = await signUser({ sub: userId, sv: 1, op: operatorAId })
  const resultA = await resolvePrincipal(tokenA)
  assert.equal(resultA.kind, 'user')
  assert.equal(resultA.operatorId, operatorAId)
  assert.equal(resultA.role, 'Admin')

  const tokenB = await signUser({ sub: userId, sv: 1, op: operatorBId })
  const resultB = await resolvePrincipal(tokenB)
  assert.equal(resultB.kind, 'user')
  assert.equal(resultB.operatorId, operatorBId)
  assert.equal(resultB.role, 'Manager')
})

// selectOperator (src/app/select-operator/actions.ts) re-checks membership with
// this exact query before re-signing the cookie; it can't be called directly here
// since it's a Server Action bound to next/headers' request-scoped cookies()/
// redirect(), which only exist inside the Next.js server runtime, not plain
// node --test. Testing the query directly covers the actual authorization
// decision (the only thing selectOperator adds beyond that query is cookie
// re-signing and redirect(), both bare framework calls with no branching).
async function activeMembership(userId, operatorId) {
  const { rows } = await pool.query(
    `SELECT om.operator_id AS id
     FROM public.operator_members om
     WHERE om.profile_id = $1 AND om.operator_id = $2 AND om.status = 'active'`,
    [userId, operatorId]
  )
  return rows[0]
}

test('selectOperator re-check: active membership passes', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin', 'active')
  assert.ok(await activeMembership(userId, operatorAId))
})

test('selectOperator re-check: operator the user is not a member of fails', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin', 'active')
  assert.equal(await activeMembership(userId, operatorBId), undefined)
})

test('selectOperator re-check: suspended membership fails', async () => {
  const userId = await insertUser()
  await insertMembership(userId, operatorAId, 'Admin', 'suspended')
  assert.equal(await activeMembership(userId, operatorAId), undefined)
})
