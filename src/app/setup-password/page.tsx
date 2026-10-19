import type { Metadata } from 'next'
import { Logo } from '@/components/ui/Logo'
import { pool } from '@/utils/db'
import { hashToken } from '@/server/invitation'
import { SetupPasswordForm } from './SetupPasswordForm'

// no-referrer: the invite token is in the URL and must not leak to any outbound request.
export const metadata: Metadata = { title: 'Set your password | SmartVendingOS', referrer: 'no-referrer' }

type Props = { searchParams: Promise<{ token?: string }> }

export default async function SetupPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  let valid = false
  if (token) {
    const { rows } = await pool.query(
      `SELECT 1 FROM public.invitation_tokens
       WHERE token_hash = $1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
      [hashToken(token)]
    )
    valid = rows.length > 0
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[var(--bg-page)] px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={80} className="shrink-0" />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Set your password</h1>
          {valid && (
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Choose a password to finish setting up your account.
            </p>
          )}
        </div>

        {token ? (
          <SetupPasswordForm token={token} initiallyValid={valid} />
        ) : (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600 border border-red-100">
            This link is invalid or has expired. Ask your administrator for a new one.
          </p>
        )}
      </div>
    </div>
  )
}
