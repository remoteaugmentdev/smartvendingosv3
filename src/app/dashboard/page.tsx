'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table'
import { BarChartWrapper } from '@/components/charts/BarChartWrapper'
import { AreaChartWrapper } from '@/components/charts/AreaChartWrapper'
import { DonutChartWrapper } from '@/components/charts/DonutChartWrapper'
import { cn } from '@/utils/cn'
import {
  ldaMachines,
  ldaProducts,
  ldaOrders,
  ldaWeeklyRevenue,
  ldaMonthlySales,
} from '@/data/lda'
import { useTranslation } from '@/hooks/useTranslation'

// ─── Derived constants ────────────────────────────────────────────────────────
const lowStockProducts = ldaProducts.filter((p) => p.stock <= p.reorderLevel)

const recentOrders = [...ldaOrders]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 6)

const topProducts = [...ldaProducts]
  .sort((a, b) => b.totalRevenue - a.totalRevenue)
  .slice(0, 7)

const monthly = ldaMonthlySales[ldaMonthlySales.length - 1]
const grossRevenue = monthly.sales
const netIncome = monthly.sales - monthly.commission - monthly.cogs - monthly.refunds
const weeklyTotal = ldaWeeklyRevenue.reduce((s, d) => s + d.revenue, 0)
const onlineCount = ldaMachines.filter((m) => m.status !== 'offline').length
const offlineCount = ldaMachines.filter((m) => m.status === 'offline').length
const pendingRestocks = ldaMachines.filter((m) => m.shortageRate > m.shortageThreshold).length

const plBarData = [
  { label: 'Gross', value: monthly.sales },
  { label: 'COGS', value: monthly.cogs },
  { label: 'Commission', value: monthly.commission },
  { label: 'Net', value: netIncome },
]

