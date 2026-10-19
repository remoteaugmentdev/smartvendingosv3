import { NextResponse, type NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/utils/session'
import { isCompanyDemoLink, parseCompanyRoute } from '@/utils/companyLink'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths always pass through
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/select-operator') ||
    pathname.startsWith('/setup-password') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    isCompanyDemoLink(pathname)
  ) {
    return NextResponse.next({ request })
  }

  const session = await getSessionFromRequest(request)

  // Admin area: optimistic session-presence check only (JWT verify, no DB
  // round trip here). The authoritative platform_role/status/expiry/
  // session_version check happens in requirePlatformAdmin() on each admin
  // page and Server Action, since a Server Function isn't a separate route
  // and can't be reached through the proxy matcher alone.
  if (pathname.startsWith('/admin')) {
    if (session?.kind !== 'user') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next({ request })
  }

  // No session → send to the landing page; the demo form is the public entrance
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Personalized in-app URLs (/{slug}/dashboard, /{slug}/orders, ...): keep the
  // slug visible in the address bar but serve the real route underneath. No
  // data is scoped by slug: this app has no per-tenant data, see AGENTS.md.
  const companyRoute = parseCompanyRoute(pathname)
  if (companyRoute) {
    const url = request.nextUrl.clone()
    url.pathname = companyRoute
    return NextResponse.rewrite(url)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
