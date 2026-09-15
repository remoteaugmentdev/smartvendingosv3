'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { KeyRound, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { changePassword } from './actions'

type Lang = 'FR' | 'EN'

export default function ProfilePage() {
  const t = useTranslation()

  const [lang, setLang] = useState<Lang>('FR')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.email) setUserEmail(d.user.email)
        setDisplayName(d.user?.label || d.user?.slug || 'Account')
      })
      .catch(() => {})
  }, [])

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || '—'

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function handleSavePassword() {
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    setIsSaving(true)
    const result = await changePassword(newPassword)
    setIsSaving(false)
    if (result.error) {
      setPasswordError(result.error)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswordModal(false)
    showToast('Password updated successfully')
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 p-6">
      {/* Avatar + Info */}
      <Card hover={false}>
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-lg">
            {initials}
          </div>

          {/* Name + Role */}
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{displayName || '—'}</h2>
            <Badge variant="info" className="mt-1">
              {t.role}
            </Badge>
          </div>

          {/* Details */}
          <div className="w-full divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--text-muted)]">Email</span>
              <span className="font-medium text-[var(--text-primary)]">{userEmail || '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--text-muted)]">SIRET</span>
              <span className="font-medium text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--text-muted)]">{t.assignedMachinesCount}</span>
              <span className="font-medium text-[var(--text-primary)]">3</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Language preference */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>{t.languagePreference}</CardTitle>
        </CardHeader>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['FR', 'EN'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                lang === l
                  ? 'bg-white text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          <KeyRound className="h-4 w-4 text-[var(--text-muted)]" />
          {t.changePassword}
        </button>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => showToast('You have been logged out')}
        >
          {t.logout}
        </Button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{t.changePassword}</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">{t.newPassword}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">{t.confirmPassword}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-500">{passwordError}</p>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="primary" className="flex-1" onClick={handleSavePassword} disabled={isSaving}>
                {isSaving ? 'Saving…' : t.save}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowPasswordModal(false)}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
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
