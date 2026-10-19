import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { pool } from '@/utils/db'
import { verifySession, COOKIE_NAME } from '@/utils/session'
import { can as canDefault, scope as capScope, type Capability, type Scope } from './policy'

/**
 * The single tenancy chokepoint. Nothing else in the app resolves which operator
 * a request belongs to, which is why every query module takes operatorId from the
 * resolved Principal rather than from form fields or query strings.
 */

export const DEMO_OPERATOR_SLUG = 'demo'

export type DenialCode = 'UNAUTHENTICATED' | 'SELECT_OPERATOR' | 'FORBIDDEN'
export type Denial = { denied: DenialCode }

export interface Principal {
  kind: 'user' | 'prospect'
  userId: string | null
  leadId: string | null
  operatorId: string
  operatorSlug: string
  operatorName: string
  role: string
  plan: string | null
  platformRole: 'master' | 'demo' | null
  readOnly: boolean
  // Prospect's cosmetic demo-link slug (e.g. "acme"). Display only: it is never used
  // to select data, the demo operator above is always the one actually queried.
  slug?: string
}

function isDenial(p: Principal | Denial): p is Denial {
  return 'denied' in p
}

// ponytail: module-scope cache, the demo operator row never changes within a process.
let demoOperatorCache: { id: string; slug: string; name: string; plan: string | null } | null = null

async function getDemoOperator() {
  if (demoOperatorCache) return demoOperatorCache
  const { rows } = await pool.query<{ id: string; slug: string; name: string; plan: string | null }>(
    `SELECT id, slug, name, plan FROM public.operators WHERE slug = $1`,
    [DEMO_OPERATOR_SLUG]
  )
  if (!rows[0]) throw new Error('Demo operator is missing. Run: npm run db:seed')
  demoOperatorCache = rows[0]
  return demoOperatorCache
}

type Membership = { role: string; operator_id: string; slug: string; name: string; plan: string | null }

function membershipPrincipal(userId: string, platformRole: 'master' | 'demo' | null, m: Membership): Principal {
  return {
    kind: 'user',
    userId,
    leadId: null,
    operatorId: m.operator_id,
    operatorSlug: m.slug,
    operatorName: m.name,
    role: m.role,
    plan: m.plan,
    platformRole,
    readOnly: m.slug === DEMO_OPERATOR_SLUG || platformRole === 'demo',
  }
}

async function resolveUser(sub: string, sv: number, op: string | undefined): Promise<Principal | Denial> {
  const { rows } = await pool.query<{
    id: string
    status: string
    platform_role: 'master' | 'demo' | null
    session_version: number
    expires_at: string | null
  }>(`SELECT id, status, platform_role, session_version, expires_at FROM public.users WHERE id = $1`, [sub])

  const user = rows[0]
  if (!user) return { denied: 'UNAUTHENTICATED' }
  if (user.status !== 'active') return { denied: 'UNAUTHENTICATED' }
  if (user.expires_at && new Date(user.expires_at) <= new Date()) return { denied: 'UNAUTHENTICATED' }
  if (user.session_version !== sv) return { denied: 'UNAUTHENTICATED' }

  if (op) {
    const { rows: memberRows } = await pool.query<Membership>(
      `SELECT om.role, om.operator_id, o.slug, o.name, o.plan
       FROM public.operator_members om
       JOIN public.operators o ON o.id = om.operator_id
       WHERE om.profile_id = $1 AND om.operator_id = $2 AND om.status = 'active'`,
      [sub, op]
    )
    const m = memberRows[0]
    if (!m) return { denied: 'FORBIDDEN' }
    return membershipPrincipal(sub, user.platform_role, m)
  }

  const { rows: memberships } = await pool.query<Membership>(
    `SELECT om.role, om.operator_id, o.slug, o.name, o.plan
     FROM public.operator_members om
     JOIN public.operators o ON o.id = om.operator_id
     WHERE om.profile_id = $1 AND om.status = 'active'`,
    [sub]
  )

  if (memberships.length === 1) return membershipPrincipal(sub, user.platform_role, memberships[0])
  if (memberships.length > 1) return { denied: 'SELECT_OPERATOR' }

  // No memberships. Platform accounts fall back to the shared, read-only demo
  // tenant (master included: platform access never implies write access to demo data).
  if (user.platform_role === 'master' || user.platform_role === 'demo') {
    const demo = await getDemoOperator()
    return {
      kind: 'user',
      userId: sub,
      leadId: null,
      operatorId: demo.id,
      operatorSlug: demo.slug,
      operatorName: demo.name,
      role: 'Admin',
      plan: demo.plan,
      platformRole: user.platform_role,
      readOnly: true,
    }
  }

  return { denied: 'FORBIDDEN' }
}

