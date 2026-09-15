'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/utils/cn'
import { ldaRoutes, ldaMachines } from '@/data/lda'
import { Plus, GripVertical, X, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type LdaRoute = (typeof ldaRoutes)[number]

export default function RoutesPage() {
  const t = useTranslation()

  const [routes, setRoutes] = useState<LdaRoute[]>(ldaRoutes)
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTech, setEditTech] = useState('')
  const [editMachines, setEditMachines] = useState<string[]>([])
  const [addMachineId, setAddMachineId] = useState('')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function startEdit(route: LdaRoute) {
    setEditingRouteId(route.id)
    setEditName(route.name)
    setEditTech(route.technician)
    setEditMachines([...route.machines])
    setAddMachineId('')
  }

  function cancelEdit() {
    setEditingRouteId(null)
  }

  function saveEdit(routeId: string) {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? { ...r, name: editName, technician: editTech, machines: editMachines }
          : r
      )
    )
    setEditingRouteId(null)
    showToast(t.routeSaved)
  }

  function removeMachineFromEdit(machineId: string) {
    setEditMachines((prev) => prev.filter((id) => id !== machineId))
  }

  function addMachineToEdit() {
    if (!addMachineId || editMachines.includes(addMachineId)) return
    setEditMachines((prev) => [...prev, addMachineId])
    setAddMachineId('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader title={t.routeManagement} description={t.routeSubtitle}>
        <Button variant="primary" size="sm">
          <Plus className="h-4 w-4" />
          {t.addRoute}
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {routes.map((route) => {
          const isEditing = editingRouteId === route.id
          const machineLookup = (id: string) => ldaMachines.find((m) => m.id === id)

          return (
            <Card key={route.id} hover={false}>
              {/* Route header */}
              <CardHeader className="mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: route.color }}
                  />
                  <CardTitle>{route.name}</CardTitle>
                  <Badge variant="default">{route.machines.length} machine{route.machines.length !== 1 ? 's' : ''}</Badge>
                </div>
                {!isEditing && (
                  <div className="flex gap-2">
                    <Link href={`/routes/${route.id}`}>
                      <Button variant="secondary" size="sm">Open</Button>
                    </Link>
                    <Button variant="secondary" size="sm" onClick={() => startEdit(route)}>
                      {t.edit}
                    </Button>
                  </div>
                )}
              </CardHeader>

              {!isEditing ? (
                /* View mode */
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {t.technician}: <span className="font-medium text-[var(--text-primary)]">{route.technician}</span>
                  </p>
                  {route.machines.length === 0 ? (
                    <p className="py-3 text-sm text-[var(--text-muted)] italic">{t.noMachines}.</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {route.machines.map((machineId, idx) => {
                        const machine = machineLookup(machineId)
                        return (
                          <li key={machineId} className="flex items-center gap-2 text-sm">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-medium text-[var(--text-primary)]">
                                {machine?.name ?? machineId}
                              </span>
                              {machine && (
                                <span className="ml-1 text-xs text-[var(--text-muted)]">
                                  — {machine.location}
                                </span>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              ) : (
                /* Edit mode */
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[var(--text-muted)]">{t.name}</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[var(--text-muted)]">{t.technician}</label>
                      <input
                        type="text"
                        value={editTech}
                        onChange={(e) => setEditTech(e.target.value)}
                        className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Editable machine list */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-muted)]">
                      {t.machine}
                    </label>
                    {editMachines.length === 0 ? (
                      <p className="py-2 text-xs text-[var(--text-muted)] italic">{t.noMachines}.</p>
                    ) : (
                      <ol className="space-y-1.5">
                        {editMachines.map((machineId, idx) => {
                          const machine = machineLookup(machineId)
                          return (
                            <li
                              key={machineId}
                              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                            >
                              <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-muted)] cursor-grab" />
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {machine?.name ?? machineId}
                                </span>
                                {machine && (
                                  <span className="ml-1 text-xs text-[var(--text-muted)]">
                                    — {machine.location}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removeMachineFromEdit(machineId)}
                                className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>

                  {/* Add machine dropdown */}
                  {(() => {
                    const available = ldaMachines.filter(
                      (m) => !editMachines.includes(m.id)
                    )
                    return available.length > 0 ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select
                            value={addMachineId}
                            onChange={(e) => setAddMachineId(e.target.value)}
                            className="h-9 w-full appearance-none rounded-xl border border-[var(--border)] bg-white pl-3 pr-8 text-sm text-[var(--text-primary)] focus:outline-none"
                          >
                            <option value="">{t.addMachine}…</option>
                            {available.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} — {m.location}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={addMachineToEdit}
                          disabled={!addMachineId}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t.add}
                        </Button>
                      </div>
                    ) : null
                  })()}

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <Button variant="primary" onClick={() => saveEdit(route.id)}>
                      {t.save}
                    </Button>
                    <Button variant="secondary" onClick={cancelEdit}>
                      {t.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
