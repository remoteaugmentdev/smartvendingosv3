'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { UserPlus, Copy, Check, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table'
import { createMember, setMemberStatus, regenerateInvite, type CreateMemberData } from './actions'
import type { ActionResult } from '@/server/audit'

type Role = 'Admin' | 'Manager' | 'Dispatcher' | 'Technician' | 'Viewer'
const ROLES: Role[] = ['Admin', 'Manager', 'Dispatcher', 'Technician', 'Viewer']

const ROLE_VARIANT: Record<Role, 'success' | 'info' | 'warning' | 'default'> = {
  Admin: 'success',
  Manager: 'info',
  Dispatcher: 'warning',
  Technician: 'default',
  Viewer: 'default',
}

export type MemberRow = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  role: Role
  memberStatus: 'active' | 'suspended'
  userStatus: 'invited' | 'active' | 'suspended'
}

function InviteLinkCopy({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--text-muted)]">
        Share this one-time link with the new member. It expires in 48 hours and is shown once.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-slate-50 px-3 text-xs text-[var(--text-primary)]"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

function CreateMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const initialState: ActionResult<CreateMemberData> | null = null
  const [state, formAction, pending] = useActionState(createMember, initialState)
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {}

  return (
    <Dialog open={open} onClose={onClose} title="Invite member">
      {state?.ok ? (
        <div className="space-y-4">
          {state.data.inviteLink ? (
            <InviteLinkCopy link={state.data.inviteLink} />
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Added. This person already has an account and can sign in with their existing password.
            </p>
          )}
          <Button type="button" size="sm" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="member-first-name" className="block text-xs font-medium text-[var(--text-primary)]">First name</label>
              <input id="member-first-name" name="firstName" required className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm" />
              {fieldErrors.firstName && <p className="text-xs text-red-600">{fieldErrors.firstName}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="member-last-name" className="block text-xs font-medium text-[var(--text-primary)]">Last name</label>
              <input id="member-last-name" name="lastName" className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="member-email" className="block text-xs font-medium text-[var(--text-primary)]">Email</label>
            <input id="member-email" name="email" type="email" required className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm" />
            {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="member-role" className="block text-xs font-medium text-[var(--text-primary)]">Role</label>
            <select id="member-role" name="role" required defaultValue="" className="h-9 w-full rounded-lg border border-[var(--border)] px-3 text-sm">
              <option value="" disabled>Choose a role</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {fieldErrors.role && <p className="text-xs text-red-600">{fieldErrors.role}</p>}
          </div>
          {state && !state.ok && !state.fieldErrors && (
            <p className="text-xs text-red-600">Could not add this member. Refresh and try again.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending}>{pending ? 'Inviting…' : 'Send invite'}</Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

function statusBadge(row: MemberRow) {
  if (row.userStatus === 'invited') return <Badge variant="warning">Invited</Badge>
  if (row.memberStatus === 'suspended') return <Badge variant="danger">Suspended</Badge>
  return <Badge variant="success">Active</Badge>
}

function MemberRowActions({ row }: { row: MemberRow }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  function toggleStatus() {
    setError(null)
    const next = row.memberStatus === 'active' ? 'suspended' : 'active'
    startTransition(async () => {
      const res = await setMemberStatus(row.id, next)
      if (!res.ok) setError(res.fieldErrors?.status ?? 'Could not update this member.')
    })
  }

  function sendNewInvite() {
    setError(null)
    startTransition(async () => {
      const res = await regenerateInvite(row.id)
      if (res.ok) setInviteLink(res.data.inviteLink)
      else setError('Could not generate a new invite link.')
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {row.userStatus === 'invited' && (
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={sendNewInvite}>
          New link
        </Button>
      )}
      {row.userStatus !== 'invited' && (
        <Button type="button" variant={row.memberStatus === 'active' ? 'danger' : 'secondary'} size="sm" disabled={pending} onClick={toggleStatus}>
          {row.memberStatus === 'active' ? 'Suspend' : 'Reactivate'}
        </Button>
      )}
      <Dialog open={Boolean(inviteLink)} onClose={() => setInviteLink(null)} title="New invite link">
        {inviteLink && <InviteLinkCopy link={inviteLink} />}
      </Dialog>
    </div>
  )
}

type SortKey = 'name' | 'email' | 'role' | 'status'

function SortableTh({
  label,
  column,
  href,
  sort,
  dir,
  className,
}: {
  label: string
  column: SortKey
  href: string
  sort: SortKey
  dir: 'asc' | 'desc'
  className?: string
}) {
  const active = sort === column
  return (
    <Th className={className}>
      <Link href={href} className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]">
        {label}
        {active && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </Link>
    </Th>
  )
}

export function TeamClient({
  members,
  sortHrefs,
  sort,
  dir,
}: {
  members: MemberRow[]
  sortHrefs: Record<SortKey, string>
  sort: SortKey
  dir: 'asc' | 'desc'
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  // Bumped on open so each invite starts with an empty form and the one-time link is never shown twice.
  const [dialogKey, setDialogKey] = useState(0)

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => { setDialogKey((k) => k + 1); setDialogOpen(true) }}><UserPlus size={16} /> Invite Member</Button>
      </div>
      <CreateMemberDialog key={dialogKey} open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <Table>
        <Thead>
          <Tr>
            <SortableTh label="Name" column="name" href={sortHrefs.name} sort={sort} dir={dir} />
            <SortableTh label="Email" column="email" href={sortHrefs.email} sort={sort} dir={dir} className="hidden sm:table-cell" />
            <SortableTh label="Role" column="role" href={sortHrefs.role} sort={sort} dir={dir} />
            <SortableTh label="Status" column="status" href={sortHrefs.status} sort={sort} dir={dir} />
            <Th className="text-right">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {members.map((m) => {
            const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email
            return (
              <Tr key={m.id}>
                <Td className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                      {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    {name}
                  </div>
                </Td>
                <Td className="hidden sm:table-cell text-xs text-[var(--text-muted)]">{m.email}</Td>
                <Td><Badge variant={ROLE_VARIANT[m.role]}>{m.role}</Badge></Td>
                <Td>{statusBadge(m)}</Td>
                <Td><MemberRowActions row={m} /></Td>
              </Tr>
            )
          })}
        </Tbody>
      </Table>
    </>
  )
}
