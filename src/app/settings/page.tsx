'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/utils/cn'

type Section = 'profile' | 'company' | 'subscription' | 'notifications' | 'integrations' | 'security'
const NAV: { key: Section; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'company', label: 'Company' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'security', label: 'Security' },
]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
      <input
        defaultValue={value}
        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  )
}

function Bar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = Math.round((used / total) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-medium">{used} / {total}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const NOTIF_ROWS = [
  ['Machine goes offline', true, true, true],
  ['Low stock alert', true, true, false],
  ['Trip completed', false, true, false],
  ['Purchase received', true, true, false],
  ['Weekly summary report', true, false, false],
] as const

const INTEGRATIONS = ['QuickBooks', 'Xero', 'Nayax', 'CPI', 'Slack', 'Zapier', 'REST API']

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('subscription')

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Settings" description="Account & subscription" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={cn(
                'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                section === n.key ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:bg-slate-100'
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {section === 'profile' && (
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name" value="Alex Johnson" />
                <Field label="Email" value="alex@peakvending.com" />
                <Field label="Timezone" value="America/Chicago" />
                <Field label="Currency Display" value="USD ($)" />
              </div>
              <div className="mt-4"><Button size="sm">Save Changes</Button></div>
            </Card>
          )}

          {section === 'company' && (
            <Card>
              <CardHeader><CardTitle>Company</CardTitle></CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Company Name" value="Peak Vending Solutions" />
                <Field label="Website" value="peakvending.com" />
                <Field label="Address" value="Oklahoma City, OK, USA" />
                <Field label="Default Currency" value="USD ($)" />
                <Field label="Default Units" value="Miles" />
                <Field label="Tax ID" value="(optional)" />
              </div>
              <div className="mt-4"><Button size="sm">Save Changes</Button></div>
            </Card>
          )}

          {section === 'subscription' && (
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <Badge variant="info">Pro ✦</Badge>
              </CardHeader>
              <p className="text-sm text-[var(--text-muted)]">
                Monthly · $79/month · next billing June 12, 2026
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Bar label="Machines" used={24} total={100} />
                <Bar label="Users" used={6} total={10} />
              </div>
              <div className="mt-5 flex gap-2">
                <Button size="sm">Upgrade Plan</Button>
                <Button size="sm" variant="secondary">Manage Billing</Button>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card>
              <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-3 py-2 text-left">Event</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">In-App</th>
                      <th className="px-3 py-2">SMS (Pro+)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {NOTIF_ROWS.map((r) => (
                      <tr key={r[0] as string} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2.5 font-medium">{r[0]}</td>
                        {[r[1], r[2], r[3]].map((on, i) => (
                          <td key={i} className="px-3 py-2.5 text-center">
                            <input type="checkbox" defaultChecked={on as boolean} className="h-4 w-4 accent-blue-600" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {section === 'integrations' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INTEGRATIONS.map((name) => (
                <Card key={name} className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-primary)]">{name}</span>
                  <Button size="sm" variant="secondary">
                    {name === 'REST API' ? 'View API Keys' : 'Connect'}
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="New Password" value="" />
                  <Field label="Confirm Password" value="" />
                </div>
                <div className="mt-4"><Button size="sm">Update Password</Button></div>
              </Card>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Two-Factor Authentication</p>
                  <p className="text-xs text-[var(--text-muted)]">2FA via email</p>
                </div>
                <input type="checkbox" className="h-4 w-4 accent-blue-600" />
              </Card>
              <Card>
                <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
                <ul className="divide-y divide-[var(--border)] text-sm">
                  {[
                    ['Chrome · Windows', 'Oklahoma City', 'Now'],
                    ['Safari · iPhone', 'Oklahoma City', '2 h ago'],
                  ].map((s) => (
                    <li key={s[0]} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-medium">{s[0]}</p>
                        <p className="text-xs text-[var(--text-muted)]">{s[1]} · {s[2]}</p>
                      </div>
                      <Button size="sm" variant="ghost">Revoke</Button>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
