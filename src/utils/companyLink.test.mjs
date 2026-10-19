import { test } from 'node:test'
import assert from 'node:assert'
import { isCompanyDemoLink, parseCompanyRoute, isReservedSlug } from './companyLink.ts'

test('isCompanyDemoLink', () => {
  assert.strictEqual(isCompanyDemoLink('/map'), false)
  assert.strictEqual(isCompanyDemoLink('/products'), false)
  assert.strictEqual(isCompanyDemoLink('/insights/forecast'), false)
  assert.strictEqual(isCompanyDemoLink('/acme'), true)
  assert.strictEqual(isCompanyDemoLink('/acme/dashboard'), false)
  assert.strictEqual(isCompanyDemoLink('/dashboard'), false)
})

test('parseCompanyRoute', () => {
  assert.strictEqual(parseCompanyRoute('/acme/dashboard'), '/dashboard')
  assert.strictEqual(parseCompanyRoute('/acme/map'), null)
  assert.strictEqual(parseCompanyRoute('/acme/insights/forecast'), null)
  assert.strictEqual(parseCompanyRoute('/acme/products'), null)
  assert.strictEqual(parseCompanyRoute('/map'), null)
  assert.strictEqual(parseCompanyRoute('/dashboard'), null)
})

test('isReservedSlug', () => {
  // reserved (retired routes)
  assert.strictEqual(isReservedSlug('map'), true)
  assert.strictEqual(isReservedSlug('data-center'), true)
  assert.strictEqual(isReservedSlug('insights'), true)
  assert.strictEqual(isReservedSlug('promotions'), true)
  assert.strictEqual(isReservedSlug('products'), true)
  assert.strictEqual(isReservedSlug('Map'), true)
  // routable app names
  assert.strictEqual(isReservedSlug('dashboard'), true)
  assert.strictEqual(isReservedSlug('inventory'), true)
  // normal company slug
  assert.strictEqual(isReservedSlug('acme'), false)
})
