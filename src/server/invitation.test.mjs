// Integration tests for src/server/invitation.ts: issueInvitation / consumeInvitation
// are plain functions (no 'use server'), so they're called directly here. Same
// disposable-DB harness as select-operator.test.mjs. Never touches production;
// refuses to run unless TEST_DATABASE_URL points at localhost.
//
// Also covers the "keep at least one active Admin" guard from src/app/team/actions.ts's
// setMemberStatus: that function is a Server Action bound to next/headers and can't be
// called from plain node --test, so this file exercises the same SQL it runs (the
// only thing setMemberStatus adds beyond that query is cookie/session-free authorize()
// and revalidatePath(), both bare framework calls with no branching).
//
// Run: TEST_DATABASE_URL=postgres://postgres@localhost:55432/postgres \
//        node --import ./scripts/ts-resolve.mjs --test src/server/invitation.test.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..', '..')

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required to run invitation.test.mjs (never runs against production).')
}
{
  const host = new URL(TEST_DATABASE_URL).hostname
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error(`TEST_DATABASE_URL must point at localhost/127.0.0.1, got host "${host}". Refusing to run.`)
  }
}

const DB_NAME = 'svos_t_invitation'

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

await recreateDb(DB_NAME)
const migrated = runMigrator(DB_NAME)
if (migrated.status !== 0) {
  throw new Error(`migrator failed: ${migrated.stdout}\n${migrated.stderr}`)
}

const { pool } = await import('@/utils/db')
const { issueInvitation, consumeInvitation } = await import('./invitation.ts')

let operatorId

before(async () => {
  const op = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('inv-op', 'Invitation Op', 'pro', 'USD', 'America/Chicago') RETURNING id`
  )
  operatorId = op.rows[0].id
})

after(async () => {
  await pool.end()
  await withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`)
  })
})

async function insertUser(overrides = {}) {
  const row = { email: `u${Math.random().toString(36).slice(2)}@test.local`, status: 'invited', ...overrides }
  const res = await pool.query(
    `INSERT INTO public.users (email, status, first_name, last_name) VALUES ($1, $2, 'Test', 'User') RETURNING id`,
    [row.email, row.status]
  )
  return res.rows[0].id
}

async function insertMember(userId, role = 'Admin', status = 'active') {
  const res = await pool.query(
    `INSERT INTO public.operator_members (operator_id, profile_id, role, status) VALUES ($1, $2, $3, $4) RETURNING id`,
    [operatorId, userId, role, status]
  )
  return res.rows[0].id
}

test('concurrent double-consume: exactly one succeeds', async () => {
  const userId = await insertUser()
  const memberId = await insertMember(userId)
  const raw = await issueInvitation(pool, { userId, operatorId, memberId, invitedBy: null })

  const clientA = await pool.connect()
  const clientB = await pool.connect()
  try {
    const [resultA, resultB] = await Promise.all([
      consumeInvitation(clientA, raw, 'password-A-12345'),
      consumeInvitation(clientB, raw, 'password-B-12345'),
    ])
    const oks = [resultA, resultB].filter((r) => r.ok)
    assert.equal(oks.length, 1, 'exactly one of the two concurrent consumes should succeed')
  } finally {
    clientA.release()
    clientB.release()
  }
})

test('expired token is refused', async () => {
  const userId = await insertUser()
  const memberId = await insertMember(userId)
  const raw = await issueInvitation(pool, { userId, operatorId, memberId, invitedBy: null })
  await pool.query(
    `UPDATE public.invitation_tokens SET expires_at = now() - interval '1 hour' WHERE user_id = $1`,
    [userId]
  )

  const result = await consumeInvitation(pool, raw, 'password-12345')
  assert.equal(result.ok, false)
  assert.equal(result.error, 'invalid-link')
})

test('reused token is refused', async () => {
  const userId = await insertUser()
  const memberId = await insertMember(userId)
  const raw = await issueInvitation(pool, { userId, operatorId, memberId, invitedBy: null })

  const first = await consumeInvitation(pool, raw, 'password-12345')
  assert.equal(first.ok, true)

  const second = await consumeInvitation(pool, raw, 'password-12345')
  assert.equal(second.ok, false)
  assert.equal(second.error, 'invalid-link')
})

test('revoked token is refused (issuing a second invite revokes the first)', async () => {
  const userId = await insertUser()
  const memberId = await insertMember(userId)
  const firstRaw = await issueInvitation(pool, { userId, operatorId, memberId, invitedBy: null })
  await issueInvitation(pool, { userId, operatorId, memberId, invitedBy: null }) // revokes firstRaw

  const result = await consumeInvitation(pool, firstRaw, 'password-12345')
  assert.equal(result.ok, false)
  assert.equal(result.error, 'invalid-link')
})

test('successful consume: password verifies via crypt and status becomes active', async () => {
  const userId = await insertUser()
  const memberId = await insertMember(userId)
  const raw = await issueInvitation(pool, { userId, operatorId, memberId, invitedBy: null })

  const result = await consumeInvitation(pool, raw, 'correct-horse-battery')
  assert.equal(result.ok, true)

  const { rows } = await pool.query(
    `SELECT status, password_hash = crypt($2, password_hash) AS matches FROM public.users WHERE id = $1`,
    [userId, 'correct-horse-battery']
  )
  assert.equal(rows[0].status, 'active')
  assert.equal(rows[0].matches, true)
})

// Mirrors the admin-count guard in src/app/team/actions.ts's setMemberStatus, which
// can't be invoked directly here (Server Action bound to next/headers).
async function activeAdminCount(opId) {
  const { rows } = await pool.query(
    `SELECT id FROM public.operator_members WHERE operator_id = $1 AND role = 'Admin' AND status = 'active'`,
    [opId]
  )
  return rows.length
}

test('suspending the only Admin is refused', async () => {
  // Fresh operator: the shared `operatorId` accumulates Admin members from earlier
  // tests in this file, so counting against it would not reflect "only one Admin".
  const opRes = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('inv-op-solo', 'Invitation Op Solo', 'pro', 'USD', 'America/Chicago') RETURNING id`
  )
  const opId = opRes.rows[0].id
  const userId = await insertUser({ status: 'active' })
  await pool.query(
    `INSERT INTO public.operator_members (operator_id, profile_id, role, status) VALUES ($1, $2, 'Admin', 'active')`,
    [opId, userId]
  )
  assert.equal(await activeAdminCount(opId), 1, 'refuse: only one active Admin left')
})

test('suspending an Admin is allowed when another active Admin remains', async () => {
  const opRes = await pool.query(
    `INSERT INTO public.operators (slug, name, plan, currency, timezone)
     VALUES ('inv-op-2', 'Invitation Op 2', 'pro', 'USD', 'America/Chicago') RETURNING id`
  )
  const opId = opRes.rows[0].id
  const userA = await insertUser({ status: 'active' })
  const userB = await insertUser({ status: 'active' })
  await pool.query(
    `INSERT INTO public.operator_members (operator_id, profile_id, role, status) VALUES ($1, $2, 'Admin', 'active')`,
    [opId, userA]
  )
  await pool.query(
    `INSERT INTO public.operator_members (operator_id, profile_id, role, status) VALUES ($1, $2, 'Admin', 'active')`,
    [opId, userB]
  )
  assert.ok(await activeAdminCount(opId) > 1, 'allow: more than one active Admin remains')
})
