import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { pool } from '@/utils/db'
import { COOKIE_NAME } from '@/utils/session'
import { resolvePrincipal } from '@/server/operator'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const result = await resolvePrincipal(token)

  if ('denied' in result) {
    return NextResponse.json({ denied: result.denied }, { status: 401 })
  }

  const principal = result

  if (principal.kind === 'prospect') {
    const { rows } = await pool.query<{ company: string | null }>(
      `SELECT company FROM public.leads WHERE id = $1`,
      [principal.leadId]
    )
    const lead = rows[0]
    return NextResponse.json({
      user: {
        id: principal.leadId,
        email: '',
        role: null,
        expires_at: null,
        label: lead?.company ?? null,
        slug: principal.slug ?? null,
        kind: principal.kind,
        operatorId: principal.operatorId,
        operatorSlug: principal.operatorSlug,
        operatorName: principal.operatorName,
        operatorRole: principal.role,
        plan: principal.plan,
        readOnly: principal.readOnly,
        firstName: null,
        lastName: null,
      },
    })
  }

  const { rows } = await pool.query<{
    email: string
    label: string | null
    expires_at: string | null
    first_name: string | null
    last_name: string | null
  }>(
    `SELECT email, label, expires_at, first_name, last_name FROM public.users WHERE id = $1`,
    [principal.userId]
  )
  const user = rows[0]

  return NextResponse.json({
    user: {
      id: principal.userId,
      email: user?.email ?? '',
      role: principal.platformRole,
      expires_at: user?.expires_at ?? null,
      label: user?.label ?? null,
      slug: null,
      kind: principal.kind,
      operatorId: principal.operatorId,
      operatorSlug: principal.operatorSlug,
      operatorName: principal.operatorName,
      operatorRole: principal.role,
      plan: principal.plan,
      readOnly: principal.readOnly,
      firstName: user?.first_name ?? null,
      lastName: user?.last_name ?? null,
    },
  })
}
