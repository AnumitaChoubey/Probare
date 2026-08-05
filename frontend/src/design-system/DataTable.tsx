import React from 'react'
import { colors, fontSize, radius } from './tokens'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T extends Record<string, unknown>>({
  columns, data, emptyMessage = 'No records found.', onRowClick,
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: colors.surface }}>
        <thead>
          <tr style={{ background: colors.surfaceAlt }}>
            {columns.map((col) => (
              <th key={String(col.key)} style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: fontSize.xs, fontWeight: 700, color: colors.textSecondary,
                textTransform: 'uppercase', letterSpacing: 0.5,
                borderBottom: `1px solid ${colors.border}`,
                width: col.width,
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '32px 16px', textAlign: 'center',
                color: colors.textMuted, fontSize: fontSize.sm,
              }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLElement).style.background = colors.surfaceAlt }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} style={{ padding: '12px 16px', fontSize: fontSize.sm, color: colors.textPrimary }}>
                    {col.render
                      ? col.render(row[col.key as keyof T], row)
                      : String(row[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
