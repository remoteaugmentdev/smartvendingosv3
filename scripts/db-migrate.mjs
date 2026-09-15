// Idempotent SQL migration runner. Applies db/*.sql files in filename order,
// each in its own transaction, tracked in public.schema_migrations so re-runs
// skip what's already applied. ponytail: no down-migrations, no CLI framework,
// this is a demo-scale runner, not a migration tool.
import fs from 'node:fs'
import path from 'node:path'
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
  console.error('DATABASE_URL environment variable is not set. Aborting migration.')
  process.exit(1)
}

// optional filter arg, e.g. `node scripts/db-migrate.mjs 001` only applies matching files
const filter = process.argv[2]

const dbDir = path.join(process.cwd(), 'db')
const files = fs
  .readdirSync(dbDir)
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => !filter || f.includes(filter))
  .sort()

if (files.length === 0) {
  console.error(`No .sql files found in ${dbDir}${filter ? ` matching "${filter}"` : ''}.`)
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
})

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `)
}

async function alreadyApplied(client, filename) {
  const res = await client.query(
    'SELECT 1 FROM public.schema_migrations WHERE filename = $1',
    [filename]
  )
  return res.rowCount > 0
}

async function applyFile(client, filename) {
  const sql = fs.readFileSync(path.join(dbDir, filename), 'utf8')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query(
      'INSERT INTO public.schema_migrations (filename) VALUES ($1)',
      [filename]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

async function main() {
  const client = await pool.connect()
  try {
    await ensureMigrationsTable(client)
    for (const filename of files) {
      if (await alreadyApplied(client, filename)) {
        console.log(`skip  ${filename} (already applied)`)
        continue
      }
      await applyFile(client, filename)
      console.log(`apply ${filename}`)
    }
    console.log('Migration complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
