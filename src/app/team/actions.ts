'use server'

import { revalidatePath } from 'next/cache'
import { withTransaction } from '@/utils/db'
import { authorize } from '@/server/operator'
import { audit, type ActionResult } from '@/server/audit'
import { issueInvitation } from '@/server/invitation'

type Role = 'Admin' | 'Manager' | 'Dispatcher' | 'Technician' | 'Viewer'
const ROLES: Role[] = ['Admin', 'Manager', 'Dispatcher', 'Technician', 'Viewer']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function inviteLinkFor(rawToken: string): string {
  const base = process.env.APP_URL ?? 'http://localhost:3000'
  return `${base}/setup-password?token=${rawToken}`
}

export type CreateMemberData = { inviteLink: string | null }

export async function createMember(
  _prev: ActionResult<CreateMemberData> | null,
  formData: FormData
): Promise<ActionResult<CreateMemberData>> {
  const auth = await authorize('members.admin')
  if (!auth.ok) return { ok: false, code: 'FORBIDDEN' }

  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName = String(formData.get('lastName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? '') as Role

  const fieldErrors: Record<string, string> = {}
  if (!firstName) fieldErrors.firstName = 'Required'
  if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address'
  if (!ROLES.includes(role)) fieldErrors.role = 'Choose a role'
  if (Object.keys(fieldErrors).length > 0) return { ok: false, code: 'VALIDATION', fieldErrors }

  const { operatorId, userId: actorId } = auth.principal

  const result = await withTransaction(async (client): Promise<ActionResult<CreateMemberData>> => {
    const { rows: existingMember } = await client.query<{ id: string }>(
      `SELECT om.id FROM public.operator_members om
       JOIN public.users u ON u.id = om.profile_id
       WHERE om.operator_id = $1 AND u.email = $2`,
      [operatorId, email]
    )
    if (existingMember[0]) {
      return { ok: false, code: 'CONFLICT', fieldErrors: { email: 'Already a member of this operator' } }
    }

    const { rows: existingUser } = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM public.users WHERE email = $1`,
      [email]
    )

    let userId: string
    let userStatus: string
    if (existingUser[0]) {
      userId = existingUser[0].id
      userStatus = existingUser[0].status
    } else {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO public.users (email, first_name, last_name, status)
         VALUES ($1, $2, $3, 'invited') RETURNING id`,
        [email, firstName, lastName || null]
      )
      userId = rows[0].id
      userStatus = 'invited'
    }

    const { rows: memberRows } = await client.query<{ id: string }>(
      `INSERT INTO public.operator_members (operator_id, profile_id, role, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [operatorId, userId, role]
    )
    const memberId = memberRows[0].id

    let inviteLink: string | null = null
    if (userStatus !== 'active') {
      const raw = await issueInvitation(client, { userId, operatorId, memberId, invitedBy: actorId })
      inviteLink = inviteLinkFor(raw)
    }

    await audit(client, {
      operatorId,
      actorId,
      principalKind: 'user',
      entityType: 'operator_member',
      entityId: memberId,
      action: 'member_create',
      changes: { email, role },
    })

    return { ok: true, data: { inviteLink } }
  })

  if (result.ok) revalidatePath('/team')
  return result
}

export async function setMemberStatus(memberId: string, status: 'active' | 'suspended'): Promise<ActionResult<null>> {
  const auth = await authorize('members.admin')
  if (!auth.ok) return { ok: false, code: 'FORBIDDEN' }
  const { operatorId, userId: actorId } = auth.principal

  const result = await withTransaction(async (client): Promise<ActionResult<null>> => {
    const { rows } = await client.query<{ id: string; profile_id: string; role: Role }>(
      `SELECT id, profile_id, role FROM public.operator_members WHERE id = $1 AND operator_id = $2 FOR UPDATE`,
      [memberId, operatorId]
    )
    const member = rows[0]
    if (!member) return { ok: false, code: 'NOT_FOUND' }

    if (status === 'suspended' && member.role === 'Admin') {
      // Lock every active-Admin row for this operator before counting, so two
      // concurrent suspensions of two different admins cannot both read "2 left" and pass.
      const { rows: admins } = await client.query<{ id: string }>(
        `SELECT id FROM public.operator_members
         WHERE operator_id = $1 AND role = 'Admin' AND status = 'active'
         FOR UPDATE`,
        [operatorId]
      )
      if (admins.length <= 1) {
        return { ok: false, code: 'CONFLICT', fieldErrors: { status: 'The operator must keep at least one active Admin' } }
      }
    }

    await client.query(`UPDATE public.operator_members SET status = $2, updated_at = now() WHERE id = $1`, [memberId, status])

    if (status === 'suspended') {
      await client.query(
        `UPDATE public.invitation_tokens SET revoked_at = now()
         WHERE user_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL`,
        [member.profile_id]
      )
    }

    await audit(client, {
      operatorId,
      actorId,
      principalKind: 'user',
      entityType: 'operator_member',
      entityId: memberId,
      action: status === 'active' ? 'member_activate' : 'member_suspend',
    })

    return { ok: true, data: null }
  })

  if (result.ok) revalidatePath('/team')
  return result
}

export async function regenerateInvite(memberId: string): Promise<ActionResult<{ inviteLink: string }>> {
  const auth = await authorize('members.admin')
  if (!auth.ok) return { ok: false, code: 'FORBIDDEN' }
  const { operatorId, userId: actorId } = auth.principal

  const result = await withTransaction(async (client): Promise<ActionResult<{ inviteLink: string }>> => {
    const { rows } = await client.query<{ id: string; profile_id: string }>(
      `SELECT om.id, om.profile_id
       FROM public.operator_members om
       JOIN public.users u ON u.id = om.profile_id
       WHERE om.id = $1 AND om.operator_id = $2 AND u.status = 'invited'`,
      [memberId, operatorId]
    )
    const member = rows[0]
    if (!member) return { ok: false, code: 'NOT_FOUND' }

    const raw = await issueInvitation(client, { userId: member.profile_id, operatorId, memberId, invitedBy: actorId })

    await audit(client, {
      operatorId,
      actorId,
      principalKind: 'user',
      entityType: 'operator_member',
      entityId: memberId,
      action: 'invitation_regenerate',
    })

    return { ok: true, data: { inviteLink: inviteLinkFor(raw) } }
  })

  if (result.ok) revalidatePath('/team')
  return result
}
