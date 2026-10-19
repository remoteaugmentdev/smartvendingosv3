'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Map, Wallet, RotateCcw, ChevronRight } from 'lucide-react'
import { useTour } from '@/context/TourContext'
import { Button } from '@/components/ui/Button'
import { parseCompanyRoute } from '@/utils/companyLink'

const HIGHLIGHTS = [
  { Icon: Map, text: 'Full control of every machine, route and trip' },
  { Icon: Wallet, text: 'Real profit visibility, per machine and per route' },
]

// A short celebratory melody (about five seconds), synthesized with the Web
// Audio API so no audio file or dependency is needed: a rising arpeggio, an
// answering phrase, and a soft resolving chord over a low pad. Volume stays
// low: a finishing touch, not a fanfare.
function playMelody() {
  try {
    const ctx = new AudioContext()
    const t0 = ctx.currentTime + 0.05

    const note = (
      freq: number,
      at: number,
      dur: number,
      peak: number,
      type: OscillatorType = 'sine'
    ) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0 + at)
      gain.gain.exponentialRampToValueAtTime(peak, t0 + at + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0 + at)
      osc.stop(t0 + at + dur + 0.1)
    }

    // Soft pad underneath (C3 + G3), holding through the whole piece.
    note(130.81, 0, 5.2, 0.022, 'triangle')
    note(196.0, 0, 5.2, 0.018, 'triangle')

    // Rising arpeggio: C5 E5 G5 C6.
    note(523.25, 0.0, 1.4, 0.055)
    note(659.25, 0.22, 1.4, 0.055)
    note(783.99, 0.44, 1.4, 0.055)
    note(1046.5, 0.66, 1.8, 0.06)

    // Answering phrase: A5 G5 E5 G5.
    note(880.0, 1.5, 1.2, 0.05)
    note(783.99, 1.85, 1.2, 0.05)
    note(659.25, 2.2, 1.2, 0.05)
    note(783.99, 2.55, 1.4, 0.05)

    // Resolving chord: C5 + E5 + G5 + C6, long tail.
    note(523.25, 3.3, 2.2, 0.045)
    note(659.25, 3.3, 2.2, 0.045)
    note(783.99, 3.3, 2.2, 0.045)
    note(1046.5, 3.3, 2.4, 0.05)

    setTimeout(() => void ctx.close(), 6500)
  } catch {
    // Audio is a nicety; never let it break the card.
  }
}

export function TourComplete() {
  const { completeOpen, stepCount, closeComplete, beginTour } = useTour()
  const router = useRouter()
  const pathname = usePathname()

  // End on the dashboard (home), not wherever the final navigation happened to
  // land, so finishing is deterministic. Personalized demo links keep a slug
  // prefix on every route (see TourOverlay), so preserve it here too instead
  // of dropping the visitor back onto the flat, unbranded URL.
  const resolvedPathname = parseCompanyRoute(pathname) ?? pathname
  const slugPrefix = resolvedPathname === pathname ? null : pathname.split('/')[1]
  const goHome = () => {
    router.push(slugPrefix ? `/${slugPrefix}/dashboard` : '/dashboard')
    closeComplete()
  }

  // Chime once when the card opens (the Finish click provides the user
  // gesture browsers require), and let Esc dismiss it.
  useEffect(() => {
    if (!completeOpen) return
    playMelody()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeComplete()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [completeOpen, closeComplete])

  if (!completeOpen) return null

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="tour-animated absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        style={{ animation: 'tour-fade 0.3s ease-out both' }}
        onClick={closeComplete}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-complete-title"
        className="tour-animated relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-hover)]"
        style={{ animation: 'tour-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Hero: the checkmark draws itself inside pulse rings */}
        <div className="relative flex h-36 items-center justify-center overflow-hidden bg-[var(--bg-active)]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(37,99,235,0.18) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          {[0, 0.8, 1.6].map((delay) => (
            <span
              key={delay}
              aria-hidden
              className="tour-animated absolute h-20 w-20 rounded-full"
              style={{
                border: '2px solid var(--accent-success)',
                animation: 'tour-radar 2.4s ease-out infinite',
                animationDelay: `${delay}s`,
              }}
            />
          ))}
          <span
            className="tour-animated relative flex h-16 w-16 items-center justify-center rounded-full text-white"
            style={{
              background: 'var(--accent-success)',
              boxShadow: '0 10px 28px rgba(16,185,129,0.45)',
              animation: 'tour-float 3s ease-in-out infinite',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
              <path
                d="M7 15.5 L12.5 21 L23 10"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="tour-animated"
                style={{
                  strokeDasharray: 24,
                  animation: 'tour-check-draw 0.5s ease-out 0.35s both',
                }}
              />
            </svg>
          </span>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-success)]">
            Tour complete
          </p>
          <h2
            id="tour-complete-title"
            className="mt-1 text-xl font-bold text-[var(--text-primary)]"
          >
            You have seen the whole platform
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
            All {stepCount} stops, one connected system. Here is what you are walking away
            with:
          </p>

          <ul className="mt-4 space-y-2.5">
            {HIGHLIGHTS.map(({ Icon, text }, i) => (
              <li
                key={text}
                className="tour-animated flex items-center gap-3"
                style={{
                  animation: 'tour-fade-up 0.5s ease-out both',
                  animationDelay: `${0.25 + i * 0.1}s`,
                }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[var(--accent-success)]">
                  <Icon size={18} />
                </span>
                <span className="text-sm text-[var(--text-primary)]">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" size="md" onClick={beginTour}>
              <RotateCcw size={15} />
              Replay tour
            </Button>
            <Button variant="primary" size="md" onClick={goHome} className="whitespace-nowrap">
              Get started
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
