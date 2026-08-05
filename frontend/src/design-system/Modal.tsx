import React, { useEffect, useRef } from 'react'
import { colors, radius, shadow } from './tokens'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width, maxHeight: '85vh', overflowY: 'auto',
          background: colors.surface, borderRadius: radius.lg,
          boxShadow: shadow.lg, display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${colors.border}`,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: colors.textMuted,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px', borderTop: `1px solid ${colors.border}`,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
