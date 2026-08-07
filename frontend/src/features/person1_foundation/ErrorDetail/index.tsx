// ErrorDetail/index.tsx
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { fetchErrorDetail } from '../../../lib/api/errorsApi'
import { useAuth } from '../../person1_foundation/useAuth'

// P1-owned tab components (implemented in Sprint 2)
import OverviewTab from '../OverviewTab'
import HistoryTab from '../HistoryTab'

type TabId = 'overview' | 'respond' | 'evidence' | 'history'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'respond',   label: 'Respond / Decision' },   // P2's slot
  { id: 'evidence',  label: 'Evidence' },              // P3's slot
  { id: 'history',   label: 'History' },
]

export default function ErrorDetail() {
  const { id: errorId } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { token } = useAuth()
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token || !errorId) return
    setLoading(true)
    fetchErrorDetail(token, errorId)
      .then(data => {
        setError(data)
        setLoading(false)
      })
      .catch(err => {
        setErrorMsg(err.message)
        setLoading(false)
      })
  }, [token, errorId])

  if (loading) return <div style={{ padding: 24 }}>Loading error details...</div>
  if (errorMsg) return <div style={{ padding: 24, color: 'red' }}>{errorMsg}</div>
  if (!error) return null

  // SLA formatting
  const pct = error.sla_state?.elapsed_pct ?? 0
  const stateColor = error.sla_state?.state === 'red' ? '#ef4444' : error.sla_state?.state === 'amber' ? '#f59e0b' : '#22c55e'
  const isBreached = error.status === 'SLA_BREACHED_ESCALATED'
  const slaText = isBreached ? `Breached - Escalated Level ${error.current_escalation_level}` : `${pct.toFixed(1)}% SLA elapsed`

  return (
    <div>
      {/* Header band */}
      <div style={{ padding: '16px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {error.qa_error_id}
        </h1>
        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: '#e2e8f0', color: '#475569' }}>
          {error.status.replace(/_/g, ' ')}
        </span>
        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: error.severity === 'HIGH' || error.severity === 'CRITICAL' ? '#fee2e2' : '#fef3c7', color: error.severity === 'HIGH' || error.severity === 'CRITICAL' ? '#991b1b' : '#92400e' }}>
          {error.severity}
        </span>
        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: '#f8fafc', color: stateColor, border: `1px solid ${stateColor}` }}>
          {slaText}
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer',
              background: 'none', fontSize: 14, fontWeight: 500,
              color: activeTab === tab.id ? '#6366f1' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab errorData={error} />
        )}

        {activeTab === 'respond' && (
          <div style={{ padding: 24, background: '#f8fafc', borderRadius: 8, color: '#94a3b8' }}>
            <em>Respond / Decision tab - Person 2's component will render here.</em>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div style={{ padding: 24, background: '#f8fafc', borderRadius: 8, color: '#94a3b8' }}>
            <em>Evidence tab - Person 3's component will render here.</em>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab errorId={error.id} />
        )}
      </div>
    </div>
  )
}
