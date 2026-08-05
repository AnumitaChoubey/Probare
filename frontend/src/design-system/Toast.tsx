import React, { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { colors, radius, shadow, fontSize } from './tokens'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number   // ms, default 4000
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const typeConfig: Record<ToastType, { icon: string; bg: string; color: string }> = {
  success: { icon: '✓', bg: '#f0fdf4', color: '#166534' },
  error:   { icon: '✕', bg: '#fef2f2', color: '#991b1b' },
  warning: { icon: '⚠', bg: '#fffbeb', color: '#92400e' },
  info:    { icon: 'ℹ', bg: '#eff6ff', color: '#1e40af' },
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const { icon, bg, color } = typeConfig[toast.type]

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: radius.md,
      background: bg, color, boxShadow: shadow.md,
      fontSize: fontSize.sm, fontWeight: 500, minWidth: 280,
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontSize: 16 }}
      >
        ✕
      </button>
    </div>
  )
}

function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
