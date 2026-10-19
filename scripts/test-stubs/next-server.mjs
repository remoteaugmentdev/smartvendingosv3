// ponytail: see next-headers.mjs. session.ts imports `{ type NextRequest }` from
// 'next/server' (type-only), but node --test still resolves the specifier before
// erasure, so export a dummy binding in case the type marker isn't elided either.
export class NextRequest {}

// Minimal NextResponse: route handlers under test only call .json()/.redirect()/.next()
// and set cookies on the result. Built on the real Web Response so .status/.json() work.
export class NextResponse extends Response {
  constructor(body, init) {
    super(body, init)
    this.cookies = { set() {}, delete() {} }
  }
  static json(body, init) {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
  }
  static redirect(url, init) {
    return new NextResponse(null, { ...init, status: init?.status ?? 307, headers: { location: String(url) } })
  }
  static next(init) {
    return new NextResponse(null, init)
  }
}
