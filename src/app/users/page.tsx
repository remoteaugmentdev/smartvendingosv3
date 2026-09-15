'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/utils/cn'
import { ldaUsers, ldaMachines, ldaProducers, type UserRole, type UserStatus } from '@/data/lda'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  UserCircle2,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface LdaUser {
  id: string
  name: string
  initials: string
  email: string
  role: UserRole
  zone: string
  assignedMachines: number
  siret: string | null
  status: UserStatus
  lastActive: string | null
}

function roleBadge(role: UserRole) {
  const map: Record<UserRole, 'info' | 'default' | 'success' | 'warning'> = {
    Admin: 'info',
    Technician: 'default',
    Producer: 'success',
    Developer: 'warning',
  }
  return <Badge variant={map[role]}>{role}</Badge>
}

function maskSiret(siret: string | null) {
  if (!siret) return '—'
  return `${siret.slice(0, 6)}...${siret.slice(-4)}`
}

function AvatarCircle({ initials, colorIndex }: { initials: string; colorIndex: number }) {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
        colors[colorIndex % colors.length]
      )}
    >
      {initials}
    </span>
  )
}

type ZoneFilter = 'all' | 'Route A' | 'Route B' | 'Route C'

export default function UsersPage() {
  const t = useTranslation()

  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<LdaUser[]>(ldaUsers as LdaUser[])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<LdaUser | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('Technician')
  const [formStatus, setFormStatus] = useState<UserStatus>('active')
  const [siretInput, setSiretInput] = useState('')
  const [siretValid, setSiretValid] = useState(false)
  const [producerName, setProducerName] = useState('')
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all')

  function statusBadge(status: UserStatus) {
    const map: Record<UserStatus, { variant: 'success' | 'warning' | 'default'; label: string }> = {
      active: { variant: 'success', label: t.active },
      pending: { variant: 'warning', label: t.pending },
      inactive: { variant: 'default', label: t.inactive },
    }
    const { variant, label } = map[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  function formatLastActive(dateStr: string | null) {
    if (!dateStr) return t.never
    return new Date(dateStr).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function openCreate() {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('Technician')
    setFormStatus('active')
    setSiretInput('')
    setSiretValid(false)
    setProducerName('')
    setSelectedMachines([])
    setZoneFilter('all')
    setShowForm(true)
  }

  function openEdit(user: LdaUser) {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role)
    setFormStatus(user.status)
    setSiretInput(user.siret ?? '')
    setSiretValid(!!user.siret)
    setProducerName('')
    setSelectedMachines([])
    setZoneFilter('all')
    setShowForm(true)
  }

  function handleSiretChange(val: string) {
    setSiretInput(val)
    const isValid = /^\d{14}$/.test(val)
    setSiretValid(isValid)
    if (isValid) {
      const producer = ldaProducers.find((p) => p.siret === val)
      setProducerName(producer ? producer.name : '')
    } else {
      setProducerName('')
    }
  }

  function saveForm() {
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: formName,
                role: formRole,
                status: formStatus,
                siret: siretValid ? siretInput : null,
                assignedMachines: selectedMachines.length || u.assignedMachines,
              }
            : u
        )
      )
      showToast(t.userSaved)
    } else {
      const newUser: LdaUser = {
        id: `U${String(Date.now()).slice(-4)}`,
        name: formName,
        initials: formName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        email: formEmail,
        role: formRole,
        zone: zoneFilter === 'all' ? 'All' : zoneFilter,
        assignedMachines: selectedMachines.length,
        siret: siretValid ? siretInput : null,
        status: formStatus,
        lastActive: null,
      }
      setUsers((prev) => [...prev, newUser])
      showToast(t.userSaved)
    }
    setShowForm(false)
    setEditingUser(null)
  }

  function deleteUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    setDeleteConfirmId(null)
    showToast(t.userDeleted)
  }

  const filteredMachines = (() => {
    if (zoneFilter === 'all') return ldaMachines
    const routeMap: Record<ZoneFilter, string> = {
      all: '',
      'Route A': 'Route A',
      'Route B': 'Route B',
      'Route C': 'Route C',
    }
    return ldaMachines.filter((m) => m.route.includes(routeMap[zoneFilter]))
  })()

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const ZONE_PILLS: ZoneFilter[] = ['all', 'Route A', 'Route B', 'Route C']

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t.userManagement} description="Manage users, roles, and machine assignments">
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t.createUser}
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Users Table */}
      <Card hover={false}>
        <Table>
          <Thead>
            <Tr>
              <Th>{t.name}</Th>
              <Th className="hidden sm:table-cell">Email</Th>
              <Th>{t.role}</Th>
              <Th className="hidden md:table-cell">{t.zone}</Th>
              <Th className="hidden md:table-cell">{t.assignedMachines}</Th>
              <Th className="hidden lg:table-cell">SIRET</Th>
              <Th>{t.status}</Th>
              <Th className="hidden lg:table-cell">{t.lastActive}</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredUsers.map((user, idx) => (
              <Tr key={user.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <AvatarCircle initials={user.initials} colorIndex={idx} />
                    <div className="font-medium w-[80px] sm:w-auto truncate sm:overflow-visible sm:whitespace-normal">{user.name}</div>
                  </div>
                </Td>
                <Td className="hidden sm:table-cell text-[var(--text-muted)]">{user.email}</Td>
                <Td>{roleBadge(user.role)}</Td>
                <Td className="hidden md:table-cell text-[var(--text-muted)]">{user.zone}</Td>
                <Td className="hidden md:table-cell">{user.assignedMachines}</Td>
                <Td className="hidden lg:table-cell font-mono text-xs">{maskSiret(user.siret)}</Td>
                <Td>{statusBadge(user.status)}</Td>
                <Td className="hidden lg:table-cell text-xs text-[var(--text-muted)]">
                  {formatLastActive(user.lastActive)}
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(user)}
                      aria-label={t.edit}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-slate-100 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {deleteConfirmId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-slate-100 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(user.id)}
                        aria-label={t.delete}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {filteredUsers.length === 0 && (
              <Tr>
                <Td colSpan={9} className="py-8 text-center text-[var(--text-muted)]">
                  No users found.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>

      {/* Create / Edit Form */}
      {showForm && (
        <Card hover={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4" />
              {editingUser ? t.edit : t.createUser}
            </CardTitle>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Profile Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {t.profileInfo}
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">{t.fullName}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t.fullName}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">{t.emailAddress}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  readOnly={!!editingUser}
                  placeholder="email@example.com"
                  className={cn(
                    'h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500',
                    editingUser && 'opacity-60 cursor-not-allowed'
                  )}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  {t.siretId} (14 digits)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={siretInput}
                    onChange={(e) => handleSiretChange(e.target.value)}
                    maxLength={14}
                    placeholder="00000000000000"
                    className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 pr-8 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {siretInput.length === 14 && (
                    <div className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2',
                      siretValid ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {siretValid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{t.siretHelper}</p>
                {siretInput.length === 14 && !siretValid && (
                  <p className="text-xs text-red-500">{t.invalidSiret}</p>
                )}
                {siretValid && producerName && (
                  <p className="text-xs text-emerald-600">
                    {t.validSiret}: {producerName}
                  </p>
                )}
                {siretValid && !producerName && (
                  <p className="text-xs text-amber-600">{t.unknownProducer}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">{t.role}</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Technician">Technician</option>
                  <option value="Producer">Producer</option>
                  <option value="Developer">Developer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">{t.status}</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="active">{t.active}</option>
                  <option value="pending">{t.pending}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
              </div>
            </div>

            {/* Right: Assign Machines */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {t.assignMachines}
              </h4>

              {/* Zone pills */}
              <div className="flex flex-wrap gap-2">
                {ZONE_PILLS.map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setZoneFilter(zone)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      zoneFilter === zone
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-[var(--text-muted)] hover:bg-slate-200'
                    )}
                  >
                    {zone === 'all' ? t.allMachines : zone}
                  </button>
                ))}
              </div>

              {/* Select/Deselect All */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMachines(filteredMachines.map((m) => m.id))}
                >
                  {t.selectAll}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMachines([])}
                >
                  {t.deselectAll}
                </Button>
              </div>

              {/* Machine cards */}
              <div className="space-y-2">
                {filteredMachines.map((machine) => {
                  const checked = selectedMachines.includes(machine.id)
                  return (
                    <label
                      key={machine.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all',
                        checked
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-[var(--border)] hover:border-slate-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedMachines((prev) =>
                            prev.includes(machine.id)
                              ? prev.filter((id) => id !== machine.id)
                              : [...prev, machine.id]
                          )
                        }
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {machine.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{machine.location}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button variant="primary" onClick={saveForm}>
              {t.save}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              {t.cancel}
            </Button>
          </div>
        </Card>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
