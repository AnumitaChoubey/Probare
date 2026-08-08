import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchErrors } from '../../lib/api/errorsApi'
import { fetchCategories } from '../../lib/api/adminApi'
import { useAuth } from './useAuth'
import { DataTable, Column } from '../../design-system/DataTable'
import { FilterBar, FilterField } from '../../design-system/FilterBar'
import { Button } from '../../design-system/Button'
import { Badge } from '../../design-system/Badge'
import { colors } from '../../design-system/tokens'

export default function AuditorDashboard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  
  const [errors, setErrors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!token) return
    fetchCategories(token).then(setCategories).catch(console.error)
  }, [token])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchErrors(token, filters)
      .then(data => {
        setErrors(data.items || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [token, filters])

  const openCount = errors.filter(e => e.status === 'DRAFT' || e.status === 'SUBMITTED' || e.status.includes('QA')).length
  const pendingRebCount = errors.filter(e => e.status === 'PENDING_REBUTTAL').length
  const pendingDecCount = errors.filter(e => e.status === 'PENDING_DECISION').length
  const closedCount = errors.filter(e => e.status === 'CLOSED_ACCEPTED' || e.status === 'CLOSED_REJECTED').length

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters({})
  }

  const filterFields: FilterField[] = [
    { key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Submitted', value: 'SUBMITTED' },
      { label: 'Pending Rebuttal', value: 'PENDING_REBUTTAL' },
      { label: 'Pending Decision', value: 'PENDING_DECISION' },
      { label: 'Closed', value: 'CLOSED_ACCEPTED' },
    ]},
    { key: 'severity', label: 'Severity', type: 'select', options: [
      { label: 'Critical', value: 'CRITICAL' },
      { label: 'High', value: 'HIGH' },
      { label: 'Medium', value: 'MEDIUM' },
      { label: 'Low', value: 'LOW' },
    ]},
    { key: 'category_id', label: 'Category', type: 'select', options: categories.map(c => ({ label: c.name, value: c.id })) }
  ]

  const columns: Column<any>[] = [
    { key: 'qa_error_id', header: 'ID', render: (val) => <span style={{ color: colors.primary, fontWeight: 600 }}>{val as string}</span> },
    { key: 'category_id', header: 'Category', render: (val) => categories.find(c => c.id === val)?.name || val },
    { key: 'severity', header: 'Severity', render: (val) => (
      <Badge variant={val === 'CRITICAL' || val === 'HIGH' ? 'danger' : 'warning'} label={val as string} />
    )},
    { key: 'status', header: 'Status', render: (val) => <Badge label={(val as string).replace(/_/g, ' ')} /> },
    { key: 'sla_state', header: 'SLA Aging', render: (_, row) => {
      const pct = row.sla_state?.elapsed_pct ?? 0
      const color = row.sla_state?.state === 'red' ? 'danger' : row.sla_state?.state === 'amber' ? 'warning' : 'success'
      const text = row.status === 'SLA_BREACHED_ESCALATED' ? `Breached` : `${pct.toFixed(1)}%`
      return <Badge variant={color} label={text} />
    }},
    { key: 'created_at', header: 'Date', render: (val) => new Date(val as string).toLocaleDateString() }
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: colors.textPrimary }}>Auditor Dashboard</h1>
        <Button onClick={() => navigate('/errors/new')}>+ Log New Error</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Open', value: openCount },
          { label: 'Pending Rebuttal', value: pendingRebCount },
          { label: 'Pending Decision', value: pendingDecCount },
          { label: 'Closed', value: closedCount }
        ].map(stat => (
          <div key={stat.label} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 28, color: colors.textPrimary, fontWeight: 700 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <FilterBar fields={filterFields} values={filters} onChange={handleFilterChange} onReset={handleResetFilters} />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: colors.textSecondary }}>Loading errors...</div>
      ) : (
        <DataTable
          data={errors}
          columns={columns}
          onRowClick={(row) => navigate(`/errors/${row.id}`)}
          emptyMessage="No errors logged yet — click '+ Log New Error' to get started."
        />
      )}
    </div>
  )
}
