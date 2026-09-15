'use client'

import { useEffect, useState } from 'react'
import { Search, Package, RefreshCw, X } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table'
import { ldaMachines, ldaSlots, ldaProducts } from '@/data/lda'
import { useTranslation } from '@/hooks/useTranslation'

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl">
      {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bottom Sheet
// ---------------------------------------------------------------------------
function InventoryShortageSheet({
  machineId,
  machineName,
  onClose,
  t,
}: {
  machineId: string
  machineName: string
  onClose: () => void
  t: ReturnType<typeof useTranslation>
}) {
  const shortSlots = ldaSlots.filter(
    (s) => s.machineId === machineId && s.inventory < s.capacity
  )

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative z-10 rounded-t-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {t.shortage}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{machineName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <Table>
            <Thead>
              <Tr>
                <Th>{t.product}</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">{t.capacity}</Th>
                <Th className="text-right">{t.shortage}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {shortSlots.map((slot) => (
                <Tr key={slot.id}>
                  <Td className="text-sm">{slot.product}</Td>
                  <Td className="text-right text-sm">{slot.inventory}</Td>
                  <Td className="text-right text-sm">{slot.capacity}</Td>
                  <Td className="text-right text-sm font-semibold text-red-600">
                    -{slot.capacity - slot.inventory}
                  </Td>
                </Tr>
              ))}
              {shortSlots.length === 0 && (
                <Tr>
                  <Td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">
                    No shortage slots found.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
        <div className="px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" size="md" className="w-full" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product Shortage Summary Modal
// ---------------------------------------------------------------------------
function ProductSummaryModal({
  onClose,
  t,
}: {
  onClose: () => void
  t: ReturnType<typeof useTranslation>
}) {
  const productMap = Object.fromEntries(ldaProducts.map((p) => [p.id, p]))

  const shortageSlots = ldaSlots.filter((slot) => {
    const product = productMap[slot.productId]
    return product && slot.inventory < product.reorderLevel
  })

  // Aggregate by productId
  const byProduct: Record<
    string,
    { name: string; stock: number; reorderLevel: number; machines: Set<string> }
  > = {}
  for (const slot of shortageSlots) {
    const product = productMap[slot.productId]
    if (!product) continue
    if (!byProduct[slot.productId]) {
      byProduct[slot.productId] = {
        name: product.name,
        stock: slot.inventory,
        reorderLevel: product.reorderLevel,
        machines: new Set(),
      }
    } else {
      byProduct[slot.productId].stock += slot.inventory
    }
    byProduct[slot.productId].machines.add(slot.machineId)
  }

  const rows = Object.values(byProduct)

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {t.productShortageSummary}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <Table>
            <Thead>
              <Tr>
                <Th>{t.product}</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Reorder Level</Th>
                <Th className="text-right">{t.machinesAffected}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row, i) => (
                <Tr key={i}>
                  <Td className="text-sm font-medium">{row.name}</Td>
                  <Td className="text-right text-sm text-red-600 font-semibold">{row.stock}</Td>
                  <Td className="text-right text-sm">{row.reorderLevel}</Td>
                  <Td className="text-right text-sm text-[var(--text-muted)]">
                    {row.machines.size}
                  </Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <Tr>
                  <Td colSpan={4} className="text-center py-8 text-[var(--text-muted)]">
                    No products below reorder level.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
        <div className="px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" size="md" className="w-full" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Machine Card
// ---------------------------------------------------------------------------
function MachineCard({
  machine,
  index,
  selected,
  onToggleSelect,
  onOpenSheet,
  onRefill,
  t,
}: {
  machine: (typeof ldaMachines)[number]
  index: number
  selected: boolean
  onToggleSelect: () => void
  onOpenSheet: () => void
  onRefill: () => void
  t: ReturnType<typeof useTranslation>
}) {
  const shortageVariant =
    machine.shortageRate > 5
      ? 'text-red-600 font-bold'
      : machine.shortageRate > 0
      ? 'text-amber-600 font-semibold'
      : 'text-emerald-600'

  return (
    <Card hover={false} className="p-4">
      <div className="flex items-start gap-3">
        {/* Select checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-600 shrink-0"
        />
        {/* Number badge */}
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {machine.name}
            </span>
            <Badge variant={machine.status === 'online' ? 'success' : 'danger'}>
              {machine.status === 'online' ? t.online : t.offline}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">ID: {machine.id}</p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
            <div className="text-[var(--text-muted)]">
              {t.shortageRate}:{' '}
              <span className={shortageVariant}>{machine.shortageRate}%</span>
            </div>
            <div className="text-[var(--text-muted)]">
              {t.shortageThreshold}:{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {machine.shortageThreshold}%
              </span>
            </div>
            <div className="text-[var(--text-muted)]">
              {t.capacity}:{' '}
              <span className="font-medium text-[var(--text-primary)]">{machine.capacity}</span>
            </div>
            <div className="text-[var(--text-muted)]">
              {t.inventory}:{' '}
              <span className="font-medium text-[var(--text-primary)]">{machine.inventory}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={onOpenSheet}
              className="bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-200 hover:from-orange-500 hover:to-orange-700"
            >
              <Package size={13} />
              {t.inventoryShortage}
            </Button>
            <Button variant="primary" size="sm" onClick={onRefill}>
              <RefreshCw size={13} />
              {t.reFillNow}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const ROUTES = ['All', 'Route A', 'Route B', 'Route C']

export default function ShortageListPage() {
  const t = useTranslation()
  const [search, setSearch] = useState('')
  const [routeFilter, setRouteFilter] = useState('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sheetMachineId, setSheetMachineId] = useState<string | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
  }

  const filtered = ldaMachines.filter((m) => {
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.includes(search)
    const matchRoute =
      routeFilter === 'All' || m.route.includes(routeFilter)
    return matchSearch && matchRoute
  })

  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((m) => next.delete(m.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((m) => next.add(m.id))
        return next
      })
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sheetMachine = sheetMachineId
    ? ldaMachines.find((m) => m.id === sheetMachineId) ?? null
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{t.inventoryShortage}</h2>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Machines with low stock levels
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--border)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROUTES.map((r) => (
            <option key={r} value={r}>
              {r === 'All' ? t.allRoutes : r}
            </option>
          ))}
        </select>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t.machineQuantity}:{' '}
          <span className="font-bold">{filtered.length}</span>
        </span>
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
          />
          {t.selectAll}
        </label>
      </div>

      {/* Machine cards */}
      <div className="space-y-3 mb-6">
        {filtered.map((machine, i) => (
          <MachineCard
            key={machine.id}
            machine={machine}
            index={i + 1}
            selected={selected.has(machine.id)}
            onToggleSelect={() => toggleOne(machine.id)}
            onOpenSheet={() => setSheetMachineId(machine.id)}
            onRefill={() => showToast(`${t.refillSubmitted} ${machine.name}`)}
            t={t}
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            No machines match your search.
          </div>
        )}
      </div>

      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-4 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-2xl"
          onClick={() => setShowSummaryModal(true)}
        >
          <Package size={16} />
          {t.productShortageSummary}
        </Button>
      </div>

      {/* Bottom sheet */}
      {sheetMachine && (
        <InventoryShortageSheet
          machineId={sheetMachine.id}
          machineName={sheetMachine.name}
          onClose={() => setSheetMachineId(null)}
          t={t}
        />
      )}

      {/* Summary modal */}
      {showSummaryModal && (
        <ProductSummaryModal onClose={() => setShowSummaryModal(false)} t={t} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}
