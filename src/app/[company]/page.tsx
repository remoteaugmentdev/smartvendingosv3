import { notFound } from 'next/navigation'
import { pool } from '@/utils/db'
import { isReservedSlug } from '@/utils/companyLink'
import HomePage from '../page'

type Props = {
  params: Promise<{ company: string }>
}

type LeadState = { customText?: string; alreadyFilled: boolean }

async function getLeadState(slug: string): Promise<LeadState> {
  const { rows } = await pool.query<{ custom_message: string | null; full_name: string | null; email: string | null }>(
    `SELECT custom_message, full_name, email FROM public.leads WHERE slug = $1`,
    [slug]
  )
  const row = rows[0]
  return { customText: row?.custom_message ?? undefined, alreadyFilled: !!(row?.full_name && row?.email) }
}

// Note: a slug matching a reserved top-level route name (e.g. "dashboard",
// "settings", "login") will resolve to that static route instead of here,
// since Next.js resolves static segments before dynamic ones.
export default async function CompanyLandingPage({ params }: Props) {
  const { company } = await params
  if (isReservedSlug(company)) notFound()
  const displayName = decodeURIComponent(company)
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
  const { customText, alreadyFilled } = await getLeadState(company)

  return (
    <HomePage companyName={displayName} customText={customText} slug={company} alreadyFilled={alreadyFilled} />
  )
}
