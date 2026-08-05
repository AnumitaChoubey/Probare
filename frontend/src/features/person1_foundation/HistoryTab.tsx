// HistoryTab.tsx — P1 owns this (implemented in TASK DETAIL-1 / ERR-6)
// Shows error_status_history in plain language, most recent first.
// Redacts internal-notes-adjacent entries for OPS roles.
import React from 'react'

interface HistoryTabProps {
  errorId: string
}

export default function HistoryTab({ errorId }: HistoryTabProps) {
  // TODO (P1 Sprint 2): fetch GET /errors/:id/history and render timeline
  return (
    <div style={{ color: '#64748b', padding: 16 }}>
      <em>HistoryTab — to be implemented in TASK ERR-6 + DETAIL-1 (Sprint 2).</em>
      <br />
      <code>errorId: {errorId}</code>
    </div>
  )
}
