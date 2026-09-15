'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { ldaMachines, type MachineStatus } from '@/data/lda'
import { useTranslation } from '@/hooks/useTranslation'

const ROUTES = ['All', 'Route A - Paris Nord', 'Route B - Hamburg', 'Route C - Île-de-France Est']

export default function MachinesPage() {
  const t = useTranslation()
  const [search, setSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState('All')
  const [statusOverrides, setStatusOverrides] = useState<Record<string, MachineStatus>>({})

  const getStatus = (machine: (typeof ldaMachines)[number]): MachineStatus =>
    statusOverrides[machine.id] ?? machine.status

  const toggleStatus = (id: string, current: MachineStatus) => {
    setStatusOverrides((prev) => ({
      ...prev,
      [id]: current === 'online' ? 'offline' : 'online',
    }))
  }

  const filtered = ldaMachines.filter((m) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.location.toLowerCase().includes(q)
    const matchRoute = routeFilter === 'All' || m.route === routeFilter
    return matchSearch && matchRoute
  })

  const onlineCount = ldaMachines.filter((m) => getStatus(m) === 'online').length
  const offlineCount = ldaMachines.filter((m) => getStatus(m) === 'offline').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <PageHeader title="Machines" description="Manage your vending fleet" />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder={t.search + ' by name, ID, or location…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROUTES.map((r) => (
            <option key={r} value={r === 'All' ? 'All' : r}>
              {r === 'All' ? t.allRoutes : r}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t.machineQuantity}: {ldaMachines.length}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {onlineCount} {t.online}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          {offlineCount} {t.offline}
        </span>
      </div>

      {/* Machine list */}
      <div className="flex flex-col gap-3">
        {filtered.map((machine, idx) => {
          const status = getStatus(machine)
          const income = machine.revenueToday

          return (
            <Card key={machine.id} hover={false} className="px-4 py-4">
              <div className="flex items-center gap-4">
                {/* Sequential number */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-sm font-bold text-white shadow">
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--text-primary)] text-sm">
                      {machine.name}
                    </span>
                    <button
                      onClick={() => toggleStatus(machine.id, status)}
                      className="cursor-pointer"
                      title="Click to toggle status"
                    >
                      <Badge variant={status === 'online' ? 'success' : 'danger'}>
                        {status === 'online' ? t.online : t.offline}
                      </Badge>
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {machine.id} · {machine.model}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{machine.location}</p>
                  <p className="text-xs text-[var(--text-muted)]">{machine.route}</p>
                  <p className="text-xs mt-1">
                    <span className="text-[var(--text-muted)]">{t.incomeToday}: </span>
                    {income > 0 ? (
                      <span className="font-semibold text-[var(--text-primary)]">
                        ${income.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">$0.00</span>
                    )}
                  </p>
                </div>

                {/* Arrow link */}
                <Link
                  href={`/machines/${machine.id}`}
                  className="shrink-0 text-lg text-[var(--text-muted)] hover:text-blue-600 transition-colors font-bold"
                >
                  →
                </Link>
              </div>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--text-muted)]">
            No machines match your filters.
          </div>
        )}
      </div>
    </div>
  )
}
