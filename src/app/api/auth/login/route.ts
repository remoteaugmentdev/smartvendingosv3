import { NextResponse } from 'next/server'
import { pool } from '@/utils/db'
import { signSession, COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/utils/session'
import { rateLimit, clientIp } from '@/server/rateLimit'

const GENERIC_ERROR = 'Invalid email or password'

// ponytail: fixed bcrypt hash with no matching password, used as the crypt() target
// when the email is unknown so the query shape (and rough timing) is identical to a
// real user with a wrong password. The response must not reveal which case it was.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q0R6QVpUBUX0kAzUjm71Aa64eR6.a'

export async function POST(request: Request) {
  const ip = clientIp(request.headers)
  if (!rateLimit('login', ip, 10)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const { rows } = await pool.query<{
      id: string
      password_hash: string | null
      status: string
      platform_role: 'master' | 'demo' | null
      expires_at: string | null
      session_version: number
    }>(
      `SELECT id, password_hash, status, platform_role, expires_at, session_version
       FROM public.users WHERE email = lower(btrim($1))`,
      [email]
    )
    const user = rows[0]

    const { rows: matchRows } = await pool.query<{ ok: boolean }>(
      `SELECT ($1::text = crypt($2, $1::text)) AS ok`,
      [user?.password_hash ?? DUMMY_HASH, password]
    )

    if (!user || user.status !== 'active' || !matchRows[0]?.ok) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }
    if (user.expires_at && new Date(user.expires_at) <= new Date()) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const { rows: memberships } = await pool.query<{ operator_id: string }>(
      `SELECT om.operator_id
       FROM public.operator_members om
       JOIN public.operators o ON o.id = om.operator_id
       WHERE om.profile_id = $1 AND om.status = 'active'`,
      [user.id]
    )

    if (memberships.length === 0 && !user.platform_role) {
      return NextResponse.json(
        { error: 'Your account has no active access. Ask your administrator.' },
        { status: 403 }
      )
    }

    const op = memberships.length === 1 ? memberships[0].operator_id : undefined
    const token = await signSession({ kind: 'user', sub: user.id, sv: user.session_version, op })

    const redirect =
      user.platform_role === 'master'
        ? '/admin/leads'
        : memberships.length > 1
          ? '/select-operator'
          : '/dashboard'

    const response = NextResponse.json({ ok: true, redirect })
    response.cookies.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
    return response
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
