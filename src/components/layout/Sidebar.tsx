'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Building2,
  Archive,
  ShoppingCart,
  Truck,
  ShoppingBag,
  Receipt,
  Bell,
  Users,
  UsersRound,
  MapPin,
  Settings2,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/utils/cn'
import { en } from '@/locales/en'
import { can } from '@/server/policy'

const NAV_ITEMS: { href: string; navKey: keyof typeof en.nav; Icon: LucideIcon }[] = [
  { href: '/dashboard',        navKey: 'dashboard',    Icon: LayoutDashboard },
  { href: '/machines',        navKey: 'machines',     Icon: Bot },
  { href: '/locations',       navKey: 'locations',    Icon: Building2 },
  { href: '/inventory',       navKey: 'inventory',    Icon: Archive },
  { href: '/routes',          navKey: 'routes',       Icon: MapPin },
  { href: '/trips',           navKey: 'trips',        Icon: Truck },
  { href: '/purchases',       navKey: 'purchases',    Icon: ShoppingBag },
  { href: '/orders',          navKey: 'orders',       Icon: ShoppingCart },
  { href: '/expenses',        navKey: 'expenses',     Icon: Receipt },
  { href: '/alerts',          navKey: 'alerts',       Icon: Bell },
  { href: '/team',            navKey: 'team',         Icon: UsersRound },
  { href: '/users',           navKey: 'users',        Icon: Users },
  { href: '/configuration',   navKey: 'configuration', Icon: Settings2 },
  { href: '/profile',         navKey: 'profile',      Icon: UserCircle },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useApp()
  const { user } = useAuth()
  const pathname = usePathname()
  const t = en
  const prefix = user?.slug ? `/${user.slug}` : ''

  const items = NAV_ITEMS.filter(({ href }) =>
    href !== '/team' || (user ? can(user.operatorRole, 'members.admin', user.readOnly) : false)
  )

  const navItems = (
    <nav className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-y-auto py-3 px-2">
      {items.map(({ href, navKey, Icon }) => {
        const label = t.nav[navKey]
        const fullHref = `${prefix}${href}`
        const active = pathname === fullHref || pathname.startsWith(fullHref + '/')
        return (
          <Link
            key={href}
            href={fullHref}
            onClick={closeMobileSidebar}
            title={sidebarCollapsed ? label : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--bg-active)] text-[var(--accent-primary)]'
                : 'text-[var(--text-muted)] hover:bg-slate-50 hover:text-[var(--text-primary)]'
            )}
          >
            {active && (
              <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-[var(--sidebar-active-border)]" />
            )}
            <Icon size={18} className="shrink-0" />
            <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col overflow-hidden bg-[var(--bg-sidebar)] border-r border-[var(--border)] transition-[width] duration-300 ease-in-out',
          sidebarCollapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
        )}
      >
        <div className="shrink-0 flex h-[var(--topbar-height)] items-center justify-center border-b border-[var(--border)] px-3">
          <Logo />
        </div>

        <nav className="flex flex-1 min-h-0 flex-col gap-0.5 overflow-y-auto py-3 px-2">
          {items.map(({ href, navKey, Icon }) => {
            const label = t.nav[navKey]
            const fullHref = `${prefix}${href}`
            const active = pathname === fullHref || pathname.startsWith(fullHref + '/')
            return (
              <Link
                key={href}
                href={fullHref}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[var(--bg-active)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-slate-50 hover:text-[var(--text-primary)]'
                )}
              >
                {active && (
                  <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-[var(--sidebar-active-border)]" />
                )}
                <Icon size={18} className="shrink-0" />
                <span
                  className="whitespace-nowrap overflow-hidden transition-opacity duration-300"
                  style={{ opacity: sidebarCollapsed ? 0 : 1 }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-[var(--border)] p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-primary)]"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-40 transition-opacity duration-300',
          mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={closeMobileSidebar}
        />

        {/* Drawer */}
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-64 flex-col bg-[var(--bg-sidebar)] shadow-xl transition-transform duration-300 ease-in-out',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="shrink-0 flex h-[var(--topbar-height)] items-center justify-center border-b border-[var(--border)] px-3">
            <Logo />
          </div>
          {navItems}
        </aside>
      </div>
    </>
  )
}
