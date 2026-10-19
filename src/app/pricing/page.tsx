'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tier = {
  name: string
  monthly: number | null
  annual: number | null
  subtitle: string
  cta: string
  highlight?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  { name: 'Free', monthly: 0, annual: 0, subtitle: 'Perfect for getting started', cta: 'Get Started Free',
    features: ['Up to 3 machines', 'Basic dashboard', 'Inventory tracking (manual)', 'Product catalog (50)', '1 user account', 'Email support'] },
  { name: 'Starter', monthly: 29, annual: 23, subtitle: 'For small operators growing their fleet', cta: 'Start Starter Trial',
    features: ['Up to 20 machines', 'Route & trip management', 'Planogram per machine', 'Purchase orders & expenses', '3 users (Admin, Technician)', 'CSV/Excel export', 'Chat support'] },
  { name: 'Pro', monthly: 79, annual: 63, subtitle: 'The complete platform for serious operators', cta: 'Start Pro Trial', highlight: true,
    features: ['Up to 100 machines', 'Full P&L, cash flow, mileage', 'Multi-currency support', '10 users · priority support'] },
  { name: 'Enterprise', monthly: null, annual: null, subtitle: 'For large operations and resellers', cta: 'Contact Sales',
    features: ['Unlimited machines & users', 'White-label branding', 'Dedicated account manager', 'Custom integrations (ERP, etc.)', 'SLA 99.9% uptime', 'SSO / SAML', 'API read + write'] },
]

const FAQ = [
  ['Can I change plans anytime?', 'Yes — upgrade or downgrade at any time; changes are prorated.'],
  ['What counts as a machine?', 'Any vending unit you track in the platform, regardless of hardware brand.'],
  ['Is there a free trial for paid plans?', 'Starter and Pro include a 14-day free trial, no card required.'],
  ['Do you support multiple currencies?', 'Yes — currency is configurable per machine and company on Pro and above.'],
  ['What hardware does it work with?', 'Any telemetry-capable machine (Micron, Crane, Wittern, Jofemar…) plus manual entry.'],
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">Pricing that scales with you</h1>

        {/* Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          <span className={cn(!annual && 'font-semibold text-slate-900', annual && 'text-slate-500')}>Monthly</span>
          <button
            onClick={() => setAnnual((a) => !a)}
            className="relative h-6 w-11 rounded-full bg-blue-600 transition-colors"
            aria-label="Toggle annual billing"
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', annual ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
          <span className={cn(annual && 'font-semibold text-slate-900', !annual && 'text-slate-500')}>
            Annual <span className="text-emerald-600">(20% off)</span>
          </span>
        </div>

        {/* Tiers */}
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {TIERS.map((t) => {
            const price = annual ? t.annual : t.monthly
            return (
              <div
                key={t.name}
                className={cn(
                  'relative flex flex-col rounded-2xl border bg-white p-6',
                  t.highlight ? 'border-blue-600 shadow-lg ring-1 ring-blue-600' : 'border-slate-200'
                )}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{t.subtitle}</p>
                <div className="mt-4 h-12">
                  {price === null ? (
                    <span className="text-2xl font-bold text-slate-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-slate-900">${price}</span>
                      <span className="text-sm text-slate-500">/mo</span>
                    </>
                  )}
                </div>
                <Link
                  href="/signup"
                  className={cn(
                    'mt-2 rounded-lg px-4 py-2.5 text-center text-sm font-medium',
                    t.highlight
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {t.cta}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          <dl className="mt-8 divide-y divide-slate-200">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-4">
                <dt className="font-medium text-slate-900">{q}</dt>
                <dd className="mt-1 text-sm text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </MarketingShell>
  )
}
