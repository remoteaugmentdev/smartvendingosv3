import { NextResponse, type NextRequest } from 'next/server'
import { pool } from '@/utils/db'
import { authorizePlatformAdmin } from '@/server/operator'

export async function POST(request: NextRequest) {
  const admin = await authorizePlatformAdmin()
  if (!admin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  try {
    const { company, slug, message } = await request.json()

    if (!company?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 })
    }

    await pool.query(
      `INSERT INTO public.leads (company, slug, custom_message) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET company = EXCLUDED.company, custom_message = EXCLUDED.custom_message`,
      [company.trim(), slug.trim(), message?.trim() || null]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/leads/seed]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
