'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface Profile {
  id: string
  email: string
  role: 'master' | 'demo' | null
  expires_at: string | null
  label: string | null
  slug: string | null
  kind: 'user' | 'prospect'
  operatorId: string
  operatorSlug: string
  operatorName: string
  operatorRole: string
  plan: string | null
  readOnly: boolean
  firstName: string | null
  lastName: string | null
}

interface AuthContextValue {
  user: Profile | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        // A user signed in with no operator selected yet: send them to pick one.
        // UNAUTHENTICATED (and any other denial) just leaves user null, same as before.
        if (data.denied === 'SELECT_OPERATOR') {
          window.location.href = '/select-operator'
          return
        }
        setUser(data.user ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function signOut() {
    const destination = user?.slug ? `/${user.slug}` : '/'
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = destination
  }

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
