import React from 'react'
import { colors, radius, fontSize } from './tokens'

export interface FilterField {
  key: string
  label: string
  type: 'select' | 'text' | 'date'
  options?: { label: string; value: string }[]
}

interface FilterBarProps {
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
}

export function FilterBar({ fields, values, onChange, onReset }: FilterBarProps) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      padding: '16px', background: colors.surfaceAlt,
      border: `1px solid ${colors.border}`, borderRadius: radius.md, marginBottom: 16,
    }}>
      {fields.map((field) => (
        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: fontSize.xs, fontWeight: 600, color: colors.textSecondary }}>
            {field.label}
          </label>
          {field.type === 'select' ? (
            <select
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={{
                padding: '6px 10px', fontSize: fontSize.sm, borderRadius: radius.sm,
                border: `1px solid ${colors.border}`, background: colors.surface,
                color: colors.textPrimary, minWidth: 140,
              }}
            >
              <option value="">All</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              style={{
                padding: '6px 10px', fontSize: fontSize.sm, borderRadius: radius.sm,
                border: `1px solid ${colors.border}`, background: colors.surface,
                color: colors.textPrimary, minWidth: 140,
              }}
            />
          )}
        </div>
      ))}
      <button
        onClick={onReset}
        style={{
          padding: '6px 14px', fontSize: fontSize.sm, borderRadius: radius.sm,
          border: `1px solid ${colors.border}`, background: colors.surface,
          color: colors.textSecondary, cursor: 'pointer',
        }}
      >
        Reset
      </button>
    </div>
  )
}
