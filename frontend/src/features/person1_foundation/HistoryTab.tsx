import React, { useEffect, useState } from 'react'
import { fetchErrorHistory } from '../../lib/api/errorsApi'
import { useAuth } from './useAuth'
import { colors } from '../../design-system/tokens'

interface HistoryTabProps {
  errorId: string
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function HistoryTab({ errorId }: HistoryTabProps) {
  const { token } = useAuth()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchErrorHistory(token, errorId)
      .then(data => {
        setHistory(data)
        setLoading(false)
      })
      .catch(err => {
        setErrorMsg(err.message)
        setLoading(false)
      })
  }, [token, errorId])

  if (loading) return <div style={{ padding: 16, color: colors.textSecondary }}>Loading history...</div>
  if (errorMsg) return <div style={{ padding: 16, color: colors.danger }}>{errorMsg}</div>
  if (history.length === 0) return <div style={{ padding: 16, color: colors.textSecondary }}>No history available.</div>

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {history.map((entry, index) => (
        <div key={entry.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
          {index !== history.length - 1 && (
            <div style={{ position: 'absolute', left: 7, top: 24, bottom: -16, width: 2, background: colors.border }} />
          )}
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: colors.primary, marginTop: 4, flexShrink: 0, zIndex: 1 }} />
          <div>
            <div style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600 }}>
              {entry.performed_by_system ? 'System' : 'User'} changed status to {formatStatus(entry.to_status)}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              {new Date(entry.occurred_at).toLocaleString()}
            </div>
            {entry.reason && (
              <div style={{ fontSize: 14, color: colors.textPrimary, marginTop: 8, background: colors.bg, padding: '8px 12px', borderRadius: 8 }}>
                {entry.reason}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
