import React from 'react'
import { colors, radius, fontSize } from './tokens'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary:   { background: colors.primary,   color: '#fff', border: 'none' },
  secondary: { background: '#334155',        color: '#f8fafc', border: 'none' },
  danger:    { background: colors.danger,    color: '#fff', border: 'none' },
  ghost:     { background: 'transparent',    color: colors.textSecondary, border: `1px solid ${colors.border}` },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '4px 12px',  fontSize: fontSize.sm },
  md: { padding: '8px 20px',  fontSize: fontSize.md },
  lg: { padding: '12px 28px', fontSize: fontSize.lg },
}

export function Button({
  variant = 'primary', size = 'md', loading = false, fullWidth = false,
  disabled, children, style, ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: radius.md, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontWeight: 500, transition: 'opacity 0.15s',
        opacity: disabled || loading ? 0.55 : 1,
        width: fullWidth ? '100%' : undefined,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {loading ? '⏳' : children}
    </button>
  )
}