export async function resolvePrincipal(token: string | undefined): Promise<Principal | Denial> {
  if (!token) return { denied: 'UNAUTHENTICATED' }
  const session = await verifySession(token)
  if (!session) return { denied: 'UNAUTHENTICATED' }

  if (session.kind === 'prospect') {
    const { rows } = await pool.query<{ id: string }>(`SELECT id FROM public.leads WHERE id = $1`, [session.sub])
    if (!rows[0]) return { denied: 'UNAUTHENTICATED' }
    const demo = await getDemoOperator()
    return {
      kind: 'prospect',
      userId: null,
      leadId: session.sub,
      operatorId: demo.id,
      operatorSlug: demo.slug,
      operatorName: demo.name,
      role: 'Admin',
      plan: demo.plan,
      platformRole: null,
      readOnly: true,
      slug: session.slug,
    }
  }

  return resolveUser(session.sub, session.sv, session.op)
}

async function currentToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export interface CapabilityContext {
  principal: Principal
  scope: Scope
}

/** For Server Components / pages. Redirects on any refusal. */
export async function requireCapability(cap: Capability): Promise<CapabilityContext> {
  const result = await resolvePrincipal(await currentToken())

  if (isDenial(result)) {
    if (result.denied === 'UNAUTHENTICATED') redirect('/login')
    if (result.denied === 'SELECT_OPERATOR') redirect('/select-operator')
    // FORBIDDEN. forbidden() needs experimental.authInterrupts; notFound() is the app's
    // existing refusal (machines/[id], [company]) and cannot loop the way a redirect to
    // a protected page could.
    notFound()
  }

  const grantedScope = capScope(result.role, cap, result.readOnly)
  if (!grantedScope) notFound()

  return { principal: result, scope: grantedScope }
}

export type AuthorizeResult =
  | { ok: true; principal: Principal; scope: Scope }
  | { ok: false; code: 'FORBIDDEN' }

/** For Server Actions. Returns a result contract instead of redirecting. */
export async function authorize(cap: Capability): Promise<AuthorizeResult> {
  const result = await resolvePrincipal(await currentToken())
  if (isDenial(result)) return { ok: false, code: 'FORBIDDEN' }

  const grantedScope = capScope(result.role, cap, result.readOnly)
  if (!grantedScope) return { ok: false, code: 'FORBIDDEN' }

  return { ok: true, principal: result, scope: grantedScope }
}

async function checkPlatformAdmin(): Promise<{ userId: string } | null> {
  const token = await currentToken()
  if (!token) return null
  const session = await verifySession(token)
  if (!session || session.kind !== 'user') return null

  const { rows } = await pool.query<{
    status: string
    platform_role: string | null
    session_version: number
    expires_at: string | null
  }>(`SELECT status, platform_role, session_version, expires_at FROM public.users WHERE id = $1`, [session.sub])
  const user = rows[0]
  if (!user || user.status !== 'active') return null
  if (user.expires_at && new Date(user.expires_at) <= new Date()) return null
  if (user.session_version !== session.sv) return null
  if (user.platform_role !== 'master') return null
  return { userId: session.sub }
}

/** For Server Components / pages under /admin. Redirects to /admin/login on refusal. */
export async function requirePlatformAdmin(): Promise<{ userId: string }> {
  const admin = await checkPlatformAdmin()
  if (!admin) redirect('/admin/login')
  return admin
}

/** For Server Actions / route handlers under /admin. Returns null instead of redirecting. */
export async function authorizePlatformAdmin(): Promise<{ userId: string } | null> {
  return checkPlatformAdmin()
}

export { canDefault as can }
export type { Capability, Scope }
