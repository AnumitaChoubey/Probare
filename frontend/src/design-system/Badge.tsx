import React from 'react'
import { radius, fontSize } from './tokens'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  dot?: boolean
}

const variantMap: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: '#6366f1',  color: '#fff' },
  success: { bg: '#dcfce7',  color: '#166534' },
  warning: { bg: '#fef9c3',  color: '#854d0e' },
  danger:  { bg: '#fee2e2',  color: '#991b1b' },
  info:    { bg: '#dbeafe',  color: '#1e40af' },
  neutral: { bg: '#f1f5f9',  color: '#475569' },
}

export function Badge({ label, variant = 'default', dot = false }: BadgeProps) {
  const { bg, color } = variantMap[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: radius.full,
      fontSize: fontSize.xs, fontWeight: 600,
      background: bg, color,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
      {label}
    </span>
  )
}
