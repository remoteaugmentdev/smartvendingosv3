'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { pool, withTransaction } from '@/utils/db'
import { getSession, signSession, COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/utils/session'
import { audit } from '@/server/audit'
import { rateLimit } from '@/server/rateLimit'

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || session.kind !== 'user') redirect('/login')

  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' }
  if (!rateLimit('password-change', session.sub, 5)) {
    return { error: 'Too many attempts. Please try again later.' }
  }

  const { rows } = await pool.query<{ status: string; session_version: number; ok: boolean }>(
    `SELECT status, session_version,
            (password_hash IS NOT NULL AND password_hash = crypt($1, password_hash)) AS ok
     FROM public.users WHERE id = $2`,
    [currentPassword, session.sub]
  )
  const user = rows[0]
  if (!user || user.status !== 'active' || !user.ok) return { error: 'Current password is incorrect' }

  const newSessionVersion = user.session_version + 1
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE public.users
       SET password_hash = crypt($1, gen_salt('bf')), session_version = $2, updated_at = now()
       WHERE id = $3`,
      [newPassword, newSessionVersion, session.sub]
    )
    await audit(client, {
      operatorId: null,
      actorId: session.sub,
      principalKind: 'user',
      entityType: 'user',
      entityId: session.sub,
      action: 'password_change',
    })
  })

  // The session_version bump above invalidates the cookie this request came in with;
  // re-sign immediately so the caller stays logged in on this device.
  const token = await signSession({ kind: 'user', sub: session.sub, sv: newSessionVersion, op: session.op })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)

  return {}
}
