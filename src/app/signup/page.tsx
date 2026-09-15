'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { Check } from 'lucide-react'

const PERKS = ['Up to 3 machines free forever', 'No credit card required', 'Upgrade anytime']

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-2 md:items-center">
        {/* Pitch */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Start free in minutes</h1>
          <p className="mt-3 text-slate-600">
            Create your SmartVendingOS account and manage your first machines today.
          </p>
          <ul className="mt-6 space-y-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-emerald-600" /> {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Account created!</h2>
              <p className="mt-1 text-sm text-slate-600">Your Free workspace is ready.</p>
              <Link href="/login" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                Go to Sign In →
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-slate-900">Create your account</h2>
              {[
                { label: 'Full name', type: 'text', ph: 'Alex Johnson' },
                { label: 'Work email', type: 'email', ph: 'you@company.com' },
                { label: 'Company name', type: 'text', ph: 'Peak Vending Solutions' },
                { label: 'Password', type: 'password', ph: '••••••••' },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
                  <input
                    type={f.type}
                    required
                    placeholder={f.ph}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              ))}
              <button type="submit" className="h-10 w-full rounded-lg bg-blue-600 font-medium text-white hover:bg-blue-700">
                Start Free
              </button>
              <p className="text-center text-xs text-slate-500">
                Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </MarketingShell>
  )
}
