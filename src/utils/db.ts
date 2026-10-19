import { Pool, type PoolClient } from 'pg'

// Global singleton so the pool survives hot-reloads in dev
const g = global as unknown as { _pool?: Pool }

// ponytail: the local disposable test cluster uses trust auth with no TLS;
// the hosted DB (Supabase) requires it. Detect by hostname, no config flag.
function isLocalHost(connectionString: string | undefined): boolean {
  if (!connectionString) return false
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(connectionString).hostname)
  } catch {
    return false
  }
}

export const pool =
  g._pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalHost(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
    max: 10,
  })

if (process.env.NODE_ENV !== 'production') g._pool = pool

// ponytail: one checked-out client for the whole transaction; callers just run
// plain queries against `client` inside fn.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
