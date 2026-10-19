import { pool } from '@/utils/db'
import { requirePlatformAdmin } from '@/server/operator'

export const dynamic = 'force-dynamic'

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export async function GET() {
  await requirePlatformAdmin()

  let rows: Record<string, unknown>[] = []
  try {
    ;({ rows } = await pool.query(
      `SELECT full_name, email, company, fleet_size, pain_point, current_solution, created_at
       FROM public.leads
       ORDER BY created_at DESC`
    ))
  } catch (err) {
    // Table is created by the first form submission; until then export is just the header row
    if ((err as { code?: string }).code !== '42P01') throw err
  }

  const header = ['Name', 'Email', 'Company', 'Fleet size', 'Biggest challenge', 'Current solution', 'Submitted']
  const csv = [
    header,
    ...rows.map((r) => [r.full_name, r.email, r.company, r.fleet_size, r.pain_point, r.current_solution, r.created_at]),
  ]
    .map((line) => line.map(esc).join(','))
    .join('\r\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
