'use client'

import { useEffect, useState } from 'react'
import { Compass, Sparkles, ChevronRight, Map, RotateCcw, Loader2 } from 'lucide-react'
import { useTour } from '@/context/TourContext'
import { Button } from '@/components/ui/Button'

// Machine stops sitting exactly on the route path below (segment junctions).
const ROUTE_PATH = 'M -20 132 Q 60 48 140 96 Q 220 146 300 76 Q 350 32 420 84 Q 450 106 480 96'
const PINS = [
  { x: 140, y: 96, d: 0 },
  { x: 300, y: 76, d: 0.7 },
  { x: 420, y: 84, d: 1.4 },
]

export function TourWelcome() {
  const { welcomeOpen, stepCount, beginTour, dismissWelcome, companyName } = useTour()

  const GUIDELINES = [
    {
      Icon: Sparkles,
      text: 'A soft ring points to what matters on each screen.',
    },
    {
      Icon: ChevronRight,
      text: 'Move with Next and Back. We open each page for you.',
    },
    {
      Icon: Map,
      text: `${stepCount} short stops, covering everything the platform does.`,
    },
    {
      Icon: RotateCcw,
      text: 'Leave anytime with Esc, and restart from the corner button.',
    },
  ]
  const [reducedMotion, setReducedMotion] = useState(false)
  const [ready, setReady] = useState(false)

  // The traveling dot uses SVG SMIL, which CSS media queries can't pause, so we
  // detect prefers-reduced-motion here and simply not render it.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Brief loader before the card itself, so the card's entrance reads as a
  // deliberate reveal instead of popping in the instant the shell mounts.
  useEffect(() => {
    if (!welcomeOpen) {
      setReady(false)
      return
    }
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [welcomeOpen])

  // Move focus to the primary action once the card itself is showing; Esc
  // dismisses at any point, including during the loader.
  useEffect(() => {
    if (!ready) return
    ;(document.querySelector('[data-tour-start]') as HTMLElement | null)?.focus()
  }, [ready])

  useEffect(() => {
    if (!welcomeOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissWelcome()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [welcomeOpen, dismissWelcome])

  if (!welcomeOpen) return null

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="tour-animated absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        style={{ animation: 'tour-fade 0.3s ease-out both' }}
        onClick={dismissWelcome}
      />

      {!ready ? (
        <div
          aria-hidden
          className="tour-animated relative"
          style={{ animation: 'tour-fade 0.2s ease-out both' }}
        >
          <Loader2 size={32} className="animate-spin text-white" />
        </div>
      ) : (
      /* Card */
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-welcome-title"
        className="tour-animated relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-hover)]"
        style={{ animation: 'tour-pop 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Hero: a live delivery route traveling across a map grid, with the
            tour compass floating above it. This is the signature moment. */}
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-[var(--bg-active)]">
          {/* Map dot-grid */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(37,99,235,0.18) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          {/* Soft radial glow */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 55%, rgba(37,99,235,0.18), transparent 70%)',
            }}
          />

          {/* Route scene: dashed path marching forward, pins pulsing at stops,
              and a glowing dot driving the route end to end. */}
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 440 176"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              id="tour-route"
              d={ROUTE_PATH}
              stroke="var(--accent-primary)"
              strokeOpacity="0.4"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6 10"
              className="tour-animated"
              style={{ animation: 'tour-dash 1.1s linear infinite' }}
            />

            {PINS.map((p) => (
              <g key={`${p.x}-${p.y}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9"
                  stroke="var(--accent-primary)"
                  strokeWidth="2"
                  className="tour-animated"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animation: 'tour-halo 2.2s ease-out infinite',
                    animationDelay: `${p.d}s`,
                  }}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="var(--accent-primary)"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            ))}

            {!reducedMotion && (
              <circle
                r="5"
                fill="var(--accent-primary)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.9))' }}
              >
                <animateMotion dur="6s" repeatCount="indefinite">
                  <mpath href="#tour-route" />
                </animateMotion>
              </circle>
            )}
          </svg>

          {/* Floating compass with pulse rings */}
          {[0, 1.2].map((delay) => (
            <span
              key={delay}
              aria-hidden
              className="tour-animated absolute h-20 w-20 rounded-full"
              style={{
                border: '2px solid var(--accent-primary)',
                animation: 'tour-radar 2.4s ease-out infinite',
                animationDelay: `${delay}s`,
              }}
            />
          ))}
          <span
            className="tour-animated relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white"
            style={{
              animation: 'tour-float 3s ease-in-out infinite',
              boxShadow: '0 10px 28px rgba(37,99,235,0.45)',
            }}
          >
            <Compass size={28} />
          </span>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
            Guided tour
          </p>
          <h2
            id="tour-welcome-title"
            className="mt-1 text-xl font-bold text-[var(--text-primary)]"
          >
            Take the tour of {companyName ?? 'SmartVendingOS'}
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
            A quick, guided walk through everything the platform does, about two minutes
            end to end. Here is how it works:
          </p>

          <ul className="mt-4 space-y-2.5">
            {GUIDELINES.map(({ Icon, text }, i) => (
              <li
                key={text}
                className="tour-animated flex items-center gap-3"
                style={{
                  animation: 'tour-fade-up 0.5s ease-out both',
                  animationDelay: `${0.2 + i * 0.08}s`,
                }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-active)] text-[var(--accent-primary)]">
                  <Icon size={18} />
                </span>
                <span className="text-sm text-[var(--text-primary)]">{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" size="md" onClick={dismissWelcome}>
              Maybe later
            </Button>
            <Button data-tour-start variant="primary" size="md" onClick={beginTour}>
              Start the tour
              <ChevronRight size={16} />
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
            {stepCount} stops · you can leave anytime
          </p>
        </div>
      </div>
      )}
    </div>
  )
}
