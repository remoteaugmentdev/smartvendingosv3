'use client'

import { cn } from '@/utils/cn'
import { useEffect, useId, useRef, type DialogHTMLAttributes, type ReactNode } from 'react'

interface DialogProps extends DialogHTMLAttributes<HTMLDialogElement> {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Native <dialog> modal. Escape and the backdrop close it; focus returns to
 * whatever was focused before it opened (native dialog behavior, kept explicit
 * here since we also drive open/close from React state, not the `open` attr). */
export function Dialog({ open, onClose, title, children, className, ...props }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const restoreFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (open && !el.open) {
      restoreFocus.current = document.activeElement as HTMLElement | null
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleClose = () => {
      restoreFocus.current?.focus()
      onClose()
    }
    // cancel fires on Escape before close; close covers backdrop/Escape/programmatic close
    el.addEventListener('close', handleClose)
    return () => el.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        'w-full max-w-md rounded-xl bg-[var(--bg-card)] p-0 shadow-xl backdrop:bg-black/40',
        className
      )}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      {...props}
    >
      <div className="p-5">
        <h2 id={titleId} className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
