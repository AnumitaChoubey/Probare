import React from 'react'

interface OverviewTabProps {
  errorData: any
}

export default function OverviewTab({ errorData }: OverviewTabProps) {
  if (!errorData) return null

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 12 }}>Section A - Classification</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>LOB ID</div>
            <div style={{ fontSize: 14, color: '#0f172a' }}>{errorData.lob_id}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Category ID</div>
            <div style={{ fontSize: 14, color: '#0f172a' }}>{errorData.category_id}</div>
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 12 }}>Section B - Findings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Transaction Reference</div>
            <div style={{ fontSize: 14, color: '#0f172a' }}>{errorData.transaction_reference}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Severity</div>
            <div style={{ fontSize: 14, color: '#0f172a' }}>{errorData.severity}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Date of Occurrence</div>
            <div style={{ fontSize: 14, color: '#0f172a' }}>{errorData.date_of_occurrence}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Date of Detection</div>
            <div style={{ fontSize: 14, color: '#0f172a' }}>{errorData.date_of_detection}</div>
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 12 }}>Section C - Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{errorData.description}</div>
          </div>
          {errorData.initial_root_cause && (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Initial Root Cause</div>
              <div style={{ fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{errorData.initial_root_cause}</div>
            </div>
          )}
          {errorData.internal_notes && (
            <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4, fontWeight: 600 }}>Internal QA Notes</div>
              <div style={{ fontSize: 14, color: '#92400e', whiteSpace: 'pre-wrap' }}>{errorData.internal_notes}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
