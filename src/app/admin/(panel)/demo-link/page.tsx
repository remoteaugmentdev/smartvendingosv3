import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { pool } from '@/utils/db'
import { requirePlatformAdmin } from '@/server/operator'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoLinkGenerator } from './DemoLinkGenerator'

export const dynamic = 'force-dynamic'

type RecentLink = {
  company: string
  slug: string
  created_at: string
}

async function getRecentLinks(): Promise<RecentLink[]> {
  try {
    const { rows } = await pool.query(
      `SELECT company, slug, created_at
       FROM public.leads
       WHERE slug IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 8`
    )
    return rows
  } catch (err) {
    // Table is created by the first form submission; until then there are simply no leads
    if ((err as { code?: string }).code === '42P01') return []
    throw err
  }
}

export default async function DemoLinkPage() {
  await requirePlatformAdmin()
  const recentLinks = await getRecentLinks()

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <ArrowLeft size={15} /> Back to Leads
      </Link>

      <PageHeader
        title="Demo Link"
        description="Type a company name to get a personalized demo link to send to that client."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DemoLinkGenerator />

        <Card hover={false}>
          <CardHeader>
            <CardTitle>Recently generated links</CardTitle>
          </CardHeader>
          {recentLinks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Links you generate will show up here.</p>
          ) : (
            <ul className="space-y-3">
              {recentLinks.map((l) => (
                <li key={l.slug} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]">{l.company}</p>
                    <a
                      href={`/${l.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline"
                    >
                      /{l.slug}
                    </a>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {format(new Date(l.created_at), 'MMM d, HH:mm')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
