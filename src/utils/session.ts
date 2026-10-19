import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { type NextRequest } from 'next/server'

export const COOKIE_NAME = 'svos_session'

// ponytail: one options object, every route that sets/clears this cookie imports it
// instead of repeating the literal (previously duplicated in 4 routes).
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

export type SessionPayload =
  | { kind: 'user'; sub: string; sv: number; op?: string; iat?: number }
  | { kind: 'prospect'; sub: string; slug: string; iat?: number }

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.kind === 'user') {
    return typeof v.sub === 'string' && typeof v.sv === 'number' && (v.op === undefined || typeof v.op === 'string')
  }
  if (v.kind === 'prospect') {
    return typeof v.sub === 'string' && typeof v.slug === 'string'
  }
  return false
}

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

// Old-format cookies (userId/email/role, no `kind`) fail isSessionPayload and are
// treated as no session at all: everyone signed out once on this migration, by design.
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return isSessionPayload(payload) ? payload : null
  } catch {
    return null
  }
}

/** Read the session from the cookie store (Server Components / Actions) */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

/** Read the session from an incoming Edge request (Middleware) */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}
