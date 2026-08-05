// tokens.ts — design-system single source of truth
// FROZEN after Sprint 0. New values require a team PR, not silent edits.

export const colors = {
  // Brand
  primary:     '#6366f1',   // indigo-500
  primaryHover:'#4f46e5',   // indigo-600
  success:     '#22c55e',
  warning:     '#f59e0b',
  danger:      '#ef4444',
  info:        '#3b82f6',

  // Grays (slate scale)
  bg:          '#f1f5f9',   // page background
  surface:     '#ffffff',
  surfaceAlt:  '#f8fafc',
  border:      '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary:'#64748b',
  textMuted:   '#94a3b8',

  // Nav / shell
  shellBg:     '#1e293b',
  navBg:       '#0f172a',
  navActive:   '#1e293b',
} as const

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const

export const radius = {
  sm: 4, md: 8, lg: 12, full: 9999,
} as const

export const fontSize = {
  xs: 11, sm: 13, md: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const

export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.10)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
} as const

// SLA state colors
export const slaColor = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
} as const

// Severity colors
export const severityColor = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#22c55e',
} as const

// Status label → badge color map
export const statusColor: Record<string, string> = {
  DRAFT:                              '#94a3b8',
  OPEN_PENDING_ACK:                   '#3b82f6',
  OPEN_PENDING_RESPONSE:              '#6366f1',
  SLA_BREACHED_ESCALATED:             '#ef4444',
  ACCEPTED_PENDING_CLOSURE:           '#f59e0b',
  REBUTTAL_SUBMITTED_PENDING_QA_REVIEW: '#8b5cf6',
  CLOSED_UPHELD:                      '#64748b',
  CLOSED_OVERTURNED:                  '#22c55e',
  CLOSED_PARTIAL:                     '#0ea5e9',
  REOPENED:                           '#f97316',
}
