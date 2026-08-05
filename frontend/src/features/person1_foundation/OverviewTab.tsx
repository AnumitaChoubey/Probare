// OverviewTab.tsx — P1 owns this (implemented in TASK DETAIL-1)
// Shows all Section A/B/C fields read-only.
// internal_notes rendered only if the key exists in the API response.
import React from 'react'

interface OverviewTabProps {
  errorId: string
}

export default function OverviewTab({ errorId }: OverviewTabProps) {
  // TODO (P1 Sprint 2): fetch error detail via GET /errors/:id and render fields
  return (
    <div style={{ color: '#64748b', padding: 16 }}>
      <em>OverviewTab — to be implemented in TASK DETAIL-1 (Sprint 2).</em>
      <br />
      <code>errorId: {errorId}</code>
    </div>
  )
}
