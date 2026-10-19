import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { ChevronRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Card } from '@/components/ui/Card'
import { pool } from '@/utils/db'
import { COOKIE_NAME, getSession } from '@/utils/session'
import { resolvePrincipal } from '@/server/operator'
import { selectOperator } from './actions'

export const metadata: Metadata = { title: 'Select operator | SmartVendingOS' }

type Membership = { operator_id: string; name: string; role: string }

export default async function SelectOperatorPage() {
  const session = await getSession()
  if (!session || session.kind !== 'user') redirect('/login')

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const result = await resolvePrincipal(token)

  if (!('denied' in result)) redirect('/dashboard')
  if (result.denied !== 'SELECT_OPERATOR') redirect('/login')

  const { rows: memberships } = await pool.query<Membership>(
    `SELECT om.operator_id, o.name, om.role
     FROM public.operator_members om
     JOIN public.operators o ON o.id = om.operator_id
     WHERE om.profile_id = $1 AND om.status = 'active'
     ORDER BY o.name`,
    [session.sub]
  )

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg-page)] px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={80} className="shrink-0" />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Select an operator</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Your account belongs to more than one operator. Choose one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {memberships.map((m) => (
            <form key={m.operator_id} action={selectOperator.bind(null, m.operator_id)}>
              <Card hover={false} className="p-0">
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{m.name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{m.role}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                </button>
              </Card>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}
