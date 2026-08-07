import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLobs, fetchCategories } from '../../../lib/api/adminApi'
import { createError } from '../../../lib/api/errorsApi'
import { useAuth } from '../useAuth'
import { Button } from '../../../design-system/Button'
import { useToast } from '../../../design-system/Toast'
import { colors, radius } from '../../../design-system/tokens'

export default function LogNewErrorForm() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [lobs, setLobs] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  const [lobId, setLobId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [severity, setSeverity] = useState('MEDIUM')
  const [transactionRef, setTransactionRef] = useState('')
  const [dateOfOccurrence, setDateOfOccurrence] = useState('')
  const [dateOfDetection, setDateOfDetection] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [clientImpact, setClientImpact] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  
  const [idempotencyKey] = useState(crypto.randomUUID())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (token) fetchLobs(token).then(setLobs)
  }, [token])

  useEffect(() => {
    if (token && lobId) fetchCategories(token, lobId).then(setCategories)
    else setCategories([])
  }, [token, lobId])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const evidenceRequired = selectedCategory?.requires_evidence_at_severity?.includes(severity)

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault()
    if (!token) return

    if (!isDraft && description.length < 20) {
      addToast('error', 'Description must be at least 20 characters.')
      return
    }
    if (!isDraft && evidenceRequired && files.length === 0) {
      addToast('error', 'Evidence is required for this severity/category.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        lob_id: lobId,
        category_id: categoryId,
        severity,
        transaction_reference: transactionRef,
        date_of_occurrence: dateOfOccurrence,
        date_of_detection: dateOfDetection,
        description,
        initial_root_cause: rootCause || null,
        internal_notes: internalNotes || null,
        client_impact_flag: clientImpact,
        is_draft: isDraft,
        // idempotency_key: idempotencyKey
      }
      const res = await createError(token, payload)
      
      // TODO (Person 3): Implement evidence upload API using `files` array and `res.id` (error ID)
      
      addToast('success', `Error ${res.qa_error_id} logged successfully!`)
      navigate(`/errors/${res.id}`)
    } catch (err: any) {
      addToast('error', err.message || 'Failed to log error')
    } finally {
      setSubmitting(false)
    }
  }

  const sectionStyle = {
    background: colors.surface,
    padding: 24,
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`
  }

  const inputStyle = {
    padding: 8,
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.textPrimary
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: colors.textPrimary }}>Log New Error</h1>
      
      <form style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        
        {/* Section A */}
        <section style={sectionStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: colors.textPrimary }}>Section A - Classification</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>LOB *</span>
              <select required value={lobId} onChange={e => setLobId(e.target.value)} style={inputStyle}>
                <option value="">Select LOB...</option>
                {lobs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>Category *</span>
              <select required disabled={!lobId} value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle}>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>Severity *</span>
              <select value={severity} onChange={e => setSeverity(e.target.value)} style={inputStyle}>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
          </div>
        </section>

        {/* Section B */}
        <section style={sectionStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: colors.textPrimary }}>Section B - Transaction</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>Transaction Ref *</span>
              <input required type="text" value={transactionRef} onChange={e => setTransactionRef(e.target.value)} style={inputStyle} />
            </label>
            <div />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>Date of Occurrence *</span>
              <input required type="date" max={new Date().toISOString().split('T')[0]} value={dateOfOccurrence} onChange={e => setDateOfOccurrence(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>Date of Detection *</span>
              <input required type="date" min={dateOfOccurrence} max={new Date().toISOString().split('T')[0]} value={dateOfDetection} onChange={e => setDateOfDetection(e.target.value)} style={inputStyle} />
            </label>
          </div>
        </section>

        {/* Section C */}
        <section style={sectionStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: colors.textPrimary }}>Section C - Findings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>
                Description * <span style={{ color: description.length < 20 ? colors.danger : colors.success, fontSize: 12 }}>({description.length}/20 min)</span>
              </span>
              <textarea required minLength={20} value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>Initial Root Cause</span>
              <input type="text" value={rootCause} onChange={e => setRootCause(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>
                Internal Notes <em style={{ color: colors.textMuted, fontSize: 12 }}>(Not visible to Operations)</em>
              </span>
              <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>
              <input type="checkbox" checked={clientImpact} onChange={e => setClientImpact(e.target.checked)} />
              Client Impact
            </label>
          </div>
        </section>

        {/* Section D */}
        <section style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: colors.textPrimary }}>Section D - Evidence</h3>
            {evidenceRequired && (
              <span style={{ background: '#fee2e2', color: colors.danger, fontSize: 12, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Required for {severity}</span>
            )}
          </div>
          <div style={{ border: `2px dashed ${colors.border}`, borderRadius: 8, padding: 32, textAlign: 'center', cursor: 'pointer', background: colors.surfaceAlt }} onClick={() => document.getElementById('evidence-upload')?.click()}>
            <p style={{ color: colors.textSecondary, margin: 0 }}>Click to browse or drag and drop files here</p>
            <input id="evidence-upload" type="file" multiple hidden onChange={e => {
              if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
            }} />
          </div>
          {files.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {files.map((f, i) => (
                <div key={i} style={{ background: colors.bg, padding: '4px 12px', borderRadius: 16, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: colors.textPrimary }}>
                  {f.name}
                  <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.danger }}>&times;</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <Button variant="secondary" onClick={(e) => handleSubmit(e, true)} loading={submitting}>Save as Draft</Button>
          <Button onClick={(e) => handleSubmit(e, false)} loading={submitting}>Submit Error</Button>
        </div>

      </form>
    </div>
  )
}
