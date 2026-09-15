import Link from 'next/link'
import { MarketingShell } from '@/components/marketing/MarketingShell'
import { Eye, Route, Sparkles, Check, X } from 'lucide-react'

export const metadata = { title: 'SmartVendingOS: The Smarter Way to Run Your Vending Business' }

const HIGHLIGHTS = [
  { Icon: Eye, title: 'Total Fleet Visibility', desc: "See every machine's inventory, revenue, and status on one live map." },
  { Icon: Route, title: 'Smart Route Optimization', desc: 'Plan, assign, and execute restock trips with turn-by-turn guidance for your field team.' },
  { Icon: Sparkles, title: 'AI-Powered Forecasting', desc: 'Know what will run out before it does. Get restock recommendations automatically.' },
]

const COMPARISON: { feature: string; micron: string; vendsoft: string; svos: string }[] = [
  { feature: 'Hardware-agnostic', micron: 'no', vendsoft: 'yes', svos: 'yes' },
  { feature: 'Mobile field app', micron: 'no', vendsoft: 'no', svos: 'yes' },
  { feature: 'Route optimization', micron: 'no', vendsoft: 'Basic', svos: 'Advanced + AI' },
  { feature: 'AI demand forecast', micron: 'no', vendsoft: 'no', svos: 'yes' },
  { feature: 'Loyalty & promotions', micron: 'no', vendsoft: 'no', svos: 'yes' },
  { feature: 'Financial reports', micron: 'no', vendsoft: 'Basic', svos: 'Full P&L + export' },
  { feature: 'Multi-currency', micron: 'no', vendsoft: 'no', svos: 'yes' },
  { feature: 'Pricing', micron: 'Free (limited)', vendsoft: '$99+/mo', svos: 'From $0/mo' },
]

function Cell({ v }: { v: string }) {
  if (v === 'yes') return <Check className="mx-auto h-4 w-4 text-emerald-600" />
  if (v === 'no') return <X className="mx-auto h-4 w-4 text-slate-300" />
  return <span className="text-xs text-slate-600">{v}</span>
}

export default function LandingPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          The Smarter Way to Run Your Vending Business
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Manage every machine, route, and dollar in one platform. Built for operators who are serious about growth.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-blue-700">
            Start Free
          </Link>
          <Link href="/login" className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50">
            Watch Demo
          </Link>
        </div>

        {/* Social proof */}
        <p className="mt-16 text-xs font-medium uppercase tracking-widest text-slate-400">
          Trusted by operators managing 500+ machines globally
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-lg font-bold text-slate-300">
          {['VendCo', 'SnackHub', 'FreshFleet', 'MarketBox', 'KioskOne', 'PantryGo'].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section id="features" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-20 md:grid-cols-3">
          {HIGHLIGHTS.map(({ Icon, title, desc }) => (
            <div key={title}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center text-2xl font-bold text-slate-900">How we compare</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-3 text-left font-medium">Feature</th>
                <th className="px-3 py-3 text-center font-medium">Micron</th>
                <th className="px-3 py-3 text-center font-medium">VendSoft</th>
                <th className="px-3 py-3 text-center font-semibold text-blue-600">SmartVendingOS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((r) => (
                <tr key={r.feature} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-700">{r.feature}</td>
                  <td className="px-3 py-3 text-center"><Cell v={r.micron} /></td>
                  <td className="px-3 py-3 text-center"><Cell v={r.vendsoft} /></td>
                  <td className="px-3 py-3 text-center bg-blue-50/50"><Cell v={r.svos} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-t border-slate-100 bg-slate-50 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Simple, transparent pricing</h2>
        <p className="mt-2 text-slate-600">Free · Starter · Pro · Enterprise</p>
        <Link href="/pricing" className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">
          See all plans →
        </Link>
      </section>
    </MarketingShell>
  )
}