const donutData = [
  { name: 'COGS', value: monthly.cogs, color: '#2563EB' },
  { name: 'Commission', value: monthly.commission, color: '#64748B' },
  { name: 'Refunds', value: monthly.refunds, color: '#EF4444' },
  { name: 'Net', value: netIncome, color: '#10B981' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
}

function fmtEur(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const t = useTranslation()
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [productSort, setProductSort] = useState<'revenue' | 'qty'>('revenue')
  const [deviceSearch, setDeviceSearch] = useState('')
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all')

  // Reorder alert items not yet dismissed
  const activeAlerts = lowStockProducts.filter((p) => !dismissedIds.includes(p.id))

  // Filtered machines
  const filteredMachines = ldaMachines.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      m.location.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      m.id.includes(deviceSearch)
    const matchStatus = deviceStatusFilter === 'all' || m.status === deviceStatusFilter
    return matchSearch && matchStatus
  })

  // CSV export
  function exportCsv() {
    const header = ['Name', 'Location', 'Machine Code', 'Status', 'Last Ping', 'Today Revenue', 'Expiry Date']
    const rows = filteredMachines.map((m) => [
      m.name,
      m.location,
      m.id,
      m.status,
      m.lastPing,
      m.revenueToday.toString(),
      m.expiryDate,
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'devices.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">

      {/* ── Section 1: Reorder Alert Banner ─────────────────────────────── */}
      {activeAlerts.length > 0 && (
        <div className="flex items-start justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            <span className="mr-1">⚠</span>
            <span className="font-bold">{t.reorderAlert}:</span>{' '}
            {activeAlerts.map((p, i) => (
              <span key={p.id}>
                <button
                  onClick={() => setDismissedIds((prev) => [...prev, p.id])}
                  className="underline decoration-dotted hover:text-amber-900 transition-colors"
                >
                  {p.name}
                </button>
                {i < activeAlerts.length - 1 && ', '}
              </span>
            ))}
          </p>
          <button
            onClick={() => setDismissedIds(lowStockProducts.map((p) => p.id))}
            className="ml-4 text-amber-600 hover:text-amber-900 text-lg leading-none shrink-0"
            aria-label="Dismiss all"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Section 2: KPI Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">

        {/* 1 – Gross Revenue */}
        <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] border-t-2 border-blue-500">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Gross Revenue (MTD)</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{fmtEur(grossRevenue)}</p>
          <Badge variant="success" className="mt-2">+21.2%</Badge>
        </div>

        {/* 2 – Active Machines */}
        <Link href="/machines" className="block">
          <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-emerald-500">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Active Machines</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{onlineCount} / {ldaMachines.length} online</p>
            <Badge variant="warning" className="mt-2">{offlineCount} offline</Badge>
          </div>
        </Link>

        {/* 3 – Products Mapped */}
        <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] border-t-2 border-blue-400">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Net Income (MTD)</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{fmtEur(netIncome)}</p>
          <Badge variant="success" className="mt-2">+18.5%</Badge>
        </div>

        {/* 4 – Pending SIRETs */}
        <Link href="/inventory" className="block">
          <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-amber-400">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Pending Restocks</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{pendingRestocks} machines</p>
            <Badge variant="warning" className="mt-2">Below threshold</Badge>
          </div>
        </Link>

        {/* 5 – Active Producers */}
        <Link href="/trips" className="block">
          <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-emerald-400">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Total Trips (MTD)</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">38</p>
            <Badge variant="info" className="mt-2">6 this week</Badge>
          </div>
        </Link>

        {/* 6 – Low Stock Alerts */}
        <Link href="/inventory" className="block">
          <div className="rounded-xl bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 border-t-2 border-red-500">
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Low Stock Alerts</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{lowStockProducts.length} products</p>
            <Badge variant="danger" className="mt-2">{t.actionNeeded}</Badge>
          </div>
        </Link>

      </div>

      {/* ── Section 3: P&L + Weekly Revenue ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Left 40% — P&L Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t.profitLoss}</CardTitle>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.currentMonth}</p>
            </div>
          </CardHeader>
          <div className="mb-3">
            <p className="text-3xl font-bold text-emerald-600">{fmtEur(netIncome)}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{t.netRevenue}</p>
          </div>
          <BarChartWrapper
            data={plBarData}
            bars={[{ key: 'value', label: 'Amount ($)', color: '#2563EB' }]}
            xKey="label"
            height={160}
          />
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Net = Gross ({fmtEur(grossRevenue)}) − COGS ({fmtEur(monthly.cogs)}) − Commission ({fmtEur(monthly.commission)})
          </p>
        </Card>

        {/* Right 60% — Weekly Revenue */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t.weeklyRevenue}</CardTitle>
          </CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-3xl font-bold text-[var(--text-primary)]">{fmtEur(weeklyTotal)}</p>
            <Badge variant="success">+12.5%</Badge>
          </div>
          <AreaChartWrapper
            data={ldaWeeklyRevenue}
            dataKey="revenue"
            xKey="day"
            color="#2563EB"
            height={180}
          />
        </Card>

      </div>

      {/* ── Section 4: Recent Orders + Donut ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-11">

        {/* Left 55% — Recent Orders */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>{t.recentOrders}</CardTitle>
            <Link
              href="/orders"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {t.viewAllOrders}
            </Link>
          </CardHeader>
          <Table>
            <Thead>
              <Tr>
                <Th>{t.product}</Th>
                <Th className="hidden sm:table-cell">{t.devices}</Th>
                <Th>{t.status}</Th>
                <Th className="hidden sm:table-cell">{t.refunded}</Th>
                <Th>{t.amount}</Th>
                <Th className="hidden md:table-cell">Time</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentOrders.map((o) => (
                <Tr key={o.id}>
                  <Td><div className="font-medium w-[90px] truncate">{o.product}</div></Td>
                  <Td className="hidden sm:table-cell font-mono text-xs text-[var(--text-muted)]">{o.deviceId}</Td>
                  <Td>
                    <Badge
                      variant={
                        o.status === 'completed'
                          ? 'success'
                          : o.status === 'refunded'
                          ? 'info'
                          : 'danger'
                      }
                    >
                      {o.status === 'completed' ? t.completed : o.status === 'refunded' ? t.refunded : t.failed}
                    </Badge>
                  </Td>
                  <Td className="hidden sm:table-cell text-xs text-[var(--text-muted)]">
                    {o.refund === 'refunded' ? (
                      <Badge variant="info">{t.refunded}</Badge>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </Td>
                  <Td className="font-medium">{fmtEur(o.amount)}</Td>
                  <Td className="hidden md:table-cell text-xs text-[var(--text-muted)]">
                    {fmtDate(o.date)} {fmtTime(o.date)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>

        {/* Right 45% — Revenue Breakdown Donut */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>{t.revenueBreakdown}</CardTitle>
          </CardHeader>
          <DonutChartWrapper data={donutData} height={200} />
          <div className="mt-3 space-y-1.5">
            {donutData.map((seg) => (
              <div key={seg.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[var(--text-muted)]">{seg.name}</span>
                </div>
                <span className="font-semibold text-[var(--text-primary)]">{fmtEur(seg.value)}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      {/* ── Section 5: Top Products + Top Machines ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Left — Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t.topProducts}</CardTitle>
            <div className="flex gap-1">
              <button
                onClick={() => setProductSort('revenue')}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  productSort === 'revenue'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--text-muted)] hover:bg-slate-100'
                )}
              >
                Sales $
              </button>
              <button
                onClick={() => setProductSort('qty')}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  productSort === 'qty'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--text-muted)] hover:bg-slate-100'
                )}
              >
                Qty
              </button>
            </div>
          </CardHeader>
          <Table>
            <Thead>
              <Tr>
                <Th className="hidden sm:table-cell">#</Th>
                <Th>{t.name}</Th>
                <Th className="hidden sm:table-cell">Qty Sold</Th>
                <Th>Revenue</Th>
                <Th className="hidden md:table-cell w-24">Progress</Th>
              </Tr>
            </Thead>
            <Tbody>
              {[...topProducts]
                .sort((a, b) =>
                  productSort === 'revenue'
                    ? b.totalRevenue - a.totalRevenue
                    : b.totalSales - a.totalSales
                )
                .map((p, i) => {
                  const maxRev = topProducts[0].totalRevenue
                  const pct = Math.round((p.totalRevenue / maxRev) * 100)
                  return (
                    <Tr key={p.id}>
                      <Td className="hidden sm:table-cell text-[var(--text-muted)] font-medium">{i + 1}</Td>
                      <Td><div className="font-medium w-[100px] truncate">{p.name}</div></Td>
                      <Td className="hidden sm:table-cell text-[var(--text-muted)]">{p.totalSales}</Td>
                      <Td className="font-medium">{fmtEur(p.totalRevenue)}</Td>
                      <Td className="hidden md:table-cell">
                        <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
            </Tbody>
          </Table>
        </Card>

        {/* Right — Top Machines */}
        <Card>
          <CardHeader>
            <CardTitle>{t.machinePerformance}</CardTitle>
          </CardHeader>
          <Table>
            <Thead>
              <Tr>
                <Th>{t.machine}</Th>
                <Th className="hidden sm:table-cell">{t.location}</Th>
                <Th>{t.todayRevenue}</Th>
                <Th>{t.status}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ldaMachines.map((m) => (
                <Tr key={m.id}>
                  <Td><div className="font-medium w-[100px] truncate">{m.name}</div></Td>
                  <Td className="hidden sm:table-cell"><div className="text-xs text-[var(--text-muted)] w-[120px] truncate">{m.location}</div></Td>
                  <Td className="font-medium whitespace-nowrap">{fmtEur(m.revenueToday)}</Td>
                  <Td>
                    <Badge variant={m.status === 'online' ? 'success' : m.status === 'warning' ? 'warning' : 'danger'}>
                      {m.status === 'online' ? t.online : t.offline}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>

      </div>

      {/* ── Section 6: Devices Table (full width) ───────────────────────── */}
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
          <CardTitle>{t.devices}</CardTitle>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              placeholder={t.searchDevice}
              className="h-8 flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={deviceStatusFilter}
              onChange={(e) => setDeviceStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="online">{t.online}</option>
              <option value="offline">{t.offline}</option>
              <option value="warning">Warning</option>
            </select>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              {t.exportCsv}
            </Button>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>{t.name}</Th>
              <Th className="hidden sm:table-cell">{t.location}</Th>
              <Th className="hidden md:table-cell">Machine Code</Th>
              <Th>{t.status}</Th>
              <Th className="hidden md:table-cell">{t.lastPing}</Th>
              <Th>{t.todayRevenue}</Th>
              <Th className="hidden lg:table-cell">{t.expiryDate}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredMachines.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  No devices match your filters.
                </Td>
              </Tr>
            ) : (
              filteredMachines.map((m) => (
                <Tr key={m.id}>
                  <Td><div className="font-medium w-[100px] truncate">{m.name}</div></Td>
                  <Td className="hidden sm:table-cell"><div className="text-xs text-[var(--text-muted)] w-[120px] truncate">{m.location}</div></Td>
                  <Td className="hidden md:table-cell font-mono text-xs">{m.id}</Td>
                  <Td>
                    <Badge
                      variant={
                        m.status === 'online'
                          ? 'success'
                          : m.status === 'warning'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {m.status === 'online' ? t.online : t.offline}
                    </Badge>
                  </Td>
                  <Td className="hidden md:table-cell text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {fmtDate(m.lastPing)} {fmtTime(m.lastPing)}
                  </Td>
                  <Td className="font-medium whitespace-nowrap">{fmtEur(m.revenueToday)}</Td>
                  <Td className="hidden lg:table-cell text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(m.expiryDate).toLocaleDateString('en-US')}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>

    </div>
  )
}
