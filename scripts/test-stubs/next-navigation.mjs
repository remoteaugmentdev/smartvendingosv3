// ponytail: see next-headers.mjs. Same reasoning, for redirect().
export function redirect() {
  throw new Error('next/navigation redirect() stub: not implemented for node --test, see comment in this file')
}
export function notFound() {
  throw new Error('next/navigation notFound() stub: not implemented for node --test, see comment in this file')
}
