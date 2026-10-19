import Link from 'next/link'
import type { Metadata } from 'next'
import { UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { requireCapability } from '@/server/operator'
import { pool } from '@/utils/db'
import { TeamClient, type MemberRow } from './TeamClient'

export const metadata: Metadata = { title: 'Team | SmartVendingOS' }

const SORT_COLUMNS = {
  name: 'u.first_name, u.last_name',
  email: 'u.email',
  role: 'om.role',
  status: 'u.status, om.status',
} as const
type SortKey = keyof typeof SORT_COLUMNS

const DEFAULT_SIZE = 25
const MAX_SIZE = 100

type Props = {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; page?: string; size?: string }>
}

export default async function TeamPage({ searchParams }: Props) {
  const { principal } = await requireCapability('members.admin')
  const params = await searchParams

  const q = (params.q ?? '').trim()
  const sort: SortKey = params.sort && params.sort in SORT_COLUMNS ? (params.sort as SortKey) : 'name'
  const dir = params.dir === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const size = Math.min(MAX_SIZE, Math.max(1, Number.parseInt(params.size ?? String(DEFAULT_SIZE), 10) || DEFAULT_SIZE))
  const offset = (page - 1) * size

  const { rows: countRows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM public.operator_members om
     JOIN public.users u ON u.id = om.profile_id
     WHERE om.operator_id = $1
       AND ($2 = '' OR u.first_name ILIKE '%' || $2 || '%' OR u.last_name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')`,
    [principal.operatorId, q]
  )
  const total = Number.parseInt(countRows[0].count, 10)

  const { rows } = await pool.query<{
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    role: MemberRow['role']
    member_status: 'active' | 'suspended'
    user_status: 'invited' | 'active' | 'suspended'
  }>(
    `SELECT om.id, u.first_name, u.last_name, u.email, om.role,
            om.status AS member_status, u.status AS user_status
     FROM public.operator_members om
     JOIN public.users u ON u.id = om.profile_id
     WHERE om.operator_id = $1
       AND ($2 = '' OR u.first_name ILIKE '%' || $2 || '%' OR u.last_name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
     ORDER BY ${SORT_COLUMNS[sort]} ${dir === 'desc' ? 'DESC' : 'ASC'}
     LIMIT $3 OFFSET $4`,
    [principal.operatorId, q, size, offset]
  )

  const members: MemberRow[] = rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    role: r.role,
    memberStatus: r.member_status,
    userStatus: r.user_status,
  }))

  // Plain strings, not a function: a Server Component cannot pass functions to a Client Component.
  const sortHrefs = Object.fromEntries(
    (Object.keys(SORT_COLUMNS) as SortKey[]).map((key) => {
      const nextDir = sort === key && dir === 'asc' ? 'desc' : 'asc'
      const sp = new URLSearchParams({ ...(q ? { q } : {}), sort: key, dir: nextDir, size: String(size) })
      return [key, `/team?${sp.toString()}`]
    })
  ) as Record<SortKey, string>

  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + size, total)

  return (
    <div>
      <PageHeader title="Team" description={`${total} member${total === 1 ? '' : 's'} on this operator`} />

      <form action="/team" method="get" className="mb-4 flex items-center gap-2">
        {sort !== 'name' || dir !== 'asc' ? <input type="hidden" name="sort" value={sort} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="h-9 w-full max-w-xs rounded-lg border border-[var(--border)] px-3 text-sm"
        />
      </form>

      <Card className="p-0">
        {members.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={24} />}
            title="No members found"
            description={q ? 'Try a different search.' : 'Invite your first team member to get started.'}
          />
        ) : (
          <div className="p-4">
            <TeamClient members={members} sortHrefs={sortHrefs} sort={sort} dir={dir} />
          </div>
        )}
      </Card>

      {total > size && (
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>{from}-{to} of {total}</span>
          <div className="flex gap-2">
            <Link
              href={`/team?${new URLSearchParams({ ...(q ? { q } : {}), sort, dir, size: String(size), page: String(Math.max(1, page - 1)) }).toString()}`}
              className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
            >
              Previous
            </Link>
            <Link
              href={`/team?${new URLSearchParams({ ...(q ? { q } : {}), sort, dir, size: String(size), page: String(page + 1) }).toString()}`}
              className={`rounded-lg border border-[var(--border)] px-3 py-1.5 ${to >= total ? 'pointer-events-none opacity-40' : ''}`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
