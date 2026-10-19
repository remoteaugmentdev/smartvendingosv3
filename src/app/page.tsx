import { CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { DemoRequestForm } from './DemoRequestForm'
import { ResumeDashboardLink } from './ResumeDashboardLink'
import { getSession } from '@/utils/session'

export const metadata = {
  title: 'SmartVendingOS: Run Your Vending Fleet From One Command Center',
}

const FEATURE_GROUPS = [
  {
    label: 'Operate',
    items: [
      { title: 'Executive dashboard', desc: 'revenue and top products at a glance' },
      { title: 'Machines & planogram', desc: 'slot-level stock and expiry' },
      { title: 'Routes & trips', desc: 'optimized restock trips' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { title: 'Financials & reporting', desc: 'P&L and multi-currency reports' },
      { title: 'Team & roles', desc: 'delegate with the right access' },
    ],
  },
]

/* Custom vending machine mark, requested by the brand owner; drawn in the page palette */
function VendingMachineArt() {
  const shelves = [56, 104, 152, 200]
  return (
    <svg viewBox="0 0 200 400" className="h-[320px] w-auto" aria-hidden>
      <rect x="10" y="8" width="180" height="356" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(147,197,253,0.55)" strokeWidth="2" />
      <rect x="26" y="26" width="112" height="228" rx="8" fill="#0a1128" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" />
      {shelves.map((y, row) => (
        <g key={y}>
          <line x1="30" y1={y + 26} x2="134" y2={y + 26} stroke="rgba(147,197,253,0.35)" strokeWidth="1.5" />
          {[38, 62, 86, 110].map((x, col) => (
            <rect
              key={x}
              x={x}
              y={y}
              width="16"
              height="24"
              rx="3"
              fill={(row + col) % 3 === 0 ? 'rgba(96,165,250,0.85)' : 'rgba(147,197,253,0.28)'}
            />
          ))}
        </g>
      ))}
      <circle cx="166" cy="24" r="3.5" fill="#34d399" />
      <rect x="148" y="40" width="30" height="22" rx="4" fill="rgba(59,130,246,0.7)" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5" />
      {[74, 90, 106, 122].map((y) =>
        [150, 161, 172].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5" fill="rgba(147,197,253,0.45)" />
        ))
      )}
      <rect x="148" y="144" width="30" height="10" rx="3" fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1.5" />
      <line x1="156" y1="170" x2="170" y2="170" stroke="rgba(147,197,253,0.55)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="26" y="276" width="112" height="40" rx="6" fill="#0a1128" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" />
      <line x1="40" y1="296" x2="124" y2="296" stroke="rgba(147,197,253,0.3)" strokeWidth="1.5" />
      <rect x="26" y="364" width="16" height="10" rx="2" fill="rgba(147,197,253,0.45)" />
      <rect x="158" y="364" width="16" height="10" rx="2" fill="rgba(147,197,253,0.45)" />
      <ellipse cx="100" cy="386" rx="84" ry="6" fill="rgba(2,6,23,0.4)" />
    </svg>
  )
}

export default async function HomePage({
  companyName,
  customText,
  slug,
  alreadyFilled,
}: { companyName?: string; customText?: string; slug?: string; alreadyFilled?: boolean } = {}) {
  // Only trust the session for "already filled" when it matches THIS slug
  // (e.g. a master admin browsing the link, or a demo session from a
  // different company's link shouldn't trigger it). Falls back to the DB
  // record so a signed-out returning visitor still skips the form.
  const session = slug ? await getSession() : null
  const filledThisSlug =
    Boolean(slug) && ((session?.kind === 'prospect' && session.slug === slug) || alreadyFilled)

  return (
    <div
      className="flex min-h-[100dvh] flex-col text-white"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)' }}
    >
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center bg-white px-6">
        <div className="mx-auto flex w-full max-w-[88rem] items-center gap-2.5">
          <Logo size={48} />
          <span className="bg-gradient-to-r from-blue-600 to-blue-950 bg-clip-text text-2xl font-bold tracking-tight text-transparent">SmartVendingOS</span>
        </div>
      </header>

      {/* Hero band */}
      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-[88rem] items-center gap-12 px-6 py-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-[2.75rem] lg:text-5xl">
              Your entire vending fleet. One command center.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-200 lg:text-lg">
              Track inventory, plan routes and see the revenue of every machine.
              Explore the full product in the interactive demo.
            </p>

            {/* Machine + capabilities band */}
            <div className="mt-10 flex items-center gap-10">
              <div className="hidden shrink-0 lg:block">
                <VendingMachineArt />
              </div>
              <div className="grid flex-1 gap-x-10 gap-y-6 sm:grid-cols-2">
                {FEATURE_GROUPS.map(({ label, items }) => (
                  <div key={label}>
                    <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-blue-300">
                      {label}
                    </p>
                    <ul className="mt-3 space-y-3">
                      {items.map(({ title, desc }) => (
                        <li key={title} className="flex items-start gap-2.5">
                          <CheckCircle2 size={15} strokeWidth={2.5} className="mt-0.5 shrink-0 text-blue-400" />
                          <p className="text-sm leading-snug text-blue-200">
                            <span className="font-semibold text-white">{title}.</span> {desc}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Demo form card */}
          <div id="demo" className="rounded-2xl bg-white p-6 text-slate-900 shadow-2xl shadow-blue-950/50 sm:p-8 lg:ml-auto lg:w-full lg:max-w-lg">
            {filledThisSlug ? (
              <>
                <h2 className="text-lg font-bold text-slate-900">
                  Welcome back{companyName ? `, ${companyName}` : ''}
                </h2>
                <p className="mb-6 mt-1 text-sm text-slate-500">
                  You already requested a demo. Jump back into the dashboard.
                </p>
                <ResumeDashboardLink slug={slug!} />
              </>
            ) : (
              <>
                <h2 className="flex flex-wrap items-baseline gap-x-1 text-lg font-bold text-slate-900">
                  <span>See it live in two minutes{companyName ? ',' : ''}</span>
                  {companyName && (
                    <span className="max-w-[16ch] truncate" title={companyName}>
                      {companyName}
                    </span>
                  )}
                </h2>
                <p
                  className="mb-6 mt-1 line-clamp-2 text-sm text-slate-500"
                  title={customText}
                >
                  {customText || 'Tell us about your operation and jump straight into the demo dashboard.'}
                </p>
                <DemoRequestForm companyName={companyName} slug={slug} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Bottom strip */}
      <footer className="shrink-0 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-1.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Trusted by operators managing 500+ machines globally</p>
          <p>
            A product of{' '}
            <a
              href="https://remoteaugment.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Remote Augment Labs
            </a>{' '}
            · © {new Date().getFullYear()} SmartVendingOS
          </p>
        </div>
      </footer>
    </div>
  )
}
