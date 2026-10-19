'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table'
import { BarChartWrapper } from '@/components/charts/BarChartWrapper'
import { cn } from '@/utils/cn'
import { ArrowLeft } from 'lucide-react'
import { ldaMachines, ldaSlots, ldaOrders, ldaAlerts } from '@/data/lda'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'

type Tab = 'general' | 'planogram' | 'orders' | 'maintenance' | 'energy' | 'settings'
const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'planogram', label: 'Planogram' },
  { key: 'orders', label: 'Orders' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'energy', label: 'Energy' },
  { key: 'settings', label: 'Settings' },
]

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']

function statusVariant(s: string) {
  return s === 'online' ? 'success' : s === 'warning' ? 'warning' : 'danger'
}

function fillColor(pct: number) {
  if (pct > 50) return 'bg-emerald-500'
  if (pct >= 20) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [tab, setTab] = useState<Tab>('general')

  const machine = ldaMachines.find((m) => m.id === id)
  if (!machine) notFound()

  const slots = ldaSlots.filter((s) => s.machineId === id)
  const orders = ldaOrders.filter((o) => o.deviceId === id)
  const alerts = ldaAlerts.filter((a) => a.machine === id)

  const fillPct = machine.capacity ? Math.round((machine.inventory / machine.capacity) * 100) : 0
  const revenueData = MONTHS.map((month, i) => ({ month, value: machine.revenueMonthly[i] ?? 0 }))
  const energyData = MONTHS.map((month, i) => ({ month, value: +(machine.powerConsumption * (0.9 + i * 0.03)).toFixed(2) }))

  const totalCap = slots.reduce((s, x) => s + x.capacity, 0)
  const totalInv = slots.reduce((s, x) => s + x.inventory, 0)
  const lowSlots = slots.filter((s) => s.inventory / s.capacity < 0.2 && s.inventory > 0).length
  const emptySlots = slots.filter((s) => s.inventory === 0).length

  return (
    <div className="space-y-6 p-6">
      <Link href="/machines" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <ArrowLeft size={15} /> Back to Machines
      </Link>

      <PageHeader title={machine.name} description={`${machine.id} · ${machine.location}`}>
        <Badge variant={statusVariant(machine.status)}>{machine.status === 'online' ? 'Online' : machine.status === 'warning' ? 'Low Stock' : 'Offline'}</Badge>
        <Button size="sm">Edit Machine</Button>
      </PageHeader>

      {/* Quick stat pills */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-5">
        {[
          ["Today's Revenue", formatCurrency(machine.revenueToday, 2)],
          ['Fill Level', `${fillPct}%`],
          ['Total Slots', String(machine.totalSlots)],
          ['Open Alerts', String(alerts.filter((a) => a.status === 'active').length)],
          ['Last Ping', machine.status === 'offline' ? 'Offline' : formatDate(machine.lastPing)],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
              tab === tb.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* GENERAL */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Machine Details</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              {[['Name', machine.name], ['Machine ID', machine.id], ['Brand / Model', machine.model], ['Route', machine.route], ['Location', machine.location], ['Cabinets', String(machine.cabinets)]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-[var(--text-muted)]">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader><CardTitle>Revenue (6 months)</CardTitle></CardHeader>
            <BarChartWrapper data={revenueData} bars={[{ key: 'value', label: 'Revenue ($)', color: '#2563EB' }]} xKey="month" height={180} />
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Recent Alerts</CardTitle></CardHeader>
            {alerts.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No alerts for this machine.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] text-sm">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <span>{a.title}</span>
                    <Badge variant={a.status === 'active' ? 'danger' : 'success'}>{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* PLANOGRAM */}
      {tab === 'planogram' && (
        <Card>
          <CardHeader><CardTitle>Planogram</CardTitle></CardHeader>
          {slots.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No slot data synced for this machine yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {slots.map((s) => {
                  const pct = Math.round((s.inventory / s.capacity) * 100)
                  return (
                    <div key={s.id} className={cn('rounded-xl border p-3', s.enabled ? 'border-[var(--border)]' : 'border-dashed border-slate-300 opacity-60')}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold">{s.cabinet.replace('Cabinet', '')}-{String(s.id).slice(-2)}</span>
                        <span className="text-xs font-medium">{formatCurrency(s.price, 2)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium" title={s.product}>{s.product}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full', fillColor(pct))} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{s.inventory} / {s.capacity}{s.motorStatus === 'error' && <span className="ml-1 text-red-600">· motor</span>}</p>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
                <span>Total capacity: <b className="text-[var(--text-primary)]">{totalCap}</b></span>
                <span>Current inventory: <b className="text-[var(--text-primary)]">{totalInv}</b></span>
                <span>Fill %: <b className="text-[var(--text-primary)]">{totalCap ? Math.round((totalInv / totalCap) * 100) : 0}%</b></span>
                <span>Low stock: <b className="text-amber-600">{lowSlots}</b></span>
                <span>Empty: <b className="text-red-600">{emptySlots}</b></span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <Card>
          <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
          {orders.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No orders recorded for this machine.</p>
          ) : (
            <Table>
              <Thead><Tr><Th>Date</Th><Th>Product</Th><Th>Slot</Th><Th>Payment</Th><Th>Amount</Th><Th>Status</Th></Tr></Thead>
              <Tbody>
                {orders.map((o) => (
                  <Tr key={o.id}>
                    <Td className="whitespace-nowrap">{formatDate(o.date)}</Td>
                    <Td className="font-medium">{o.product}</Td>
                    <Td className="font-mono text-xs">{o.slot}</Td>
                    <Td className="text-xs uppercase">{o.payment}</Td>
                    <Td>{formatCurrency(o.amount, 2)}</Td>
                    <Td><Badge variant={o.status === 'completed' ? 'success' : o.status === 'refunded' ? 'info' : 'danger'}>{o.status}</Badge></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      )}

      {/* MAINTENANCE */}
      {tab === 'maintenance' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Service History</CardTitle></CardHeader>
            <Table>
              <Thead><Tr><Th>Date</Th><Th>Technician</Th><Th>Type</Th></Tr></Thead>
              <Tbody>
                {[['2026-05-05', 'John Martinez', 'Restock'], ['2026-04-28', 'John Martinez', 'Cash Collection'], ['2026-04-21', 'Bob Williams', 'Inspection']].map((r) => (
                  <Tr key={r[0]}><Td className="whitespace-nowrap">{formatDate(r[0])}</Td><Td>{r[1]}</Td><Td>{r[2]}</Td></Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader><CardTitle>Open Issues</CardTitle><Button size="sm" variant="secondary">+ Log Issue</Button></CardHeader>
            <ul className="divide-y divide-[var(--border)] text-sm">
              {[['Slot B-07 motor jam', 'Open'], ['Screen brightness issue', 'In Progress']].map((i) => (
                <li key={i[0]} className="flex items-center justify-between py-2.5">
                  <span>{i[0]}</span><Badge variant="warning">{i[1]}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* ENERGY */}
      {tab === 'energy' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Power Consumption (kWh)</CardTitle></CardHeader>
            <BarChartWrapper data={energyData} bars={[{ key: 'value', label: 'kWh', color: '#10B981' }]} xKey="month" height={180} />
          </Card>
          <Card>
            <CardHeader><CardTitle>Energy Settings</CardTitle></CardHeader>
            <dl className="space-y-2 text-sm">
              {[['Current draw', `${machine.powerConsumption} kWh/day`], ['Lighting schedule', '06:00 - 22:00'], ['Screen brightness', 'Auto'], ['Target temp (refrigerated)', '38°F'], ['Defogging', 'Enabled']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-[var(--text-muted)]">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {/* SETTINGS */}
      {tab === 'settings' && (
        <Card className="max-w-2xl">
          <CardHeader><CardTitle>Machine Settings</CardTitle></CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[['Machine name', machine.name], ['Low stock threshold (%)', String(machine.shortageThreshold)], ['Currency', 'USD ($)'], ['Tax rate (%)', '8']].map(([label, val]) => (
              <label key={label} className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
                <input defaultValue={val} className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2"><Button size="sm">Save</Button></div>
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Danger zone</p>
            <p className="mb-3 text-xs text-red-600">Decommissioning removes this machine from your fleet.</p>
            <Button size="sm" variant="danger">Decommission Machine</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
