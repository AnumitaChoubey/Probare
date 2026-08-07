import React, { useEffect, useState } from 'react'
import { fetchErrorHistory } from '../../../lib/api/errorsApi'
import { useAuth } from '../../person1_foundation/useAuth'

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

  if (loading) return <div style={{ padding: 16 }}>Loading history...</div>
  if (errorMsg) return <div style={{ padding: 16, color: 'red' }}>{errorMsg}</div>
  if (history.length === 0) return <div style={{ padding: 16 }}>No history available.</div>

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {history.map((entry, index) => (
        <div key={entry.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
          {index !== history.length - 1 && (
            <div style={{ position: 'absolute', left: 7, top: 24, bottom: -16, width: 2, background: '#e2e8f0' }} />
          )}
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#6366f1', marginTop: 4, flexShrink: 0, zIndex: 1 }} />
          <div>
            <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
              {entry.performed_by_system ? 'System' : 'User'} changed status to {formatStatus(entry.to_status)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {new Date(entry.occurred_at).toLocaleString()}
            </div>
            {entry.reason && (
              <div style={{ fontSize: 14, color: '#334155', marginTop: 8, background: '#f1f5f9', padding: '8px 12px', borderRadius: 8 }}>
                {entry.reason}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
