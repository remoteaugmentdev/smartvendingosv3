'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/utils/cn'
import { ldaAlerts, type AlertType } from '@/data/lda'
import {
  WifiOff,
  PackageX,
  Wrench,
  CalendarX,
  CreditCard,
  Bell,
  ChevronDown,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type MainTab = 'feed' | 'settings'
type FilterType = 'all' | AlertType

function alertIcon(type: AlertType) {
  switch (type) {
    case 'offline':
      return <WifiOff className="h-5 w-5 text-red-500" />
    case 'low_stock':
      return <PackageX className="h-5 w-5 text-amber-500" />
    case 'motor_error':
      return <Wrench className="h-5 w-5 text-red-500" />
    case 'expiry':
      return <CalendarX className="h-5 w-5 text-amber-500" />
    case 'payment_error':
      return <CreditCard className="h-5 w-5 text-red-500" />
  }
}

function formatAlertDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          checked ? 'bg-blue-600' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}

export default function AlertsPage() {
  const t = useTranslation()

  const [activeTab, setActiveTab] = useState<MainTab>('feed')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [alertStatuses, setAlertStatuses] = useState<Record<string, string>>({})

  // Settings state
  const [lowStockThreshold, setLowStockThreshold] = useState(3)
  const [offlineDelay, setOfflineDelay] = useState('15')
  const [motorErrors, setMotorErrors] = useState(true)
  const [expiryDays, setExpiryDays] = useState(7)
  const [paymentFailures, setPaymentFailures] = useState(3)
  const [emailNotif, setEmailNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(true)
  const [inAppNotif, setInAppNotif] = useState(true)

  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function resolveAlert(id: string) {
    setAlertStatuses((prev) => ({ ...prev, [id]: 'resolved' }))
    showToast(t.alertResolved)
  }

  function getStatus(alert: (typeof ldaAlerts)[number]) {
    return alertStatuses[alert.id] ?? alert.status
  }

  const unresolvedCount = ldaAlerts.filter((a) => getStatus(a) === 'active').length

  const filteredAlerts =
    activeFilter === 'all'
      ? ldaAlerts
      : ldaAlerts.filter((a) => a.type === activeFilter)

  const FILTER_PILLS: { id: FilterType; label: string }[] = [
    { id: 'all', label: t.all },
    { id: 'offline', label: t.alertTypes.offline },
    { id: 'low_stock', label: t.alertTypes.low_stock },
    { id: 'motor_error', label: t.alertTypes.motor_error },
    { id: 'expiry', label: t.alertTypes.expiry },
    { id: 'payment_error', label: t.alertTypes.payment_error },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader title="Alerts" description="Monitor and manage machine alerts" />

      {/* Main Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('feed')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'feed'
              ? 'bg-white text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          {t.alertFeed}
          {unresolvedCount > 0 && (
            <Badge variant="danger">{unresolvedCount}</Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            activeTab === 'settings'
              ? 'bg-white text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          {t.alertSettings}
        </button>
      </div>

      {/* ── ALERT FEED TAB ── */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  activeFilter === pill.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-[var(--text-muted)] hover:bg-slate-200'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Alert cards */}
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const status = getStatus(alert)
              return (
                <Card key={alert.id} hover={false}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{alertIcon(alert.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">
                            {alert.machine} · {alert.location}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                            {alert.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {formatAlertDate(alert.date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={status === 'active' ? 'danger' : 'success'}>
                            {status === 'active' ? t.active : 'Resolved'}
                          </Badge>
                          {status === 'active' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              {t.resolve}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
            {filteredAlerts.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                No alerts for this filter.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── ALERT SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alert Configuration
            </CardTitle>
          </CardHeader>
          <div className="space-y-5">
            {/* Low stock threshold */}
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[var(--text-primary)]">{t.lowStockThreshold}</label>
              <input
                type="number"
                min={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-20 rounded-lg border border-[var(--border)] px-3 py-1.5 text-right text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Offline alert delay */}
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[var(--text-primary)]">{t.offlineAlertDelay}</label>
              <div className="relative">
                <select
                  value={offlineDelay}
                  onChange={(e) => setOfflineDelay(e.target.value)}
                  className="h-8 appearance-none rounded-lg border border-[var(--border)] bg-white pl-3 pr-8 text-sm text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="5">5 min</option>
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">1 hour</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </div>

            {/* Motor error toggle */}
            <Toggle checked={motorErrors} onChange={setMotorErrors} label={t.motorErrorAlerts} />

            {/* Expiry warning */}
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[var(--text-primary)]">
                {t.expiryWarning}
              </label>
              <input
                type="number"
                min={1}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-20 rounded-lg border border-[var(--border)] px-3 py-1.5 text-right text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Payment failures */}
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[var(--text-primary)]">
                {t.paymentFailureN}
              </label>
              <input
                type="number"
                min={1}
                value={paymentFailures}
                onChange={(e) => setPaymentFailures(Number(e.target.value))}
                className="w-20 rounded-lg border border-[var(--border)] px-3 py-1.5 text-right text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notification channels */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {t.notificationChannels}
              </p>
              <Toggle checked={emailNotif} onChange={setEmailNotif} label={t.email} />
              <Toggle checked={smsNotif} onChange={setSmsNotif} label={t.sms} />
              <Toggle checked={inAppNotif} onChange={setInAppNotif} label={t.inApp} />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => showToast(t.settingsSaved)}
            >
              {t.saveSettings}
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
