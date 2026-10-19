// ponytail: next/headers is a virtual module Next's bundler resolves, not a real
// package export, so plain `node --test` can't import it. operator.ts imports
// `cookies` at module scope but access.test.mjs only exercises resolvePrincipal()
// directly, never requireCapability/authorize/requirePlatformAdmin (the only
// callers of cookies()) — so this stub only needs to satisfy the static import.
// Upgrade to a working fake (backed by a settable cookie jar) if a future test
// needs to exercise those wrappers.
export async function cookies() {
  throw new Error('next/headers cookies() stub: not implemented for node --test, see comment in this file')
}
