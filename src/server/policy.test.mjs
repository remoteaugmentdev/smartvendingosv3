import { test } from 'node:test'
import assert from 'node:assert'
import { scope, can } from './policy.ts'

test('read capability: Technician is scoped to assigned, others see all', () => {
  assert.strictEqual(scope('Admin', 'operations.read', false), 'all')
  assert.strictEqual(scope('Viewer', 'operations.read', false), 'all')
  assert.strictEqual(scope('Technician', 'operations.read', false), 'assigned')
})

test('write capability: Viewer and Technician refused catalog.write', () => {
  assert.strictEqual(scope('Viewer', 'catalog.write', false), null)
  assert.strictEqual(scope('Technician', 'catalog.write', false), null)
  assert.strictEqual(scope('Manager', 'catalog.write', false), 'all')
})

test('records.reverse is Admin only', () => {
  assert.strictEqual(scope('Admin', 'records.reverse', false), 'all')
  assert.strictEqual(scope('Manager', 'records.reverse', false), null)
})

test('Technician write caps are scoped to assigned', () => {
  assert.strictEqual(scope('Technician', 'service.write', false), 'assigned')
  assert.strictEqual(scope('Technician', 'trips.finish', false), 'assigned')
  assert.strictEqual(scope('Technician', 'issues.write', false), 'assigned')
  assert.strictEqual(scope('Technician', 'reports.export', false), 'assigned')
})

test('Dispatcher cannot plan finance/catalog/warehouse writes', () => {
  assert.strictEqual(scope('Dispatcher', 'finance.write', false), null)
  assert.strictEqual(scope('Dispatcher', 'catalog.write', false), null)
  assert.strictEqual(scope('Dispatcher', 'warehouse.write', false), null)
  assert.strictEqual(scope('Dispatcher', 'trips.plan', false), 'all')
})

test('members.admin, company.admin, subscription.manage are Admin only', () => {
  for (const cap of ['members.admin', 'company.admin', 'subscription.manage']) {
    assert.strictEqual(scope('Admin', cap, false), 'all')
    assert.strictEqual(scope('Manager', cap, false), null)
  }
})

test('unknown role gets null for every capability', () => {
  assert.strictEqual(scope('Ghost', 'operations.read', false), null)
  assert.strictEqual(scope('Ghost', 'catalog.write', false), null)
})

test('readOnly refuses every write capability regardless of role', () => {
  assert.strictEqual(scope('Admin', 'catalog.write', true), null)
  assert.strictEqual(scope('Admin', 'members.admin', true), null)
  assert.strictEqual(scope('Admin', 'subscription.manage', true), null)
})

test('readOnly still allows read capabilities', () => {
  assert.strictEqual(scope('Admin', 'operations.read', true), 'all')
  assert.strictEqual(scope('Viewer', 'finance.read', true), 'all')
})

test('can() mirrors scope() truthiness', () => {
  assert.strictEqual(can('Admin', 'operations.read', false), true)
  assert.strictEqual(can('Viewer', 'catalog.write', false), false)
})
