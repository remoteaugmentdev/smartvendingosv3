import crypto from 'node:crypto'
import type { PoolClient } from 'pg'
import { audit } from './audit'

const TOKEN_BYTES = 32
const EXPIRY_HOURS = 48

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export interface IssueInvitationArgs {
  userId: string
  operatorId: string | null
  memberId: string | null
  invitedBy: string | null
}

/** Revokes the user's earlier pending tokens, issues a new one. Returns the raw token. */
export async function issueInvitation(client: PoolClient, args: IssueInvitationArgs): Promise<string> {
  await client.query(
    `UPDATE public.invitation_tokens
     SET revoked_at = now()
     WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL`,
    [args.userId]
  )

  const raw = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
  await client.query(
    `INSERT INTO public.invitation_tokens (user_id, operator_id, member_id, token_hash, expires_at, invited_by)
     VALUES ($1, $2, $3, $4, now() + interval '${EXPIRY_HOURS} hours', $5)`,
    [args.userId, args.operatorId, args.memberId, hashToken(raw), args.invitedBy]
  )

  return raw
}

export type ConsumeInvitationResult =
  | { ok: true }
  | { ok: false; error: 'invalid-link' | 'suspended' }

/** Atomically consumes a raw token, sets the password, and activates the user. */
export async function consumeInvitation(
  client: PoolClient,
  rawToken: string,
  password: string
): Promise<ConsumeInvitationResult> {
  const { rows } = await client.query<{ user_id: string; operator_id: string | null; member_id: string | null }>(
    `UPDATE public.invitation_tokens
     SET consumed_at = now()
     WHERE token_hash = $1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
     RETURNING user_id, operator_id, member_id`,
    [hashToken(rawToken)]
  )
  const invitation = rows[0]
  if (!invitation) return { ok: false, error: 'invalid-link' }

  const { rows: userRows } = await client.query<{ status: string }>(
    `SELECT status FROM public.users WHERE id = $1 FOR UPDATE`,
    [invitation.user_id]
  )
  const user = userRows[0]
  if (!user || user.status === 'suspended') return { ok: false, error: 'suspended' }

  await client.query(
    `UPDATE public.users
     SET password_hash = crypt($2, gen_salt('bf')), status = 'active', session_version = session_version + 1, updated_at = now()
     WHERE id = $1`,
    [invitation.user_id, password]
  )

  await audit(client, {
    operatorId: invitation.operator_id,
    actorId: invitation.user_id,
    principalKind: 'user',
    entityType: 'user',
    entityId: invitation.user_id,
    action: 'invitation_accept',
  })

  return { ok: true }
}
