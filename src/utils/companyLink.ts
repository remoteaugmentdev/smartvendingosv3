// Every routable top-level route folder under src/app. Kept in sync with the
// filesystem so /[company] (any other single-segment path) can stay public
// for anonymous prospects without listing it explicitly.
export const APP_ROUTES = new Set([
  'admin', 'alerts', 'api', 'configuration', 'dashboard',
  'expenses', 'inventory', 'landing', 'locations', 'login',
  'machines', 'orders', 'pricing', 'profile',
  'purchases', 'routes', 'select-operator', 'settings', 'setup-password',
  'signup', 'team', 'trips', 'users',
])

// Retired top-level routes. Their folders are gone, but the names must still
// be blocked from resolving as a company slug (e.g. /map is not a company
// demo) so the catch-all /[company] page 404s instead of rendering a demo
// page for a former feature.
export const RESERVED = new Set(['map', 'data-center', 'insights', 'promotions', 'products'])

export function isReservedSlug(slug: string) {
  const name = slug.toLowerCase()
  return RESERVED.has(name) || APP_ROUTES.has(name)
}

export function isCompanyDemoLink(pathname: string) {
  const [, first, rest] = pathname.split('/')
  return Boolean(first) && !rest && !isReservedSlug(first)
}

export function parseCompanyRoute(pathname: string): string | null {
  const [, first, ...rest] = pathname.split('/')
  if (!first || isReservedSlug(first) || rest.length === 0) return null
  if (!APP_ROUTES.has(rest[0])) return null
  return `/${rest.join('/')}`
}
