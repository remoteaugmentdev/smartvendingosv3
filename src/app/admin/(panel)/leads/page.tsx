import { format, isAfter, subDays } from 'date-fns'
import { Download } from 'lucide-react'
import { pool } from '@/utils/db'
import { requirePlatformAdmin } from '@/server/operator'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { LeadsChart, LeadsTable, type Lead } from './LeadsTable'

export const metadata = { title: 'Leads — SmartVendingOS' }
export const dynamic = 'force-dynamic'

const HIGH_PRIORITY_FLEETS = ['51-200', '200+']

async function getLeads(): Promise<Lead[]> {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, company, fleet_size, pain_point, current_solution, created_at, slug, custom_message
       FROM public.leads
       ORDER BY created_at DESC`
    )
    return rows
  } catch (err) {
    // Table is created by the first form submission; until then there are simply no leads
    if ((err as { code?: string }).code === '42P01') return []
    throw err
  }
}

// Buckets leads into the last 7 calendar days (oldest to newest) for the trend chart
function bucketLast7Days(leads: Lead[]) {
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))
  return days.map((d) => {
    const key = format(d, 'yyyy-MM-dd')
    return {
      day: format(d, 'EEE'),
      count: leads.filter((l) => format(new Date(l.created_at), 'yyyy-MM-dd') === key).length,
    }
  })
}

export default async function AdminLeadsPage() {
  await requirePlatformAdmin()
  const leads = await getLeads()

  const highPriorityCount = leads.filter((l) => !!l.fleet_size && HIGH_PRIORITY_FLEETS.includes(l.fleet_size)).length
  const sevenDaysAgo = subDays(new Date(), 7)
  const recentCount = leads.filter((l) => isAfter(new Date(l.created_at), sevenDaysAgo)).length
  const withLinkCount = leads.filter((l) => l.slug).length
  const chartData = bucketLast7Days(leads)

  return (
    <div className="space-y-6">
      <PageHeader title="Demo Leads" description="People who requested access to the interactive demo">
        {/* ponytail: Button renders <button> only, so this <a> copies its primary+md classes */}
        <a
          href="/admin/leads/export"
          download
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 px-4 text-sm font-medium text-white shadow-md shadow-blue-200 transition-all hover:from-blue-600 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98]"
        >
          <Download size={15} />
          Export CSV
        </a>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-blue-500">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Total leads</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{leads.length}</p>
        </div>
        <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-amber-400">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">High priority</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{highPriorityCount}</p>
          <Badge variant="warning" className="mt-2">51+ fleet</Badge>
        </div>
        <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-emerald-500">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Last 7 days</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{recentCount}</p>
        </div>
        <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-violet-400">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">With demo link</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{withLinkCount}</p>
        </div>
      </div>

      <LeadsChart data={chartData} />

      <LeadsTable leads={leads} />
    </div>
  )
}
