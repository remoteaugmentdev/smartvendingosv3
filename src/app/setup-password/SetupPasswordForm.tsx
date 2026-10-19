'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { setupPassword, type SetupPasswordData } from './actions'
import type { ActionResult } from '@/server/audit'

export function SetupPasswordForm({ token, initiallyValid }: { token: string; initiallyValid: boolean }) {
  // ponytail: freeze validity at mount so a post-submit server refresh (token now
  // consumed) can't flip this back to "invalid" out from under a just-shown success state.
  const [valid] = useState(initiallyValid)
  const initialState: ActionResult<SetupPasswordData> | null = null
  const [state, formAction, pending] = useActionState(setupPassword, initialState)

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={40} />
        <p className="text-sm text-[var(--text-primary)]">Your password has been set.</p>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shadow-md hover:from-blue-600 hover:to-blue-800"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  if (!valid) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600 border border-red-100">
        This link is invalid or has expired. Ask your administrator for a new one.
      </p>
    )
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {}

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="h-12 w-full rounded-xl border-0 bg-slate-100 px-4 text-sm text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
        {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium text-[var(--text-primary)]">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="h-12 w-full rounded-xl border-0 bg-slate-100 px-4 text-sm text-[var(--text-primary)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
        {fieldErrors.confirm && <p className="text-xs text-red-600">{fieldErrors.confirm}</p>}
      </div>

      {fieldErrors.token && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">
          {fieldErrors.token}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:from-blue-600 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Setting password…' : 'Set password'}
      </button>
    </form>
  )
}
