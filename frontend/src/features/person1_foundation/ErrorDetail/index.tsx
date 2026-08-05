// ErrorDetail/index.tsx — ⚠️ SHARED SHELL (P1 owns it)
//
// RULES for this file:
//   - P1 builds and owns OverviewTab + HistoryTab.
//   - P2 adds ONE import line for RespondTab/DecisionTab when ready.
//   - P3 adds ONE import line for EvidenceTab when ready.
//   - No other edits by P2/P3/P4 — the shell structure is frozen.
//
// ── P2 adds their import line here ───────────────────────────────────────────
// import RespondTab from '../../person2_rebuttal_decision/RespondTab'
// import DecisionTab from '../../person2_rebuttal_decision/DecisionTab'
//
// ── P3 adds their import line here ───────────────────────────────────────────
// import EvidenceTab from '../../person3_evidence_notifications/EvidenceTab'
//
import React, { useState } from 'react'

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

interface ErrorDetailProps {
  errorId: string
}

export default function ErrorDetail({ errorId }: ErrorDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div>
      {/* Header band — implemented by P1 in TASK DETAIL-1 */}
      <div style={{ padding: '16px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
          {/* TODO (P1 Sprint 2): render qa_error_id, status badge, severity chip, aging indicator */}
          Error Detail — {errorId}
        </h1>
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
          // P1-owned OverviewTab — all Section A/B/C fields read-only
          <OverviewTab errorId={errorId} />
        )}

        {activeTab === 'respond' && (
          // ── SLOT FOR P2 ── Replace this placeholder with <RespondTab errorId={errorId} />
          // when Person 2's component is ready and their import line is added above.
          <div style={{ padding: 24, background: '#f8fafc', borderRadius: 8, color: '#94a3b8' }}>
            <em>Respond / Decision tab — Person 2&apos;s component will render here.</em>
          </div>
        )}

        {activeTab === 'evidence' && (
          // ── SLOT FOR P3 ── Replace this placeholder with <EvidenceTab errorId={errorId} />
          // when Person 3's component is ready and their import line is added above.
          <div style={{ padding: 24, background: '#f8fafc', borderRadius: 8, color: '#94a3b8' }}>
            <em>Evidence tab — Person 3&apos;s component will render here.</em>
          </div>
        )}

        {activeTab === 'history' && (
          // P1-owned HistoryTab
          <HistoryTab errorId={errorId} />
        )}
      </div>
    </div>
  )
}
