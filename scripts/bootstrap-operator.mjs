// One-shot operator bootstrap: creates an operator, its first Admin user (existing
// or new), and an invitation link, all in one transaction. Mirrors db-migrate.mjs
// for env loading / pg usage since standalone scripts don't import src/ (no bundler
// here). ponytail: duplicates invitation.ts's token hash + expiry (a few lines) per
// spec, rather than trying to import TS app code from a plain .mjs script.
//
// Usage:
//   node scripts/bootstrap-operator.mjs --name "Acme Vending" --slug acme \
//     --email owner@acme.example [--first Jane] [--last Doe] \
//     [--currency USD] [--timezone America/Chicago]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import pg from 'pg'

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotenv(path.join(process.cwd(), '.env.local'))

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set. Aborting.')
  process.exit(1)
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      console.error(`Missing value for --${key}`)
      process.exit(1)
    }
    out[key] = value
    i++
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const { name, slug, email, first = null, last = null, currency, timezone } = args

if (!name || !slug || !email) {
  console.error('Usage: node scripts/bootstrap-operator.mjs --name <name> --slug <slug> --email <email> [--first <first>] [--last <last>] [--currency <currency>] [--timezone <timezone>]')
  process.exit(1)
}
if ('password' in args) {
  console.error('This script never accepts a password. The invited user sets one via the printed setup-password link.')
  process.exit(1)
}

const normalizedEmail = email.toLowerCase().trim()

// ponytail: same host-based TLS rule as src/utils/db.ts / db-migrate.mjs.
function isLocalHost(connectionString) {
  if (!connectionString) return false
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(connectionString).hostname)
  } catch {
    return false
  }
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: isLocalHost(DATABASE_URL) ? false : { rejectUnauthorized: false },
  max: 5,
})

// ponytail: duplicated from src/server/invitation.ts (standalone script, no import).
const TOKEN_BYTES = 32
const EXPIRY_HOURS = 48
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function main() {
  const client = await pool.connect()
  let operatorId, userId, rawToken
  try {
    await client.query('BEGIN')

    // ponytail: literal fallbacks duplicate db/001_core.sql's column defaults;
    // COALESCE can't reference a column DEFAULT as an expression.
    const opRes = await client.query(
      `INSERT INTO public.operators (slug, name, currency, timezone)
       VALUES ($1, $2, COALESCE($3, 'USD'), COALESCE($4, 'America/Chicago'))
       RETURNING id`,
      [slug, name, currency ?? null, timezone ?? null]
    )
    operatorId = opRes.rows[0].id

    const existing = await client.query(
      `SELECT id, status FROM public.users WHERE email = $1`,
      [normalizedEmail]
    )

    let userStatus
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
      userStatus = existing.rows[0].status
    } else {
      const userRes = await client.query(
        `INSERT INTO public.users (email, first_name, last_name, status)
         VALUES ($1, $2, $3, 'invited')
         RETURNING id, status`,
        [normalizedEmail, first, last]
      )
      userId = userRes.rows[0].id
      userStatus = userRes.rows[0].status
    }

    const memberRes = await client.query(
      `INSERT INTO public.operator_members (operator_id, profile_id, role, status)
       VALUES ($1, $2, 'Admin', 'active')
       RETURNING id`,
      [operatorId, userId]
    )
    const memberId = memberRes.rows[0].id

    if (userStatus !== 'active') {
      rawToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
      await client.query(
        `INSERT INTO public.invitation_tokens (user_id, operator_id, member_id, token_hash, expires_at, invited_by)
         VALUES ($1, $2, $3, $4, now() + interval '${EXPIRY_HOURS} hours', NULL)`,
        [userId, operatorId, memberId, hashToken(rawToken)]
      )
    }

    await client.query(
      `INSERT INTO public.audit_log (operator_id, actor_id, principal_kind, entity_type, entity_id, action, changes)
       VALUES ($1, $2, 'system', 'operator', $3, 'operator_bootstrap', $4)`,
      [operatorId, userId, operatorId, JSON.stringify({ slug, name, email: normalizedEmail })]
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  console.log(`Operator created: ${name} (${slug}) id=${operatorId}`)
  console.log(`Admin user: ${normalizedEmail} id=${userId}`)
  if (rawToken) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    console.log(`Setup link: ${appUrl}/setup-password?token=${rawToken}`)
  } else {
    console.log('User was already active; no invitation issued.')
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message)
  process.exit(1)
})
