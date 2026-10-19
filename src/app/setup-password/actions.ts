'use server'

import { headers } from 'next/headers'
import { withTransaction } from '@/utils/db'
import { consumeInvitation } from '@/server/invitation'
import { rateLimit, clientIp } from '@/server/rateLimit'
import type { ActionResult } from '@/server/audit'

export type SetupPasswordData = { done: true }

export async function setupPassword(
  _prev: ActionResult<SetupPasswordData> | null,
  formData: FormData
): Promise<ActionResult<SetupPasswordData>> {
  const ip = clientIp(await headers())
  if (!rateLimit('setup-password', ip, 10)) {
    return { ok: false, code: 'FORBIDDEN', fieldErrors: { token: 'Too many attempts. Try again in a minute.' } }
  }

  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  const fieldErrors: Record<string, string> = {}
  if (!token) fieldErrors.token = 'Missing invite token'
  if (password.length < 8) fieldErrors.password = 'Must be at least 8 characters'
  if (password !== confirm) fieldErrors.confirm = 'Passwords do not match'
  if (Object.keys(fieldErrors).length > 0) return { ok: false, code: 'VALIDATION', fieldErrors }

  const result = await withTransaction((client) => consumeInvitation(client, token, password))

  if (!result.ok) {
    // ponytail: both failure modes map to the same generic message; the page's
    // token-validity check (a plain SELECT) already gives the specific reason.
    return { ok: false, code: 'VALIDATION', fieldErrors: { token: 'This link is invalid or has expired.' } }
  }

  return { ok: true, data: { done: true } }
}
