import { NextResponse, type NextRequest } from 'next/server'
import { pool } from '@/utils/db'
import { signSession, getSessionFromRequest, COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/utils/session'
import { isReservedSlug } from '@/utils/companyLink'
import { rateLimit, clientIp } from '@/server/rateLimit'

// Re-enters the demo dashboard for a slug that was already filled out,
// even if the session cookie is gone (e.g. after signing out). Mints a
// fresh demo session from the existing lead record and redirects in.
export async function GET(request: NextRequest) {
  if (!rateLimit('leads-resume', clientIp(request.headers), 30)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const slug = request.nextUrl.searchParams.get('slug')?.trim()
  if (!slug || isReservedSlug(slug)) return NextResponse.redirect(new URL('/', request.url))

  const { rows } = await pool.query(
    `SELECT id, email FROM public.leads WHERE slug = $1 AND full_name IS NOT NULL AND email IS NOT NULL`,
    [slug]
  )
  const lead = rows[0]
  if (!lead) return NextResponse.redirect(new URL(`/${slug}`, request.url))

  const response = NextResponse.redirect(new URL(`/${slug}/dashboard`, request.url))

  // Never downgrade a signed-in user (see api/leads/route.ts for why `op`
  // can't carry the slug); only mint a prospect session when there isn't one.
  const existing = await getSessionFromRequest(request)
  if (existing?.kind !== 'user') {
    const token = await signSession({ kind: 'prospect', sub: lead.id, slug })
    response.cookies.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
  }
  return response
}
