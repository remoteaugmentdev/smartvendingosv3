'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { pool } from '@/utils/db'
import { getSession, signSession, COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/utils/session'

// Server Action, bound to a specific operatorId per membership button (see
// node_modules/next/dist/docs/01-app/02-guides/forms.md "Passing additional arguments").
// Never trusts the bound id beyond re-checking an active membership exists for it.
// A form action must return void|Promise<void>, so on refusal it redirects back to
// the selection page (a race: the membership was revoked between page load and submit)
// rather than returning a result value.
export async function selectOperator(operatorId: string): Promise<void> {
  const session = await getSession()
  if (!session || session.kind !== 'user') redirect('/login')

  const { rows } = await pool.query<{ id: string }>(
    `SELECT om.operator_id AS id
     FROM public.operator_members om
     WHERE om.profile_id = $1 AND om.operator_id = $2 AND om.status = 'active'`,
    [session.sub, operatorId]
  )
  if (!rows[0]) redirect('/select-operator')

  const token = await signSession({ kind: 'user', sub: session.sub, sv: session.sv, op: operatorId })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
  redirect('/dashboard')
}
