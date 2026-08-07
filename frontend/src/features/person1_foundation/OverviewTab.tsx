import React from 'react'
import { colors } from '../../design-system/tokens'

export default function OverviewTab({ errorData }: { errorData: any }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 }}>Section A - Classification</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>LOB ID</div>
              <div style={{ fontSize: 14, color: colors.textPrimary }}>{errorData.lob_id}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Category ID</div>
              <div style={{ fontSize: 14, color: colors.textPrimary }}>{errorData.category_id}</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 }}>Section B - Findings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Transaction Reference</div>
              <div style={{ fontSize: 14, color: colors.textPrimary }}>{errorData.transaction_reference}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Severity</div>
              <div style={{ fontSize: 14, color: colors.textPrimary }}>{errorData.severity}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Date of Occurrence</div>
              <div style={{ fontSize: 14, color: colors.textPrimary }}>{errorData.date_of_occurrence}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Date of Detection</div>
              <div style={{ fontSize: 14, color: colors.textPrimary }}>{errorData.date_of_detection}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary, marginBottom: 12 }}>Section C - Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 14, color: colors.textPrimary, whiteSpace: 'pre-wrap' }}>{errorData.description}</div>
          </div>
          
          {errorData.initial_root_cause && (
            <div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Initial Root Cause</div>
              <div style={{ fontSize: 14, color: colors.textPrimary, whiteSpace: 'pre-wrap' }}>{errorData.initial_root_cause}</div>
            </div>
          )}

          {errorData.internal_notes && (
            <div style={{ padding: 12, background: colors.warning + '11', borderRadius: 8, border: `1px solid ${colors.warning}44` }}>
              <div style={{ fontSize: 12, color: colors.warning, marginBottom: 4, fontWeight: 600 }}>Internal QA Notes</div>
              <div style={{ fontSize: 14, color: colors.warning, whiteSpace: 'pre-wrap' }}>{errorData.internal_notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
