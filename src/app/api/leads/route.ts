import { NextResponse, type NextRequest } from 'next/server'
import { pool } from '@/utils/db'
import { signSession, getSessionFromRequest, COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/utils/session'
import { slugify } from '@/utils/slug'
import { isReservedSlug } from '@/utils/companyLink'
import { rateLimit, clientIp } from '@/server/rateLimit'

const FLEET_SIZES = ['1-10', '11-50', '51-200', '200+']
const PAIN_POINTS = ['Inventory Management', 'Route Inefficiency', 'Revenue Tracking', 'Machine Downtime']
const SOLUTIONS = ['Excel/Pen & Paper', 'Nayax', 'Cantaloupe', 'Parlevel', 'Other']

/** Inserts under the first candidate slug that is still free; slug is unique */
async function insertLead(fields: string[], candidates: string[]) {
  for (const slug of candidates) {
    const { rows } = await pool.query(
      `INSERT INTO public.leads (full_name, email, company, fleet_size, pain_point, current_solution, slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [...fields, slug]
    )
    if (rows[0]) return { id: rows[0].id as string, slug }
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit('leads', clientIp(request.headers), 20)) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
    }

    const { fullName, email, company, fleetSize, painPoint, currentSolution, slug } = await request.json()

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !company?.trim() ||
      !FLEET_SIZES.includes(fleetSize) ||
      !PAIN_POINTS.includes(painPoint) ||
      !SOLUTIONS.includes(currentSolution)
    ) {
      return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 })
    }

    const trimmedSlug = slug?.trim()
    if (trimmedSlug && isReservedSlug(trimmedSlug)) {
      return NextResponse.json({ error: 'That link is reserved. Please choose a different slug.' }, { status: 400 })
    }
    let leadId: string | undefined
    // The slug this lead ends up owning: it goes into the session so exiting the
    // demo returns to their own link, even when they signed up from the bare page
    let leadSlug: string | undefined = trimmedSlug || undefined

    if (trimmedSlug) {
      const { rows } = await pool.query(
        `UPDATE public.leads SET full_name=$1, email=$2, company=$3, fleet_size=$4, pain_point=$5, current_solution=$6
         WHERE slug=$7
         RETURNING id`,
        [fullName.trim(), email.trim(), company.trim(), fleetSize, painPoint, currentSolution, trimmedSlug]
      )
      if (rows[0]) leadId = rows[0].id
    }

    if (!leadId) {
      // Submissions from the bare landing page carry no slug, so derive one from the
      // company: every lead ends up with an openable demo link in the admin table.
      const fields = [fullName.trim(), email.trim(), company.trim(), fleetSize, painPoint, currentSolution]
      let base = trimmedSlug || slugify(company) || 'demo'
      // A slugified company name can land on a reserved route name (e.g. "Map Co" -> "map");
      // suffix it exactly like a plain-slug collision so it never blocks a real route
      if (isReservedSlug(base)) base = `${base}-${Math.random().toString(36).slice(2, 6)}`
      // Another company may already own the plain slug, so keep a suffixed fallback
      const inserted = await insertLead(fields, [base, `${base}-${Math.random().toString(36).slice(2, 6)}`])
      if (!inserted) throw new Error(`could not allocate a slug for "${company.trim()}"`)
      leadId = inserted.id
      leadSlug = inserted.slug
    }

    const response = NextResponse.json({ ok: true, slug: leadSlug })

    // Never downgrade a signed-in user testing the form: leave their session
    // cookie untouched. `op` on a user session selects a tenant membership
    // (see operator.ts resolveUser) and has no cosmetic-slug field to reuse.
    const existing = await getSessionFromRequest(request)
    if (existing?.kind !== 'user') {
      const token = await signSession({ kind: 'prospect', sub: leadId!, slug: leadSlug! })
      response.cookies.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS)
    }
    return response
  } catch (err) {
    console.error('[api/leads]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
