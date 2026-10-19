'use server'

import { pool } from '@/utils/db'
import { authorizePlatformAdmin } from '@/server/operator'

export interface DemoUser {
  id: string
  email: string
  label: string
  expires_at: string
  created_at: string
}

export async function createDemoAccount(params: {
  email: string
  password: string
  label: string
  expiresAt: string
}): Promise<{ error?: string }> {
  const admin = await authorizePlatformAdmin()
  if (!admin) return { error: 'Not authorized' }

  try {
    await pool.query(
      `INSERT INTO public.users (email, password_hash, status, platform_role, label, expires_at)
       VALUES (lower(btrim($1)), crypt($2, gen_salt('bf')), 'active', 'demo', $3, $4)`,
      [params.email, params.password, params.label, params.expiresAt]
    )
    return {}
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}

export async function revokeDemoAccount(userId: string): Promise<{ error?: string }> {
  const admin = await authorizePlatformAdmin()
  if (!admin) return { error: 'Not authorized' }

  await pool.query(`DELETE FROM public.users WHERE id = $1 AND platform_role = 'demo'`, [userId])
  return {}
}

export async function listDemoAccounts(): Promise<{ users?: DemoUser[]; error?: string }> {
  const admin = await authorizePlatformAdmin()
  if (!admin) return { error: 'Not authorized' }

  try {
    const res = await pool.query(`
      SELECT id, email, COALESCE(label, email) AS label, expires_at, created_at
      FROM public.users
      WHERE platform_role = 'demo'
      ORDER BY created_at DESC
    `)
    return { users: res.rows }
  } catch (err: unknown) {
    return { error: (err as Error).message }
  }
}
