import type { PoolClient } from 'pg'

export type ErrorCode = 'VALIDATION' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string> }

const SECRET_KEY = /password|token|secret|hash|credential/i

// ponytail: recursive redact over plain JSON-shaped values only (what callers ever
// pass as `changes`); a class instance or Map would just pass through unredacted.
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : redact(v)
    }
    return out
  }
  return value
}

export interface AuditEntry {
  operatorId: string | null
  actorId: string | null
  principalKind: 'user' | 'prospect' | 'system'
  entityType: string
  entityId?: string | null
  action: string
  changes?: unknown
}

export async function audit(client: PoolClient, entry: AuditEntry): Promise<void> {
  await client.query(
    `INSERT INTO public.audit_log (operator_id, actor_id, principal_kind, entity_type, entity_id, action, changes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.operatorId,
      entry.actorId,
      entry.principalKind,
      entry.entityType,
      entry.entityId ?? null,
      entry.action,
      entry.changes === undefined ? null : JSON.stringify(redact(entry.changes)),
    ]
  )
}
