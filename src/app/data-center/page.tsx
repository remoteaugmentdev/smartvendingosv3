'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table'
import { PageHeader } from '@/components/layout/PageHeader'
import { BarChartWrapper } from '@/components/charts/BarChartWrapper'
import { cn } from '@/utils/cn'
import {
  ldaMachines,
  ldaProducts,
  ldaWeeklyRevenue,
  ldaMonthlySales,
  ldaSlots,
} from '@/data/lda'
import { ChevronDown, RotateCcw, CalendarDays } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type MainTab = 'ranking' | 'report'
type RankingSubTab = 'product' | 'machine' | 'machine_product'
type DatePill = '3months' | 'this_month' | 'this_week' | 'yesterday' | 'today'

function ProductRanking() {
  const sorted = [...ldaProducts].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const topRevenue = sorted[0]?.totalRevenue ?? 1
  return (
    <div className="space-y-3">
      {sorted.map((p, idx) => {
        const pct = Math.round((p.totalRevenue / topRevenue) * 100)
        return (
          <div key={p.id} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {idx + 1}
            </span>
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'][idx % 8] }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                <div className="flex shrink-0 items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">${p.totalRevenue.toFixed(2)}</span>
                  <span>{p.totalSales} sold</span>
                </div>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MachineRanking({ t }: { t: ReturnType<typeof useTranslation> }) {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th className="hidden sm:table-cell">{t.rank}</Th>
          <Th>{t.machine}</Th>
          <Th className="hidden sm:table-cell">{t.location}</Th>
          <Th>{t.revenue}</Th>
          <Th className="hidden md:table-cell">{t.transactions}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {ldaMachines
          .map((m) => ({
            ...m,
            totalSales: m.revenueMonthly.reduce((s, v) => s + v, 0),
          }))
          .sort((a, b) => b.totalSales - a.totalSales)
          .map((m, idx) => (
            <Tr key={m.id}>
              <Td className="hidden sm:table-cell">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {idx + 1}
                </span>
              </Td>
              <Td className="font-medium">{m.name}</Td>
              <Td className="hidden sm:table-cell text-[var(--text-muted)]">{m.location}</Td>
              <Td className="font-semibold">${m.totalSales.toLocaleString()}</Td>
              <Td className="hidden md:table-cell">{m.revenueMonthly.filter((v) => v > 0).length * 18}</Td>
            </Tr>
          ))}
      </Tbody>
    </Table>
  )
}

function MachineProductRanking({ t }: { t: ReturnType<typeof useTranslation> }) {
  const rows = ldaSlots.map((slot) => {
    const machine = ldaMachines.find((m) => m.id === slot.machineId)
    const product = ldaProducts.find((p) => p.id === slot.productId)
    const qtySold = product?.totalSales ?? 0
    const revenue = slot.price * qtySold
    const machineSlots = ldaSlots.filter((s) => s.machineId === slot.machineId)
    const machineTotal = machineSlots.reduce((sum, s) => {
      const pr = ldaProducts.find((p) => p.id === s.productId)
      return sum + s.price * (pr?.totalSales ?? 0)
    }, 0)
    const pct = machineTotal > 0 ? Math.round((revenue / machineTotal) * 100) : 0
    return { slot, machine, product, qtySold, revenue, pct }
  })

  return (
    <Table>
      <Thead>
        <Tr>
          <Th className="hidden sm:table-cell">{t.machine}</Th>
          <Th>{t.product}</Th>
          <Th className="hidden sm:table-cell">{t.qtySold}</Th>
          <Th>{t.revenue}</Th>
          <Th className="hidden md:table-cell">% of Machine</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map(({ slot, machine, product, qtySold, revenue, pct }) => (
          <Tr key={slot.id}>
            <Td className="hidden sm:table-cell text-xs text-[var(--text-muted)]">{machine?.name ?? slot.machineId}</Td>
            <Td className="font-medium">{product?.name ?? slot.product}</Td>
            <Td className="hidden sm:table-cell">{qtySold}</Td>
            <Td>${revenue.toFixed(2)}</Td>
            <Td className="hidden md:table-cell">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}

export default function DataCenterPage() {
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState<MainTab>('ranking')
  const [rankingSubTab, setRankingSubTab] = useState<RankingSubTab>('product')
  const [activeMachine, setActiveMachine] = useState('all')
  const [activeDatePill, setActiveDatePill] = useState<DatePill | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeRoute, setActiveRoute] = useState('all')
  const [toast, setToast] = useState('')

  const DATE_PILLS: { id: DatePill; label: string }[] = [
    { id: '3months', label: t.past3Months },
    { id: 'this_month', label: t.thisMonth },
    { id: 'this_week', label: t.thisWeek },
    { id: 'yesterday', label: t.yesterday },
    { id: 'today', label: t.today },
  ]

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader title="Data Center" description="Sales analytics and reporting" />

      {/* Main Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([['ranking', t.salesRanking], ['report', t.salesReport]] as [MainTab, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* ── SALES RANKING TAB ── */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              {/* Machine dropdown */}
              <div className="relative">
                <select
                  value={activeMachine}
                  onChange={(e) => setActiveMachine(e.target.value)}
                  className="h-8 appearance-none rounded-lg border border-[var(--border)] bg-white pl-3 pr-8 text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">{t.allMachines}</option>
                  {ldaMachines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>

              {/* Date pills */}
              {DATE_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() =>
                    setActiveDatePill(activeDatePill === pill.id ? null : pill.id)
                  }
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    activeDatePill === pill.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-[var(--text-muted)] hover:bg-slate-200'
                  )}
                >
                  {pill.label}
                </button>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setActiveMachine('all'); setActiveDatePill(null) }}
              >
                <RotateCcw className="h-3 w-3" />
                {t.reset}
              </Button>
            </div>
          </Card>

          {/* Ranking Sub-tabs */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                ['product', t.productRanking],
                ['machine', t.machineRanking],
                ['machine_product', t.machineProductRanking],
              ] as [RankingSubTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setRankingSubTab(id)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                  rankingSubTab === id
                    ? 'bg-white text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Card>
            {rankingSubTab === 'product' && <ProductRanking />}
            {rankingSubTab === 'machine' && <MachineRanking t={t} />}
            {rankingSubTab === 'machine_product' && <MachineProductRanking t={t} />}
          </Card>
        </div>
      )}

      {/* ── SALES REPORT TAB ── */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          {/* Date range + Route */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <CalendarDays className="h-4 w-4" />
                <span>From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                />
                <span>To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              <div className="relative ml-auto">
                <select
                  value={activeRoute}
                  onChange={(e) => setActiveRoute(e.target.value)}
                  className="h-8 appearance-none rounded-lg border border-[var(--border)] bg-white pl-3 pr-8 text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">{t.allRoutes}</option>
                  <option value="rt-a">Route A</option>
                  <option value="rt-b">Route B</option>
                  <option value="rt-c">Route C</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </div>
          </Card>

          {/* Statistical Result */}
          <Card>
            <CardHeader>
              <CardTitle>{t.statisticalResult}</CardTitle>
            </CardHeader>
            <div className="mb-1 text-3xl font-bold text-[var(--text-primary)]">$1,240.50</div>
            <div className="text-xs text-[var(--text-muted)]">
              $1,240.50 = $1,305.00 − $64.50
            </div>
          </Card>

          {/* Channel Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t.channelDetails}</CardTitle>
            </CardHeader>
            <Table>
              <Thead>
                <Tr>
                  <Th>{t.channel}</Th>
                  <Th>{t.transactions}</Th>
                  <Th>{t.amount}</Th>
                  <Th>%</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td className="font-medium">Card (NFC/Chip)</Td>
                  <Td>42</Td>
                  <Td>$892.00</Td>
                  <Td>
                    <Badge variant="info">72%</Badge>
                  </Td>
                </Tr>
                <Tr>
                  <Td className="font-medium">QR Code</Td>
                  <Td>18</Td>
                  <Td>$280.50</Td>
                  <Td>
                    <Badge variant="default">23%</Badge>
                  </Td>
                </Tr>
                <Tr>
                  <Td className="font-medium">Cash</Td>
                  <Td>4</Td>
                  <Td>$68.00</Td>
                  <Td>
                    <Badge variant="default">5%</Badge>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </Card>

          {/* Daily Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t.dailySales}</CardTitle>
            </CardHeader>
            <BarChartWrapper
              data={ldaWeeklyRevenue}
              xKey="day"
              bars={[{ key: 'revenue', label: t.revenue, color: '#2563EB' }]}
              height={220}
            />
          </Card>

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t.monthlyTrend}</CardTitle>
            </CardHeader>
            <BarChartWrapper
              data={ldaMonthlySales}
              xKey="month"
              bars={[
                { key: 'sales', label: 'Sales', color: '#2563EB' },
                { key: 'commission', label: 'Commission', color: '#64748B' },
                { key: 'cogs', label: 'COGS', color: '#F59E0B' },
                { key: 'refunds', label: 'Refunds', color: '#EF4444' },
              ]}
              height={220}
              showLegend
            />
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
