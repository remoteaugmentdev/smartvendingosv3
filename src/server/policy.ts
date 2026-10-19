// Capability policy table: role contract from docs/milestones/README.md (lines 83-104).
// Plain lookup, no DB, no framework: one object literal is the whole implementation.

export type Role = 'Admin' | 'Manager' | 'Dispatcher' | 'Technician' | 'Viewer'
export type Scope = 'all' | 'assigned'

export type Capability =
  | 'operations.read'
  | 'finance.read'
  | 'catalog.write'
  | 'records.reverse'
  | 'warehouse.write'
  | 'trips.plan'
  | 'service.write'
  | 'trips.finish'
  | 'issues.write'
  | 'finance.write'
  | 'members.admin'
  | 'reports.export'
  | 'company.admin'
  | 'subscription.manage'

type Grant = { kind: 'read' } | { kind: 'write' }
type Rule = Grant & { roles: Partial<Record<Role, Scope>> }

const ALL: Scope = 'all'
const ASSIGNED: Scope = 'assigned'

const POLICY: Record<Capability, Rule> = {
  'operations.read': {
    kind: 'read',
    roles: { Admin: ALL, Manager: ALL, Dispatcher: ALL, Technician: ASSIGNED, Viewer: ALL },
  },
  'finance.read': {
    kind: 'read',
    roles: { Admin: ALL, Manager: ALL, Dispatcher: ALL, Viewer: ALL },
  },
  'catalog.write': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL },
  },
  'records.reverse': {
    kind: 'write',
    roles: { Admin: ALL },
  },
  'warehouse.write': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL },
  },
  'trips.plan': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL, Dispatcher: ALL },
  },
  'service.write': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL, Technician: ASSIGNED },
  },
  'trips.finish': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL, Dispatcher: ALL, Technician: ASSIGNED },
  },
  'issues.write': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL, Dispatcher: ALL, Technician: ASSIGNED },
  },
  'finance.write': {
    kind: 'write',
    roles: { Admin: ALL, Manager: ALL },
  },
  'members.admin': {
    kind: 'write',
    roles: { Admin: ALL },
  },
  'reports.export': {
    kind: 'read',
    roles: { Admin: ALL, Manager: ALL, Technician: ASSIGNED },
  },
  'company.admin': {
    kind: 'write',
    roles: { Admin: ALL },
  },
  'subscription.manage': {
    kind: 'write',
    roles: { Admin: ALL },
  },
}

/**
 * Returns the scope a role has for a capability, or null if refused.
 * readOnly=true refuses every write capability outright (demo/prospect principals).
 */
export function scope(role: string, cap: Capability, readOnly: boolean): Scope | null {
  const rule = POLICY[cap]
  if (!rule) return null
  if (readOnly && rule.kind === 'write') return null
  return rule.roles[role as Role] ?? null
}

export function can(role: string, cap: Capability, readOnly: boolean): boolean {
  return scope(role, cap, readOnly) !== null
}
