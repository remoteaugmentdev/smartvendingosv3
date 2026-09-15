import { pool } from '@/utils/db'
import { getSession, type SessionPayload } from '@/utils/session'

/**
 * The single tenancy chokepoint. Nothing else in the app resolves which
 * operator a request belongs to, which is why every query module takes
 * operatorId as its first argument rather than reaching for the session.
 */

export const DEMO_OPERATOR_SLUG = 'demo'

export interface OperatorContext {
  operatorId: string
  role: string
  readOnly: boolean
  session: SessionPayload
}

// ponytail: module-scope cache, the demo operator id never changes within a process.
let demoOperatorId: string | null = null

async function getDemoOperatorId(): Promise<string> {
  if (demoOperatorId) return demoOperatorId
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM public.operators WHERE slug = $1`,
    [DEMO_OPERATOR_SLUG]
  )
  if (!rows[0]) throw new Error('Demo operator is missing. Run: npm run db:seed')
  demoOperatorId = rows[0].id
  return demoOperatorId
}

export async function requireOperator(): Promise<OperatorContext> {
  const session = await getSession()
  if (!session) throw new Error('Not authenticated')

  // Resolve the tenant from the signed userId, never from session.slug: slug is a
  // lead-chosen company slug derived from unauthenticated form input, so trusting
  // it would let a prospect name themselves after a real operator and read that
  // operator's data.
  // ponytail: LIMIT 1, first membership wins, no operator switcher.
  const { rows } = await pool.query<{ operator_id: string; role: string }>(
    `SELECT operator_id, role FROM public.operator_members
     WHERE profile_id = $1 AND status = 'active' LIMIT 1`,
    [session.userId]
  )

  if (rows[0]) {
    return {
      operatorId: rows[0].operator_id,
      role: rows[0].role,
      readOnly: rows[0].role === 'Viewer',
      session,
    }
  }

  // Prospects minted by POST /api/leads have no membership. They share one
  // read-only demo tenant so the funnel shows a populated app without letting
  // them mutate it.
  return {
    operatorId: await getDemoOperatorId(),
    role: session.role === 'master' ? 'Admin' : 'Viewer',
    readOnly: session.role !== 'master',
    session,
  }
}

export async function requireWriteOperator(): Promise<OperatorContext> {
  const ctx = await requireOperator()
  if (ctx.readOnly) throw new Error('This demo account is read only.')
  return ctx
}
