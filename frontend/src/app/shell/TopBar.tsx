// TopBar.tsx — P1 owns this file. One additive change allowed by P3: import NotificationBell.
import React from 'react'
import { useNavigate } from 'react-router-dom'

// ── P3 adds ONE import line here when NotificationBell is ready ───────────────
import NotificationBell from '../../features/person3_evidence_notifications/NotificationBell'

interface TopBarProps {
  userFullName?: string
  onLogout?: () => void
}

export default function TopBar({ userFullName = '', onLogout }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 56, background: '#1e293b', color: '#f8fafc',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Left — logo */}
      <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>QEMS</span>

      {/* Right — bell + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* ── P3 replaces this slot with <NotificationBell /> ────────────── */}
        <NotificationBell />

        <span style={{ fontSize: 14 }}>{userFullName}</span>

        <button
          onClick={onLogout ?? (() => navigate('/login'))}
          style={{
            fontSize: 13, padding: '4px 12px', borderRadius: 6,
            background: '#334155', color: '#f8fafc', border: 'none', cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </header>
  )
}
