// node:module registerHooks resolver for tests that import server modules built
// for Next's bundler under plain `node --test`. Three jobs:
//   1. `@/` -> `src/` path alias (matches tsconfig.json's "paths").
//   2. extensionless relative imports (`./policy`, TS style) -> append .ts/.tsx.
//   3. next/headers, next/navigation, next/server are virtual/type-only modules
//      Next's webpack build resolves, not real package exports at runtime
//      (confirmed: `node -e "import('next/headers')"` fails even with no hook at
//      all) -> redirect to stubs, see scripts/test-stubs/*.mjs for why each stub
//      is sufficient (nothing in access.test.mjs calls the real behavior).
// ponytail: a handful of fixed rules, no general-purpose module mocking system.
import { registerHooks } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'

const repoRoot = path.join(import.meta.dirname, '..')
const EXTENSIONS = ['.ts', '.tsx', '/index.ts']

function withExtension(base) {
  return EXTENSIONS.map((ext) => base + ext).find(existsSync) ?? base
}

const NEXT_STUBS = {
  'next/headers': path.join(repoRoot, 'scripts', 'test-stubs', 'next-headers.mjs'),
  'next/navigation': path.join(repoRoot, 'scripts', 'test-stubs', 'next-navigation.mjs'),
  'next/server': path.join(repoRoot, 'scripts', 'test-stubs', 'next-server.mjs'),
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in NEXT_STUBS) {
      return nextResolve(pathToFileURL(NEXT_STUBS[specifier]).href, context)
    }

    if (specifier.startsWith('@/')) {
      const base = path.join(repoRoot, 'src', specifier.slice(2))
      return nextResolve(pathToFileURL(withExtension(base)).href, context)
    }

    if (
      specifier.startsWith('.') &&
      !path.extname(specifier) &&
      context.parentURL &&
      !context.parentURL.includes('/node_modules/')
    ) {
      const base = path.join(path.dirname(fileURLToPath(context.parentURL)), specifier)
      return nextResolve(pathToFileURL(withExtension(base)).href, context)
    }

    return nextResolve(specifier, context)
  },
})
